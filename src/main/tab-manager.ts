import { WebContentsView, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { getMainWindow, getContentBounds, isModalOpen } from './window-manager';
import { getSetting } from './settings-store';
import { DEVICE_PROFILES, NULL_NEWTAB, resolveInputToUrl } from '../shared/config';
import { getNewtabUrl, writeInternalPages } from './null-protocol';
import type { TabInfo } from '../shared/types';

interface TabRecord {
  id: string;
  view: WebContentsView;
  url: string;
  title: string;
  favicon: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  audible: boolean;
  muted: boolean;
  pinned: boolean;
  order: number;
}

const tabs = new Map<string, TabRecord>();
let activeTabId: string | null = null;
let closedStack: { url: string; title: string }[] = [];
let emit: (channel: string, ...args: unknown[]) => void = () => undefined;
let downloadAttacher: ((ses: Electron.Session) => void) | null = null;

export function setDownloadAttacher(fn: (ses: Electron.Session) => void): void {
  downloadAttacher = fn;
}

function lazyAttachDownload(ses: Electron.Session): void {
  try {
    downloadAttacher?.(ses);
  } catch {
    /* ignore */
  }
}
let orderCounter = 0;

export function setTabEventEmitter(fn: (channel: string, ...args: unknown[]) => void): void {
  emit = fn;
}

function applyUserAgentToView(view: WebContentsView): void {
  const profile = DEVICE_PROFILES[getSetting('deviceProfile')] ?? DEVICE_PROFILES.linux;
  view.webContents.setUserAgent(profile.userAgent);
}

function snapshot(r: TabRecord): TabInfo {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    favicon: r.favicon,
    loading: r.loading,
    canGoBack: r.canGoBack,
    canGoForward: r.canGoForward,
    audible: r.audible,
    muted: r.muted,
    pinned: r.pinned,
    active: r.id === activeTabId,
  };
}

export function broadcastTabs(): void {
  const list = [...tabs.values()].sort((a, b) => a.order - b.order).map(snapshot);
  emit('tabs:changed', list, activeTabId);
}

function trackPartionOf(view: WebContentsView): string {
  return view.webContents.session.storagePath ?? view.webContents.id.toString();
}
void trackPartionOf;

function attachViewEvents(record: TabRecord): void {
  const wc = record.view.webContents;
  wc.on('did-start-loading', () => {
    record.loading = true;
    broadcastTabs();
  });
  wc.on('did-stop-loading', () => {
    record.loading = false;
    record.canGoBack = wc.navigationHistory.canGoBack();
    record.canGoForward = wc.navigationHistory.canGoForward();
    broadcastTabs();
  });
  wc.on('did-navigate', (_e, url) => {
    record.url = url.startsWith('file://') && url.includes('null-pages') ? NULL_NEWTAB : url;
    record.canGoBack = wc.navigationHistory.canGoBack();
    record.canGoForward = wc.navigationHistory.canGoForward();
    broadcastTabs();
  });
  wc.on('did-navigate-in-page', (_e, url) => {
    record.url = url.startsWith('file://') && url.includes('null-pages') ? NULL_NEWTAB : url;
    broadcastTabs();
  });
  wc.on('page-title-updated', (_e, title) => {
    record.title = title || record.url;
    broadcastTabs();
  });
  wc.on('page-favicon-updated', (_e, favicons) => {
    if (favicons.length > 0) {
      record.favicon = favicons[0];
      broadcastTabs();
    }
  });
  wc.on('did-fail-load', (_e, code, desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (validatedURL.startsWith('null://') || validatedURL.startsWith('file://')) return;
    record.loading = false;
    record.title = 'Failed to load';
    broadcastTabs();
    try {
      const pages = writeInternalPages();
      const errUrl = pages.errorFor(String(code), desc, validatedURL);
      record.url = errUrl;
      void record.view.webContents.loadURL(errUrl).catch(() => undefined);
    } catch {
      /* ignore */
    }
  });
  wc.on('media-started-playing', () => {
    record.audible = true;
    broadcastTabs();
  });
  wc.on('media-paused-playing' as never, () => {
    record.audible = false;
    broadcastTabs();
  });
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('null://go')) {
      e.preventDefault();
      const u = new URL(url);
      const to = u.searchParams.get('to') ?? '';
      if (to) navigateTab(record.id, to);
    }
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('null://go')) {
      const u = new URL(url);
      const to = u.searchParams.get('to') ?? '';
      if (to) navigateTab(record.id, to);
      return { action: 'deny' };
    }
    if (url.startsWith('null://')) {
      void record.view.webContents.loadURL(url).catch(() => undefined);
      return { action: 'deny' };
    }
    void createTab(url, true);
    return { action: 'deny' };
  });
  wc.on('context-menu', (_e, params) => {
    emit('browser:context-menu', {
      tabId: record.id,
      x: params.x,
      y: params.y,
      linkURL: params.linkURL,
      srcURL: params.srcURL,
      selectionText: params.selectionText,
      isEditable: params.isEditable,
      mediaType: params.mediaType,
    });
  });
}

