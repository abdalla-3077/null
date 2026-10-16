import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getAllSettings } from './settings-store';
import { classifySensitiveUrl } from '../shared/sensitive-sites';
import type { AppSettings, TabInfo } from '../shared/types';

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
// const OP_CLOSE = 2;

/** Built-in Null Discord application. Users never enter this. */
export const DISCORD_CLIENT_ID = '1559719778510311434';
/** Uploaded Rich Presence art asset for the Null browser mark (small badge). */
const DISCORD_BROWSER_ASSET = 'icon';

const RECONNECT_MS = 15_000;
const MAX_TITLE = 128;
const MAX_STATE = 128;

let socket: net.Socket | null = null;
let connecting = false;
let ready = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let activeClientId = '';
let lastPayloadJson = '';
let sessionStart = 0;
let recvBuffer = Buffer.alloc(0);
// Throttle state: tab switches send fast, same-tab churn (title/favicon
// updates during load) is debounced so Discord never gets spammed.
let lastSendAt = 0;
let lastPushedActiveId: string | null = null;
let pushTimer: NodeJS.Timeout | null = null;
const SWITCH_MIN_GAP_MS = 800;
const CHURN_MIN_GAP_MS = 2500;
const CHURN_DEBOUNCE_MS = 1200;

function getIpcPaths(): string[] {
  const paths: string[] = [];
  if (process.platform === 'win32') {
    for (let i = 0; i < 10; i++) paths.push(`\\\\?\\pipe\\discord-ipc-${i}`);
    return paths;
  }
  const candidates = [
    process.env.XDG_RUNTIME_DIR,
    process.env.TMPDIR,
    process.env.TMP,
    process.env.TEMP,
    os.tmpdir(),
    '/tmp',
  ].filter((p): p is string => !!p);
  const seen = new Set<string>();
  for (const base of candidates) {
    const dir = base.replace(/\/$/, '');
    if (seen.has(dir)) continue;
    seen.add(dir);
    for (let i = 0; i < 10; i++) paths.push(path.join(dir, `discord-ipc-${i}`));
  }
  return paths;
}

function encode(op: number, payload: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const buf = Buffer.alloc(8 + json.length);
  buf.writeInt32LE(op, 0);
  buf.writeInt32LE(json.length, 4);
  json.copy(buf, 8);
  return buf;
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const s = safeSettings();
    if (s && s.discordRpcEnabled) {
      void connect(DISCORD_CLIENT_ID);
    }
  }, RECONNECT_MS);
  reconnectTimer.unref?.();
}

function clearReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function safeSettings(): AppSettings | null {
  try {
    return getAllSettings();
  } catch {
    return null;
  }
}

function attachSocketHandlers(sock: net.Socket): void {
  recvBuffer = Buffer.alloc(0);
  sock.on('data', (chunk: Buffer) => {
    recvBuffer = Buffer.concat([recvBuffer, chunk]);
    while (recvBuffer.length >= 8) {
      const op = recvBuffer.readInt32LE(0);
      const len = recvBuffer.readInt32LE(4);
      if (len < 0 || len > 10 * 1024 * 1024) {
        recvBuffer = Buffer.alloc(0);
        return;
      }
      if (recvBuffer.length < 8 + len) return;
      const body = recvBuffer.subarray(8, 8 + len).toString('utf8');
      recvBuffer = recvBuffer.subarray(8 + len);
      handleFrame(op, body);
    }
  });
  sock.on('error', () => {
    // Connection refused = Discord not running. Retry later.
  });
  sock.on('close', () => {
    if (socket === sock) {
      socket = null;
      ready = false;
      connecting = false;
    }
    // Only auto-reconnect while the feature is still enabled.
    const s = safeSettings();
    if (s?.discordRpcEnabled) scheduleReconnect();
  });
}

function handleFrame(op: number, body: string): void {
  void op;
  try {
    const msg = JSON.parse(body) as { evt?: string; cmd?: string; data?: { code?: number } };
    if (msg.evt === 'READY') ready = true;
    // 4006 = not authenticated. SET_ACTIVITY without OAuth should not hit this
    // for Rich Presence apps, but if it does we stay connected and stop spamming.
    if (msg.evt === 'ERROR' && msg.data?.code === 4006) ready = false;
  } catch {
    /* ignore malformed frames */
  }
}

