import { WebContentsView, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import {
  getMainWindow,
  getContentBounds,
  isModalOpen,
  setPageFullscreen,
} from './window-manager';
import { getAllSettings, getSetting, setSetting } from './settings-store';
import { DEVICE_PROFILES, NULL_NEWTAB, SEARCH_ENGINES, isInsecureHttpUrl, isLocalNetworkInput, resolveInputToUrl, translateUrl, isTranslatedUrl } from '../shared/config';
import {
  classifySensitiveUrl,
  isHostTrusted,
  trustHostForUrl,
  type SensitiveCategory,
} from '../shared/sensitive-sites';
import { getNewtabUrl, writeInternalPages } from './null-protocol';
import { recordVisit, updateVisitMeta, updateBookmarkMeta } from './session-store';
import { attachPermissionHandlers } from './permissions';
import type { SearchEngineId, TabInfo } from '../shared/types';

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
  certError: boolean;
  zoom: number;
  translated: boolean;
  originalUrl: string;
  darkKey: string | null;
  siteKey: string | null;
  siteKind: 'youtube' | 'google' | null;
  /** Plain-HTTP URL we upgraded from, retried if the HTTPS attempt fails. */
  upgradeFallback: string | null;
  /** HTTP URLs whose HTTPS attempt already failed, so we stop retrying them. */
  failedUpgrades: Set<string>;
  order: number;
}

const tabs = new Map<string, TabRecord>();
const approvedCertHosts = new Set<string>();
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

function shouldWarnInsecure(url: string, currentUrl: string, always = false): boolean {
  if (!getSetting('warnOnInsecureHttp') || !isInsecureHttpUrl(url)) return false;
  return always || !isInsecureHttpUrl(currentUrl);
}

function requestInsecureWarning(tabId: string, url: string): void {
  emit('browser:insecure-warning', { tabId, url });
}

function shouldWarnSensitive(url: string): SensitiveCategory | null {
  if (!getSetting('warnSensitiveSites')) return null;
  const category = classifySensitiveUrl(url);
  if (!category) return null;
  if (category === 'porn' && !getSetting('warnPorn')) return null;
  if (category === 'gambling' && !getSetting('warnGambling')) return null;
  if (category === 'alcohol' && !getSetting('warnAlcohol')) return null;
  const host = trustHostForUrl(url);
  if (host && isHostTrusted(host, getSetting('trustedSensitiveHosts'))) return null;
  return category;
}

function requestSensitiveWarning(tabId: string, url: string, category: SensitiveCategory): void {
  emit('browser:sensitive-warning', { tabId, url, host: trustHostForUrl(url), category });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function targetUrlOf(record: TabRecord): string {
  try {
    return record.view.webContents.getURL() || record.url;
  } catch {
    return record.url;
  }
}

function siteKindForUrl(url: string): 'youtube' | 'google' | null {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
    return 'youtube';
  }
  if (host === 'google.com' || host.endsWith('.google.com') || host.startsWith('google.') || host.endsWith('.google.co') || host.endsWith('.google.co.uk') || host.endsWith('.google.de') || host.endsWith('.google.fr')) {
    return 'google';
  }
  return null;
}