export function createTab(rawUrl?: string, activate = true): string {
  const win = getMainWindow();
  if (!win) throw new Error('No main window');
  const id = randomUUID();
  const needsResolve = rawUrl && rawUrl.length > 0 && !/^(https?|null|about|data|file):/i.test(rawUrl);
  let initialUrl =
    rawUrl && rawUrl.length > 0
      ? needsResolve
        ? resolveInputToUrl(rawUrl, getSetting('searchEngine'))
        : rawUrl
      : NULL_NEWTAB;
  const logicalUrl = initialUrl;
  if (initialUrl === NULL_NEWTAB || initialUrl === 'null://newtab/') {
    try {
      initialUrl = getNewtabUrl();
    } catch {
      /* fall back to logical */
    }
  }
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      partition: `null-tab-${id}`,
      backgroundThrottling: false,
    },
  });
  view.webContents.setBackgroundThrottling(false);
  applyUserAgentToView(view);
  lazyAttachDownload(view.webContents.session);
  const record: TabRecord = {
    id,
    view,
    url: logicalUrl,
    title: 'New Tab',
    favicon: '',
    loading: true,
    canGoBack: false,
    canGoForward: false,
    audible: false,
    muted: false,
    pinned: false,
    order: orderCounter++,
  };
  tabs.set(id, record);
  attachViewEvents(record);
  win.contentView.addChildView(view);
  void view.webContents.loadURL(initialUrl).catch(() => undefined);
  if (activate) {
    setActiveTab(id);
  } else {
    updateViewVisibility();
  }
  broadcastTabs();
  return id;
}

function updateViewVisibility(): void {
  const win = getMainWindow();
  if (!win) return;
  const bounds = getContentBounds();
  const hidden = isModalOpen();
  for (const record of tabs.values()) {
    if (record.id === activeTabId && !hidden) {
      record.view.setBounds(bounds);
      record.view.setVisible(true);
    } else {
      record.view.setVisible(false);
    }
  }
}

export function layoutTabViews(): void {
  updateViewVisibility();
}

export function setActiveTab(id: string): void {
  if (!tabs.has(id)) return;
  activeTabId = id;
  updateViewVisibility();
  broadcastTabs();
}

export function getActiveTabId(): string | null {
  return activeTabId;
}

export function getTabs(): TabInfo[] {
  return [...tabs.values()].sort((a, b) => a.order - b.order).map(snapshot);
}

export function closeTab(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  const win = getMainWindow();
  if (getSetting('restoreClosedTabs') && record.url && !record.url.startsWith('null://error')) {
    closedStack.push({ url: record.url, title: record.title });
    if (closedStack.length > 25) closedStack.shift();
  }
  try {
    (record.view.webContents as unknown as { destroy?: () => void }).destroy?.();
  } catch {
    /* ignore */
  }
  if (win) {
    try {
      win.contentView.removeChildView(record.view);
    } catch {
      /* ignore */
    }
  }
  tabs.delete(id);
  if (activeTabId === id) {
    const remaining = [...tabs.values()].sort((a, b) => a.order - b.order);
    activeTabId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
  }
  if (tabs.size === 0) {
    createTab(NULL_NEWTAB, true);
    return;
  }
  updateViewVisibility();
  broadcastTabs();
}