function tryPath(paths: string[], idx: number, clientId: string): void {
  if (idx >= paths.length) {
    connecting = false;
    scheduleReconnect();
    return;
  }
  const sock = net.createConnection(paths[idx]);
  const onError = (): void => {
    sock.destroy();
    tryPath(paths, idx + 1, clientId);
  };
  sock.once('error', onError);
  sock.once('connect', () => {
    sock.removeListener('error', onError);
    socket = sock;
    connecting = false;
    activeClientId = clientId;
    attachSocketHandlers(sock);
    try {
      sock.write(encode(OP_HANDSHAKE, { v: 1, client_id: clientId }));
    } catch {
      sock.destroy();
      return;
    }
    // Push current presence right after handshake; Discord answers READY async.
    const s = safeSettings();
    if (s) pushCachedPresence(s);
  });
}

export function connect(clientId: string): Promise<void> {
  const id = clientId.trim();
  if (!id) return Promise.resolve();
  if (socket && activeClientId === id) return Promise.resolve();
  if (connecting) return Promise.resolve();
  disconnectSocket();
  connecting = true;
  ready = false;
  tryPath(getIpcPaths(), 0, id);
  return Promise.resolve();
}

function disconnectSocket(): void {
  clearReconnect();
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  connecting = false;
  ready = false;
  lastPayloadJson = '';
  const sock = socket;
  socket = null;
  activeClientId = '';
  if (sock) {
    try {
      sock.destroy();
    } catch {
      /* ignore */
    }
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function cleanHost(host: string): string {
  const h = host.toLowerCase();
  return h.startsWith('www.') ? h.slice(4) : h;
}

/** Approximate registrable domain so mail.google.com -> google.com. */
function registrableDomain(host: string): string {
  const parts = cleanHost(host).split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const sld = parts[parts.length - 2] ?? '';
  const tld = parts[parts.length - 1] ?? '';
  // Country-code second levels like co.uk / com.au keep one extra label.
  if (tld.length === 2 && sld.length <= 3) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

const SITE_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  youtu: 'YouTube',
  github: 'GitHub',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitch: 'Twitch',
  netflix: 'Netflix',
  spotify: 'Spotify',
  reddit: 'Reddit',
  x: 'X',
  twitter: 'X (Twitter)',
  wikipedia: 'Wikipedia',
  amazon: 'Amazon',
  linkedin: 'LinkedIn',
  discord: 'Discord',
  stackoverflow: 'Stack Overflow',
  chatgpt: 'ChatGPT',
  openai: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  qwen: 'Qwen',
  brave: 'Brave Search',
  duckduckgo: 'DuckDuckGo',
};

/** Pretty site name for tooltips, e.g. www.youtube.com -> YouTube. */
function siteNameForHost(host: string): string {
  const domain = registrableDomain(host);
  const base = domain.split('.')[0] ?? domain;
  const known = SITE_NAMES[base];
  if (known) return known;
  if (!base) return cleanHost(host);
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Crisp HD site icon for the big slot. Tab favicons are usually 16px .ico
 * (blurry upscaled) or SVG (rejected by Discord's proxy), so we use a
 * 128px PNG for every host instead.
 */
function siteIconUrl(displayHost: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(displayHost)}&sz=128`;
}

export interface PresenceInput {
  url: string;
  title: string;
}

export function buildActivity(
  input: PresenceInput | null,
  settings: AppSettings,
  nowSec: number,
): Record<string, unknown> | null {
  if (!settings.discordRpcEnabled) return null;
  const mode = settings.discordPresenceMode;
  const base: Record<string, unknown> = {
    type: 3, // Watching
    name: 'Null Browser',
  };
  if (settings.discordShowTimestamp) {
    if (!sessionStart) sessionStart = nowSec;
    base.timestamps = { start: sessionStart };
  }
  const browserOnlyAssets = {
    large_image: DISCORD_BROWSER_ASSET,
    large_text: 'Null Browser',
  };

  const fallback = (): Record<string, unknown> => ({
    ...base,
    assets: browserOnlyAssets,
    details: 'Browsing the web',
    state: 'Null Browser',
  });

  if (!input || !input.url) return fallback();
  const url = input.url;
  // Internal pages never leak anything.
  if (/^(null|about|file|data|chrome):/i.test(url)) {
    if (/newtab/i.test(url)) return { ...base, assets: browserOnlyAssets, details: 'New Tab', state: 'Null Browser' };
    return fallback();
  }
  if (!/^https?:\/\//i.test(url)) return fallback();
  if (settings.discordHideSensitive && classifySensitiveUrl(url)) return fallback();

  const host = hostOf(url);
  if (!host) return fallback();
  const displayHost = cleanHost(host);
  const siteName = siteNameForHost(host);
  // Large = HD site icon + site name. Small = Null browser badge.
  const siteAssets = {
    large_image: siteIconUrl(displayHost),
    large_text: truncate(siteName, MAX_STATE),
    small_image: DISCORD_BROWSER_ASSET,
    small_text: 'Null Browser',
  };

  if (mode === 'generic') return fallback();
  if (mode === 'host') {
    return { ...base, assets: siteAssets, details: truncate(`Visiting ${displayHost}`, MAX_TITLE), state: truncate(siteName, MAX_STATE) };
  }
  // title mode: professional layout — page title on top, site below.
  const rawTitle = input.title && input.title !== url ? input.title : siteName;
  return {
    ...base,
    assets: siteAssets,
    details: truncate(rawTitle, MAX_TITLE) || siteName,
    state: truncate(displayHost, MAX_STATE),
  };
}

let cachedTabs: TabInfo[] = [];
let cachedActiveId: string | null = null;

function requestPush(settings: AppSettings): void {
  const active = cachedTabs.find((t) => t.id === cachedActiveId) ?? null;
  const activity = buildActivity(
    active ? { url: active.url, title: active.title } : null,
    settings,
    Math.floor(Date.now() / 1000),
  );
  const json = JSON.stringify(activity);
  if (activity !== null && json === lastPayloadJson) {
    // Nothing visible changed — drop any queued push.
    lastPushedActiveId = cachedActiveId;
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    return;
  }
  const sock = socket;
  if (!sock || sock.destroyed) return; // connection flow pushes on connect
  const now = Date.now();
  const switched = cachedActiveId !== lastPushedActiveId;
  const needGap = switched ? SWITCH_MIN_GAP_MS : CHURN_MIN_GAP_MS;
  if (now - lastSendAt >= needGap) {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    lastPushedActiveId = cachedActiveId;
    lastSendAt = now;
    void sendActivity(activity);
    return;
  }
  // Same-tab churn (page loading fires title/favicon events rapidly):
  // wait for it to settle, then send the latest state once.
  if (pushTimer) clearTimeout(pushTimer);
  const wait = switched ? needGap - (now - lastSendAt) : CHURN_DEBOUNCE_MS;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const cur = safeSettings();
    if (!cur || !cur.discordRpcEnabled) return;
    // Rebuild from the latest cache so rapid switches land on the final tab.
    lastSendAt = 0;
    requestPush(cur);
  }, Math.max(250, Math.min(wait, 5000)));
  pushTimer.unref?.();
}

function pushCachedPresence(settings: AppSettings): void {
  requestPush(settings);
}

function sendActivity(activity: Record<string, unknown> | null): Promise<void> {
  const sock = socket;
  if (!sock || sock.destroyed) return Promise.resolve();
  // Frames sent before READY are still queued on the socket; Discord
  // processes them once the handshake completes, so don't gate on `ready`.
  const payload = {
    cmd: 'SET_ACTIVITY',
    args: { pid: process.pid, activity },
    nonce: randomUUID(),
  };
  const json = JSON.stringify(payload.args.activity);
  // Avoid spamming Discord with identical frames on every tab event.
  if (json === lastPayloadJson && activity !== null) return Promise.resolve();
  lastPayloadJson = json;
  try {
    sock.write(encode(OP_FRAME, payload));
  } catch {
    /* socket dead; reconnect loop will handle it */
  }
  return Promise.resolve();
}

/** Called by the IPC layer whenever tabs or settings change. Never throws. */
export function syncDiscordPresence(tabs: TabInfo[], activeId: string | null): void {
  try {
    cachedTabs = tabs;
    cachedActiveId = activeId;
    const s = safeSettings();
    if (!s) return;
    if (!s.discordRpcEnabled) {
      if (socket || connecting) {
        // Clear presence before disconnecting so the status doesn't linger.
        if (socket) void sendActivity(null).finally(() => disconnectSocket());
        else disconnectSocket();
      }
      sessionStart = 0;
      return;
    }
    const clientId = DISCORD_CLIENT_ID;
    if (!socket && !connecting) {
      clearReconnect();
      void connect(clientId);
      return;
    }
    if (socket && activeClientId !== clientId) {
      disconnectSocket();
      void connect(clientId);
      return;
    }
    pushCachedPresence(s);
  } catch {
    /* presence must never break browsing */
  }
}

/** Called when only settings changed (tabs cache reused). */
export function syncDiscordSettings(): void {
  syncDiscordPresence(cachedTabs, cachedActiveId);
}

export function isDiscordReady(): boolean {
  return ready;
}

export function shutdownDiscordRpc(): void {
  try {
    if (socket) {
      try {
        socket.write(
          encode(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: randomUUID() }),
        );
      } catch {
        /* ignore */
      }
    }
  } finally {
    disconnectSocket();
    sessionStart = 0;
  }
}