const YOUTUBE_THEME_CSS = `:root{--null-yt-accent:#8b5cf6;--null-yt-accent-soft:rgba(139,92,246,.16)}
html:not([dark]){--yt-spec-base-background:#0e0e16!important;--yt-spec-raised-background:#16161f!important;--yt-spec-menu-background:#16161f!important;--yt-spec-text-primary:#ededf5!important;--yt-spec-text-secondary:#a7a7b8!important;--yt-spec-icon-inactive:#a7a7b8!important;--yt-spec-brand-background-solid:#0e0e16!important;--yt-spec-brand-background-primary:rgba(14,14,22,.9)!important}
ytd-app{background:#0e0e16!important;color:#ededf5!important}
#masthead,ytd-masthead{background:#101018!important;border-bottom:1px solid rgba(139,92,246,.22)!important}
ytd-masthead #search-input,ytd-searchbox{--ytd-searchbox-background:#16161f!important;--ytd-searchbox-text-color:#ededf5!important}
ytd-searchbox input{background:#16161f!important;color:#ededf5!important;border-color:rgba(139,92,246,.28)!important}
#chips-wrapper,ytd-feed-filter-chip-bar-renderer{background:#101018!important;border-bottom:1px solid rgba(139,92,246,.14)!important}
yt-chip-cloud-chip-renderer yt-formatted-string,.ytChipShapeButtonReset{background:#1a1a26!important;color:#cfcfe0!important}
yt-chip-cloud-chip-renderer[chip-style][selected] yt-formatted-string,.ytChipShapeButtonReset[aria-pressed="true"]{background:#8b5cf6!important;color:#fff!important}
ytd-rich-item-renderer #dismissible{background:#16161f!important;border:1px solid rgba(139,92,246,.14)!important;border-radius:14px!important;overflow:hidden!important}
ytd-rich-item-renderer #video-title{color:#f2f1fa!important}
ytd-video-meta-block #metadata-line,ytd-video-meta-block #byline-container{color:#a7a7b8!important}
ytd-guide-renderer,ytd-mini-guide-renderer{background:#101018!important}
ytd-guide-entry-renderer[active] .title{color:#c4b5fd!important}
ytd-guide-entry-renderer:hover{background:rgba(139,92,246,.12)!important}
ytd-comment-thread-renderer,ytd-comment-renderer #content-text{color:#ededf5!important}
ytd-button-renderer.style-primary yt-button-shape button,.ytd-subscribe-button-renderer button{background:#8b5cf6!important;color:#fff!important;border-radius:999px!important}
ytd-toggle-button-renderer yt-button-shape button[aria-pressed="true"]{background:rgba(139,92,246,.2)!important;color:#d8ccff!important}
#progress.ytd-progress-bar{color:#8b5cf6!important;background:rgba(139,92,246,.22)!important}
.ytp-progress-list{background:rgba(139,92,246,.28)!important}
.ytp-play-progress{background:#8b5cf6!important}
.ytp-scrubber-button{background:#c4b5fd!important}
::-webkit-scrollbar{background:#101018!important}
::-webkit-scrollbar-thumb{background:rgba(139,92,246,.42)!important;border-radius:8px!important}`;

const GOOGLE_THEME_CSS = `:root{--null-g-accent:#8b5cf6;--null-g-accent-soft:rgba(139,92,246,.14);color-scheme:dark!important}
html,body{background:#0e0e16!important;color:#ededf5!important}
#viewport,.main,.L3eUgb,.o3j99{background:#0e0e16!important}
.gb_B,.gb_E,.gb_F,.gb_g{background:transparent!important}
.gb_A,.gb_B,.gb_E{color:#cfcfe0!important}
.RNNXgb,.SDkEP,.a4bIc,.emca,.YacQv,.sbfc{background:#16161f!important;border:1px solid rgba(139,92,246,.28)!important;box-shadow:none!important}
.RNNXgb:hover,.SDkEP:hover{border-color:#8b5cf6!important;box-shadow:0 0 0 3px rgba(139,92,246,.14)!important}
.gLFyf,.gsfi,.gLFyfgsfi,.Pbiozm{color:#ededf5!important;background:transparent!important}
.XN9DLe,.AITR5c,.PbadQb,.Umvnrc{background:#1a1a26!important;color:#cfcfe0!important;border-color:rgba(139,92,246,.2)!important}
.gNO89b,.RNmpXc,.Tg7LZd,.CCg58b,.iblpc,.jhp input,.FPdoLc input,.lJ9FBc input,.uU7dJb input,input[value="Google Search"],input[value="بحث Google"]{background:#1a1a26!important;color:#ededf5!important;border:1px solid rgba(139,92,246,.28)!important;border-radius:8px!important}
.gNO89b:hover,.RNmpXc:hover,.Tg7LZd:hover,.iblpc:hover,.jhp input:hover,.FPdoLc input:hover,.lJ9FBc input:hover{background:#23232f!important;border-color:#8b5cf6!important;box-shadow:none!important}
#fbar,.f6F9Be,footer,.Fx4vi,.Q8LRLc,#fsl,.EeV5n,.c93Gbe,.fbar,.IDVnvc{background:#101018!important;border-color:rgba(139,92,246,.16)!important;color:#a7a7b8!important}
#fbar a,.Fx4vi a,.Q8LRLc a,#fsl a,.pHiOh,.S3BnEe,.uU7dJb{color:#a7a7b8!important}
#fbar a:hover,.Fx4vi a:hover,.Q8LRLc a:hover{color:#d8ccff!important}
#hdtb,#top_nav,.sfbg,.appbar,.LHJvCe{background:#101018!important;border-color:rgba(139,92,246,.2)!important}
.g,.MjjYud,.N54PNb,.hlcw0c,.VwiC3b,.st{color:#cfcfe0!important}
.LC20lb,.DKV0Md,.l,.yuRUbf a h3{color:#c4b5fd!important}
cite,.iUh30,.qLRx3b{color:#7dd3a8!important}
.fP1Qef{background:#16161f!important;border-color:rgba(139,92,246,.18)!important}
.hb2Smf,.ab_button,a.fl,.KxwPGc a{color:#a7a7b8!important}
.mn-dwn-arw{border-color:#a7a7b8 transparent!important}
::-webkit-scrollbar{background:#101018!important}
::-webkit-scrollbar-thumb{background:rgba(139,92,246,.42)!important;border-radius:8px!important}`;