export function reopenClosedTab(): string | null {
  const last = closedStack.pop();
  if (!last) return null;
  return createTab(last.url, true);
}

export function navigateTab(id: string, input: string): void {
  const record = tabs.get(id);
  if (!record) return;
  const url = resolveInputToUrl(input, getSetting('searchEngine'));
  void record.view.webContents.loadURL(url).catch(() => undefined);
}

export function goBack(id: string): void {
  const wc = tabs.get(id)?.view.webContents;
  if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
}

export function goForward(id: string): void {
  const wc = tabs.get(id)?.view.webContents;
  if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
}

export function reloadTab(id: string, hard = false): void {
  const wc = tabs.get(id)?.view.webContents;
  if (!wc) return;
  if (hard) wc.reloadIgnoringCache();
  else wc.reload();
}

export function stopTab(id: string): void {
  tabs.get(id)?.view.webContents.stop();
}

export function goHome(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  void record.view.webContents.loadURL(getSetting('homepage')).catch(() => undefined);
}

export function duplicateTab(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  createTab(record.url, true);
}

export function setMuted(id: string, muted: boolean): void {
  const record = tabs.get(id);
  if (!record) return;
  record.muted = muted;
  record.view.webContents.setAudioMuted(muted);
  broadcastTabs();
}

export function togglePin(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  record.pinned = !record.pinned;
  broadcastTabs();
}

export function reorderTabs(orderedIds: string[]): void {
  orderedIds.forEach((id, idx) => {
    const r = tabs.get(id);
    if (r) r.order = idx;
  });
  orderCounter = orderedIds.length;
  broadcastTabs();
}

export function findInPage(id: string, query: string, forward = true, matchCase = false): void {
  const wc = tabs.get(id)?.view.webContents;
  if (!wc) return;
  if (!query) {
    wc.stopFindInPage('clearSelection');
    return;
  }
  wc.findInPage(query, { forward, matchCase });
  wc.once('found-in-page', (_e, result) => {
    emit('browser:find-result', {
      tabId: id,
      activeMatchOrdinal: result.activeMatchOrdinal,
      matches: result.matches,
    });
  });
}

export function stopFind(id: string): void {
  tabs.get(id)?.view.webContents.stopFindInPage('clearSelection');
}

export function getViewByContentsId(contentsId: number): TabRecord | undefined {
  for (const r of tabs.values()) {
    if (r.view.webContents.id === contentsId) return r;
  }
  return undefined;
}

export function getTabRecord(id: string): TabRecord | undefined {
  return tabs.get(id);
}

export function openExternal(url: string): void {
  void shell.openExternal(url);
}

export function applyDeviceProfileToAllTabs(): void {
  for (const r of tabs.values()) applyUserAgentToView(r.view);
}

export function clearAllTabs(): void {
  const win = getMainWindow();
  for (const record of tabs.values()) {
    try {
      (record.view.webContents as unknown as { destroy?: () => void }).destroy?.();
    } catch {
      /* ignore */
    }
    if (win) {
      try {
        win.contentView.removeChildView(record.view);
      } catch {
        /* ignore */
      }
    }
  }
  tabs.clear();
  closedStack = [];
  activeTabId = null;
}

export async function clearTabsSessionData(): Promise<void> {
  const partitions = new Set<string>();
  for (const r of tabs.values()) {
    partitions.add(`null-tab-${r.id}`);
  }
  for (const p of partitions) {
    try {
      const ses = session.fromPartition(p);
      await ses.clearStorageData({
        storages: [
          'cookies',
          'localstorage',
          'indexdb',
                    'cachestorage',
          'serviceworkers',
        ],
      });
      await ses.clearCache();
      await ses.clearHostResolverCache();
    } catch {
      /* ignore */
    }
  }
}