function siteThemeCss(kind: 'youtube' | 'google'): string {
  return kind === 'youtube' ? YOUTUBE_THEME_CSS : GOOGLE_THEME_CSS;
}

function siteThemeEnabled(kind: 'youtube' | 'google'): boolean {
  try {
    return getSetting(kind === 'youtube' ? 'youtubeTheme' : 'googleTheme') === true;
  } catch {
    return false;
  }
}

function clearSiteTheme(record: TabRecord): void {
  if (record.siteKey) {
    const key = record.siteKey;
    record.siteKey = null;
    record.siteKind = null;
    void record.view.webContents.removeInsertedCSS(key).catch(() => undefined);
  } else {
    record.siteKind = null;
  }
}

function applySiteTheme(record: TabRecord, url?: string): void {
  const live = url ?? targetUrlOf(record);
  if (!/^https?:\/\//i.test(live) || isTranslatedUrl(live)) {
    clearSiteTheme(record);
    return;
  }
  const kind = siteKindForUrl(live);
  if (!kind || !siteThemeEnabled(kind)) {
    clearSiteTheme(record);
    return;
  }
  if (record.siteKey && record.siteKind === kind) return;
  clearSiteTheme(record);
  void record.view.webContents.insertCSS(siteThemeCss(kind)).then((key) => {
    if (siteKindForUrl(targetUrlOf(record)) !== kind) {
      void record.view.webContents.removeInsertedCSS(key).catch(() => undefined);
      return;
    }
    record.siteKey = key;
    record.siteKind = kind;
  }).catch(() => undefined);
}

export function applySiteThemesToAllTabs(): void {
  for (const r of tabs.values()) {
    r.siteKey = null;
    r.siteKind = null;
    applySiteTheme(r);
  }
}

function clampZoom(factor: number): number {
  if (!Number.isFinite(factor)) return 1;
  return Math.min(5, Math.max(0.25, factor));
}

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

/** Rewrites plain HTTP to HTTPS when HTTPS-only mode is on (local networks excluded). */
function upgradeUrl(url: string): string {
  if (!isInsecureHttpUrl(url) || !getSetting('httpsOnly')) return url;
  try {
    if (isLocalNetworkInput(new URL(url).host)) return url;
  } catch {
    return url;
  }
  return `https://${url.slice('http://'.length)}`;
}

export function setZoom(id: string, factor: number): void {
  const record = tabs.get(id);
  if (!record) return;
  record.zoom = clampZoom(factor);
  record.view.webContents.setZoomFactor(record.zoom);
  broadcastTabs();
}

export function zoomIn(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  const next = ZOOM_STEPS.find((step) => step > record.zoom + 1e-6) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  setZoom(id, next);
}

export function zoomOut(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  const lower = [...ZOOM_STEPS].reverse().find((step) => step < record.zoom - 1e-6) ?? ZOOM_STEPS[0];
  setZoom(id, lower);
}

export function resetZoom(id: string): void {
  setZoom(id, 1);
}

export function handleCertificateError(
  event: Electron.Event,
  webContents: Electron.WebContents,
  url: string,
  error: string,
  certificate: Electron.Certificate,
  callback: (isTrusted: boolean) => void,
  isMainFrame: boolean,
): void {
  event.preventDefault();
  const host = hostOf(url);
  if (host && approvedCertHosts.has(host)) {
    callback(true);
    return;
  }
  if (isMainFrame) {
    const record = getViewByContentsId(webContents.id);
    if (record) {
      emit('browser:cert-warning', {
        tabId: record.id,
        url,
        host,
        error,
        issuer: certificate.issuerName ?? '',
      });
    }
  }
  callback(false);
}

export function approveCertificate(tabId: string, url: string): void {
  const host = hostOf(url);
  if (host) approvedCertHosts.add(host);
  navigateTabConfirmed(tabId, url);
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
    certError: r.certError,
    active: r.id === activeTabId,
    zoom: r.zoom,
    translated: r.translated,
    originalUrl: r.originalUrl,
  };
}

/** Pinned tabs float to the front, otherwise tabs keep their manual order. */
function orderedTabs(): TabRecord[] {
  return [...tabs.values()].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order,
  );
}

export function broadcastTabs(): void {
  const list = orderedTabs().map(snapshot);
  emit('tabs:changed', list, activeTabId);
}

const DARK_READER_CSS = `html{filter:invert(1) hue-rotate(180deg)!important;background:#111!important}
img,video,picture,canvas,svg,[style*="background-image"],[role="img"]{filter:invert(1) hue-rotate(180deg)!important}
::-webkit-scrollbar{background:#1a1a1e!important}`;

function darkReaderEnabled(): boolean {
  try {
    return getSetting('darkReader') === true;
  } catch {
    return false;
  }
}

function applyDarkReader(record: TabRecord): void {
  const wc = record.view.webContents;
  const kind = siteKindForUrl(targetUrlOf(record));
  if (kind) return;
  if (!darkReaderEnabled()) {
    if (record.darkKey) {
      void wc.removeInsertedCSS(record.darkKey).catch(() => undefined);
      record.darkKey = null;
    }
    return;
  }
  let url = '';
  try {
    url = wc.getURL();
  } catch {
    url = record.url;
  }
  if (!/^https?:\/\//i.test(url) || isTranslatedUrl(url)) return;
  if (record.darkKey) return;
  void wc.insertCSS(DARK_READER_CSS).then((key) => {
    record.darkKey = key;
  }).catch(() => undefined);
}

export function applyDarkReaderToAllTabs(): void {
  for (const r of tabs.values()) {
    r.darkKey = null;
    applyDarkReader(r);
  }
}

export function translateTab(id: string, lang?: string): boolean {
  const record = tabs.get(id);
  if (!record) return false;
  const target = lang ?? (getSetting('translateLanguage') as string) ?? 'en';
  let current = record.url;
  try {
    current = record.view.webContents.getURL();
  } catch {
    /* fall back to record url */
  }
  if (!current || isTranslatedUrl(current)) return false;
  const translated = translateUrl(current, target);
  if (!translated) return false;
  record.originalUrl = current;
  record.translated = true;
  record.darkKey = null;
  record.siteKey = null;
  record.siteKind = null;
  void record.view.webContents.loadURL(translated).catch(() => undefined);
  broadcastTabs();
  return true;
}

export function restoreOriginalTab(id: string): boolean {
  const record = tabs.get(id);
  if (!record || !record.translated || !record.originalUrl) return false;
  const back = record.originalUrl;
  record.translated = false;
  record.originalUrl = '';
  record.darkKey = null;
  record.siteKey = null;
  record.siteKind = null;
  void record.view.webContents.loadURL(back).catch(() => undefined);
  broadcastTabs();
  return true;
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
    record.darkKey = null;
    applyDarkReader(record);
    applySiteTheme(record);
    if (/^https?:\/\//i.test(record.url)) {
      recordVisit(record.url, record.title, record.favicon);
      updateBookmarkMeta(record.url, record.title, record.favicon);
    }
    broadcastTabs();
  });
  wc.on('did-navigate', (_e, url) => {
    record.url = url.startsWith('file://') && url.includes('null-pages') ? NULL_NEWTAB : url;
    record.translated = isTranslatedUrl(url);
    if (!record.translated) record.originalUrl = '';
    record.darkKey = null;
    applySiteTheme(record, url);
    record.upgradeFallback = null;
    record.certError = approvedCertHosts.has(hostOf(url));
    record.canGoBack = wc.navigationHistory.canGoBack();
    record.canGoForward = wc.navigationHistory.canGoForward();
    broadcastTabs();
  });
  wc.on('did-navigate-in-page', (_e, url) => {
    record.url = url.startsWith('file://') && url.includes('null-pages') ? NULL_NEWTAB : url;
    applySiteTheme(record, url);
    broadcastTabs();
  });
  wc.on('page-title-updated', (_e, title) => {
    record.title = title || record.url;
    updateVisitMeta(record.url, record.title, record.favicon);
    updateBookmarkMeta(record.url, record.title, record.favicon);
    broadcastTabs();
  });
  wc.on('page-favicon-updated', (_e, favicons) => {
    if (favicons.length > 0) {
      record.favicon = favicons[0];
      updateVisitMeta(record.url, record.title, record.favicon);
      updateBookmarkMeta(record.url, record.title, record.favicon);
      broadcastTabs();
    }
  });
  wc.on('did-fail-load', (_e, code, desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (validatedURL.startsWith('null://') || validatedURL.startsWith('file://')) return;
    const failedHost = hostOf(validatedURL);
    if (record.upgradeFallback && failedHost && /^https:/i.test(validatedURL) && failedHost === hostOf(record.upgradeFallback)) {
      const fallback = record.upgradeFallback;
      record.upgradeFallback = null;
      record.failedUpgrades.add(fallback);
      navigateTab(record.id, fallback, { skipUpgrade: true });
      return;
    }
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
  wc.on('media-paused', () => {
    record.audible = false;
    broadcastTabs();
  });
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('null://set-engine')) {
      e.preventDefault();
      let engineId = '';
      try {
        engineId = new URL(url).searchParams.get('id') ?? '';
      } catch {
        engineId = '';
      }
      applySearchEngine(engineId, record.id);
      return;
    }
    if (url.startsWith('null://go')) {
      e.preventDefault();
      const u = new URL(url);
      const to = u.searchParams.get('to') ?? '';
      if (to) navigateTab(record.id, to);
      return;
    }
    if (upgradeUrl(url) !== url && !record.failedUpgrades.has(url)) {
      e.preventDefault();
      navigateTab(record.id, url);
      return;
    }
    if (shouldWarnInsecure(url, record.url)) {
      e.preventDefault();
      requestInsecureWarning(record.id, url);
      return;
    }
    const sensitive = shouldWarnSensitive(url);
    if (sensitive) {
      e.preventDefault();
      requestSensitiveWarning(record.id, url, sensitive);
    }
  });
  wc.on('will-redirect', (e, url) => {
    if (url.startsWith('null://') || url.startsWith('file://')) return;
    if (upgradeUrl(url) !== url && !record.failedUpgrades.has(url)) {
      e.preventDefault();
      navigateTab(record.id, url);
      return;
    }
    const sensitive = shouldWarnSensitive(url);
    if (sensitive) {
      e.preventDefault();
      requestSensitiveWarning(record.id, url, sensitive);
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
    const sensitive = shouldWarnSensitive(url);
    if (sensitive) {
      const pendingId = createTab(NULL_NEWTAB, true);
      requestSensitiveWarning(pendingId, url, sensitive);
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
  wc.on('enter-html-full-screen', () => {
    setPageFullscreen(true);
  });
  wc.on('leave-html-full-screen', () => {
    setPageFullscreen(false);
  });
}

export function createTab(
  rawUrl?: string,
  activate = true,
  options?: { bypassInsecureWarning?: boolean },
): string {
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
  let upgradeFallback: string | null = null;
  const upgradedInitial = upgradeUrl(initialUrl);
  if (upgradedInitial !== initialUrl) {
    upgradeFallback = initialUrl;
    initialUrl = upgradedInitial;
  }
  let gatedInsecureUrl: string | null = null;
  if (!options?.bypassInsecureWarning && shouldWarnInsecure(initialUrl, '')) {
    gatedInsecureUrl = initialUrl;
    initialUrl = NULL_NEWTAB;
  }
  let gatedSensitiveUrl: string | null = null;
  let gatedSensitiveCategory: SensitiveCategory | null = null;
  if (!gatedInsecureUrl) {
    const sensitive = shouldWarnSensitive(initialUrl);
    if (sensitive) {
      gatedSensitiveUrl = initialUrl;
      gatedSensitiveCategory = sensitive;
      initialUrl = NULL_NEWTAB;
    }
  }
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
  attachPermissionHandlers(view.webContents.session, id);
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
    certError: false,
    zoom: 1,
    translated: false,
    originalUrl: '',
    darkKey: null,
    siteKey: null,
    siteKind: null,
    upgradeFallback,
    failedUpgrades: new Set<string>(),
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
  if (gatedInsecureUrl) requestInsecureWarning(id, gatedInsecureUrl);
  else if (gatedSensitiveUrl && gatedSensitiveCategory) {
    requestSensitiveWarning(id, gatedSensitiveUrl, gatedSensitiveCategory);
  }
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
  return orderedTabs().map(snapshot);
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
    const remaining = orderedTabs();
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

export function navigateTab(id: string, input: string, options?: { skipUpgrade?: boolean }): void {
  const record = tabs.get(id);
  if (!record) return;
  const resolved = resolveInputToUrl(input, getSetting('searchEngine'));
  const skipUpgrade = options?.skipUpgrade || record.failedUpgrades.has(resolved);
  const upgraded = skipUpgrade ? resolved : upgradeUrl(resolved);
  record.upgradeFallback = null;
  record.translated = isTranslatedUrl(upgraded);
  if (!record.translated) record.originalUrl = '';
  record.darkKey = null;
  record.siteKey = null;
  record.siteKind = null;
  const sensitive = shouldWarnSensitive(upgraded);
  if (sensitive) {
    requestSensitiveWarning(id, upgraded, sensitive);
    return;
  }
  if (shouldWarnInsecure(upgraded, record.url, true)) {
    requestInsecureWarning(id, upgraded);
    return;
  }
  if (upgraded !== resolved) record.upgradeFallback = resolved;
  void record.view.webContents.loadURL(upgraded).catch(() => undefined);
}

export function navigateTabConfirmed(id: string, url: string): void {
  const record = tabs.get(id);
  if (!record) return;
  record.darkKey = null;
  record.siteKey = null;
  record.siteKind = null;
  void record.view.webContents.loadURL(url).catch(() => undefined);
}

export function navigateSensitiveConfirmed(id: string, url: string, trustHost: boolean): void {
  const record = tabs.get(id);
  if (!record) return;
  record.darkKey = null;
  record.siteKey = null;
  record.siteKind = null;
  if (trustHost) {
    const host = trustHostForUrl(url);
    if (host) {
      const current = getSetting('trustedSensitiveHosts');
      if (!isHostTrusted(host, current)) {
        setSetting('trustedSensitiveHosts', [...current, host]);
      }
    }
  }
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

export function refreshNewTabPages(): void {
  const newtabUrl = getNewtabUrl();
  for (const record of tabs.values()) {
    let currentUrl = '';
    try {
      currentUrl = record.view.webContents.getURL();
    } catch {
      continue;
    }
    if (currentUrl === newtabUrl) {
      void record.view.webContents.loadURL(newtabUrl).catch(() => undefined);
    }
  }
}

export function stopTab(id: string): void {
  tabs.get(id)?.view.webContents.stop();
}

export function goHome(id: string): void {
  const record = tabs.get(id);
  if (!record) return;
  void record.view.webContents.loadURL(upgradeUrl(getSetting('homepage'))).catch(() => undefined);
}

const ENGINE_ORDER: SearchEngineId[] = Object.keys(SEARCH_ENGINES) as SearchEngineId[];

export function applySearchEngine(id: string, exceptTabId?: string): SearchEngineId | null {
  const next = ENGINE_ORDER.find((engine) => engine === id);
  if (!next) return null;
  if (getSetting('searchEngine') === next) return next;
  setSetting('searchEngine', next);
  try {
    writeInternalPages();
  } catch {
    /* ignore */
  }
  emit('settings:changed', getAllSettings());
  try {
    const newtabUrl = getNewtabUrl();
    for (const r of tabs.values()) {
      if (r.id === exceptTabId) continue;
      let live = '';
      try {
        live = r.view.webContents.getURL();
      } catch {
        /* ignore */
      }
      if (r.url === NULL_NEWTAB || (live.startsWith('file://') && live.includes('null-pages'))) {
        void r.view.webContents.loadURL(newtabUrl).catch(() => undefined);
      }
    }
  } catch {
    /* ignore */
  }
  return next;
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
  // The renderer sends ids in display order (pinned-first), while `order` only
  // ranks within each group — so track the two groups separately instead of
  // blindly numbering the display order.
  const positions = new Map(orderedIds.map((id, idx) => [id, idx]));
  const pinned = [...tabs.values()]
    .filter((r) => r.pinned)
    .sort((a, b) => (positions.get(a.id) ?? a.order) - (positions.get(b.id) ?? b.order));
  const unpinned = [...tabs.values()]
    .filter((r) => !r.pinned)
    .sort((a, b) => (positions.get(a.id) ?? a.order) - (positions.get(b.id) ?? b.order));
  pinned.forEach((r, idx) => {
    r.order = idx;
  });
  unpinned.forEach((r, idx) => {
    r.order = idx;
  });
  orderCounter = Math.max(pinned.length, unpinned.length, orderedIds.length);
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
  approvedCertHosts.clear();
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
