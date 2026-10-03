import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  BookmarkItem,
  CertificateWarningInfo,
  DownloadItem,
  FindResult,
  HistoryEntry,
  InsecureWarningInfo,
  PermissionRequestInfo,
  SensitiveWarningInfo,
  SiteImageResult,
  SiteResourceKind,
  SiteResourceResult,
  TabDevInfo,
  TabInfo,
} from './shared/types';

const browser = {
  createTab: (url?: string, activate?: boolean): Promise<string> =>
    ipcRenderer.invoke('browser:create-tab', url, activate),
  closeTab: (id: string): Promise<void> => ipcRenderer.invoke('browser:close-tab', id),
  activateTab: (id: string): Promise<void> => ipcRenderer.invoke('browser:activate-tab', id),
  navigate: (id: string, input: string): Promise<void> =>
    ipcRenderer.invoke('browser:navigate', id, input),
  navigateConfirmed: (id: string, url: string): Promise<void> =>
    ipcRenderer.invoke('browser:navigate-confirm', id, url),
  sensitiveConfirm: (id: string, url: string, trustHost: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:sensitive-confirm', id, url, trustHost),
  approveCertificate: (id: string, url: string): Promise<void> =>
    ipcRenderer.invoke('browser:cert-approve', id, url),
  reload: (id: string, hard?: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:reload', id, hard),
  stop: (id: string): Promise<void> => ipcRenderer.invoke('browser:stop', id),
  goBack: (id: string): Promise<void> => ipcRenderer.invoke('browser:go-back', id),
  goForward: (id: string): Promise<void> => ipcRenderer.invoke('browser:go-forward', id),
  goHome: (id: string): Promise<void> => ipcRenderer.invoke('browser:go-home', id),
  duplicateTab: (id: string): Promise<void> => ipcRenderer.invoke('browser:duplicate-tab', id),
  reopenClosed: (): Promise<string | null> => ipcRenderer.invoke('browser:reopen-closed'),
  muteTab: (id: string, muted: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:mute-tab', id, muted),
  togglePin: (id: string): Promise<void> => ipcRenderer.invoke('browser:toggle-pin', id),
  reorderTabs: (ids: string[]): Promise<void> => ipcRenderer.invoke('browser:reorder-tabs', ids),
  getTabs: (): Promise<{ tabs: TabInfo[]; activeId: string | null }> =>
    ipcRenderer.invoke('browser:get-tabs'),
  zoomIn: (id: string): Promise<void> => ipcRenderer.invoke('browser:zoom-in', id),
  zoomOut: (id: string): Promise<void> => ipcRenderer.invoke('browser:zoom-out', id),
  resetZoom: (id: string): Promise<void> => ipcRenderer.invoke('browser:zoom-reset', id),
  setZoom: (id: string, factor: number): Promise<void> =>
    ipcRenderer.invoke('browser:zoom-set', id, factor),
  translate: (id: string, lang?: string): Promise<boolean> =>
    ipcRenderer.invoke('browser:translate', id, lang),
  translateRestore: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('browser:translate-restore', id),
  getBookmarks: (): Promise<BookmarkItem[]> => ipcRenderer.invoke('bookmarks:get'),
  toggleBookmark: (url: string, title: string, favicon: string): Promise<boolean> =>
    ipcRenderer.invoke('bookmarks:toggle', url, title, favicon),
  addBookmark: (url: string, title: string, favicon: string): Promise<BookmarkItem[]> =>
    ipcRenderer.invoke('bookmarks:add', url, title, favicon),
  removeBookmark: (id: string): Promise<void> => ipcRenderer.invoke('bookmarks:remove', id),
  clearBookmarks: (): Promise<void> => ipcRenderer.invoke('bookmarks:clear'),
  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:get'),
  removeHistory: (id: string): Promise<void> => ipcRenderer.invoke('history:remove', id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke('history:clear'),
  respondPermission: (id: string, allow: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:permission-respond', id, allow),
  devInfo: (id: string | null): Promise<TabDevInfo | null> =>
    ipcRenderer.invoke('browser:dev-info', id),
  devResource: (
    id: string | null,
    kind: SiteResourceKind,
    url?: string,
  ): Promise<SiteResourceResult | null> =>
    ipcRenderer.invoke('browser:dev-resource', id, kind, url),
  setDevToolsOpen: (id: string, open: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:dev-devtools', id, open),
  devImage: (url: string | null, referer?: string | null): Promise<SiteImageResult | null> =>
    ipcRenderer.invoke('browser:dev-image', url, referer),
  find: (id: string, q: string, fwd?: boolean, mc?: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:find', id, q, fwd, mc),
  findStop: (id: string): Promise<void> => ipcRenderer.invoke('browser:find-stop', id),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('browser:open-external', url),
  aiOpen: (providerId: string): Promise<void> => ipcRenderer.invoke('browser:ai-open', providerId),
  aiClose: (): Promise<void> => ipcRenderer.invoke('browser:ai-close'),
  aiToggle: (providerId?: string): Promise<void> => ipcRenderer.invoke('browser:ai-toggle', providerId),
  setChrome: (sizes: { top: number; bottom: number; side: number }): Promise<void> =>
    ipcRenderer.invoke('browser:set-chrome', sizes),
  setModalOpen: (open: boolean): Promise<void> =>
    ipcRenderer.invoke('browser:set-modal-open', open),
  clearSession: (): Promise<void> => ipcRenderer.invoke('browser:clear-session'),
  emergency: (): Promise<void> => ipcRenderer.invoke('browser:emergency'),
  newWindow: (): Promise<void> => ipcRenderer.invoke('browser:new-window'),
  getFullscreen: (): Promise<boolean> => ipcRenderer.invoke('browser:get-fullscreen'),
  setWindowFullscreen: (fullscreen: boolean): Promise<boolean> =>
    ipcRenderer.invoke('browser:set-window-fullscreen', !!fullscreen),
  windowAction: (a: 'min' | 'max' | 'close'): Promise<void> =>
    ipcRenderer.invoke('browser:window-action', a),
  pickDownloadDir: (): Promise<string | null> => ipcRenderer.invoke('browser:pick-download-dir'),
  showContextMenu: (m: {
    tabId: string;
    linkURL: string;
    srcURL: string;
    selectionText: string;
    isEditable: boolean;
  }): Promise<void> => ipcRenderer.invoke('browser:show-context-menu', m),
  getDownloads: (): Promise<DownloadItem[]> => ipcRenderer.invoke('browser:downloads'),
  downloadReveal: (p: string): Promise<void> => ipcRenderer.invoke('browser:download-reveal', p),
  downloadOpen: (p: string): Promise<void> => ipcRenderer.invoke('browser:download-open', p),
  downloadPause: (id: string): Promise<void> => ipcRenderer.invoke('browser:download-pause', id),
  downloadResume: (id: string): Promise<void> => ipcRenderer.invoke('browser:download-resume', id),
  downloadCancel: (id: string): Promise<void> => ipcRenderer.invoke('browser:download-cancel', id),
  downloadRemove: (id: string): Promise<void> => ipcRenderer.invoke('browser:download-remove', id),
  downloadClearFinished: (): Promise<void> => ipcRenderer.invoke('browser:download-clear-finished'),
  rendererReady: (): void => ipcRenderer.send('renderer:ready'),
  onFullscreenChanged: (cb: (fullscreen: boolean) => void): (() => void) => {
    const fn = (_e: unknown, fullscreen: boolean) => cb(!!fullscreen);
    ipcRenderer.on('browser:fullscreen-changed', fn as never);
    return () => ipcRenderer.removeListener('browser:fullscreen-changed', fn as never);
  },
  onTabsChanged: (cb: (tabs: TabInfo[], activeId: string | null) => void): (() => void) => {
    const fn = (_e: unknown, tabs: TabInfo[], activeId: string | null) => cb(tabs, activeId);
    ipcRenderer.on('tabs:changed', fn as never);
    return () => ipcRenderer.removeListener('tabs:changed', fn as never);
  },
  onSettingsChanged: (cb: (s: AppSettings) => void): (() => void) => {
    const fn = (_e: unknown, s: AppSettings) => cb(s);
    ipcRenderer.on('settings:changed', fn as never);
    return () => ipcRenderer.removeListener('settings:changed', fn as never);
  },
  onInsecureWarning: (cb: (w: InsecureWarningInfo) => void): (() => void) => {
    const fn = (_e: unknown, w: InsecureWarningInfo) => cb(w);
    ipcRenderer.on('browser:insecure-warning', fn as never);
    return () => ipcRenderer.removeListener('browser:insecure-warning', fn as never);
  },
  onCertificateWarning: (cb: (w: CertificateWarningInfo) => void): (() => void) => {
    const fn = (_e: unknown, w: CertificateWarningInfo) => cb(w);
    ipcRenderer.on('browser:cert-warning', fn as never);
    return () => ipcRenderer.removeListener('browser:cert-warning', fn as never);
  },
  onSensitiveWarning: (cb: (w: SensitiveWarningInfo) => void): (() => void) => {
    const fn = (_e: unknown, w: SensitiveWarningInfo) => cb(w);
    ipcRenderer.on('browser:sensitive-warning', fn as never);
    return () => ipcRenderer.removeListener('browser:sensitive-warning', fn as never);
  },
  onDownloadsChanged: (cb: (d: DownloadItem[]) => void): (() => void) => {
    const fn = (_e: unknown, d: DownloadItem[]) => cb(d);
    ipcRenderer.on('browser:downloads-changed', fn as never);
    return () => ipcRenderer.removeListener('browser:downloads-changed', fn as never);
  },
  onBookmarksChanged: (cb: (b: BookmarkItem[]) => void): (() => void) => {
    const fn = (_e: unknown, b: BookmarkItem[]) => cb(b);
    ipcRenderer.on('browser:bookmarks-changed', fn as never);
    return () => ipcRenderer.removeListener('browser:bookmarks-changed', fn as never);
  },
  onHistoryChanged: (cb: (h: HistoryEntry[]) => void): (() => void) => {
    const fn = (_e: unknown, h: HistoryEntry[]) => cb(h);
    ipcRenderer.on('browser:history-changed', fn as never);
    return () => ipcRenderer.removeListener('browser:history-changed', fn as never);
  },
  onPermissionRequest: (cb: (r: PermissionRequestInfo) => void): (() => void) => {
    const fn = (_e: unknown, r: PermissionRequestInfo) => cb(r);
    ipcRenderer.on('browser:permission-request', fn as never);
    return () => ipcRenderer.removeListener('browser:permission-request', fn as never);
  },
  onFindResult: (cb: (r: FindResult) => void): (() => void) => {
    const fn = (_e: unknown, r: FindResult) => cb(r);
    ipcRenderer.on('browser:find-result', fn as never);
    return () => ipcRenderer.removeListener('browser:find-result', fn as never);
  },
  onContextMenu: (
    cb: (m: {
      tabId: string;
      x: number;
      y: number;
      linkURL: string;
      srcURL: string;
      selectionText: string;
      isEditable: boolean;
      mediaType: string;
    }) => void,
  ): (() => void) => {
    const fn = (_e: unknown, m: never) => cb(m as never);
    ipcRenderer.on('browser:context-menu', fn as never);
    return () => ipcRenderer.removeListener('browser:context-menu', fn as never);
  },
  onShortcut: (cb: (channel: string) => void): (() => void) => {
    const channels = [
      'shortcut:new-tab',
      'shortcut:new-window',
      'shortcut:close-tab',
      'shortcut:reopen-tab',
      'shortcut:focus-address',
      'shortcut:reload',
      'shortcut:hard-reload',
      'shortcut:fullscreen',
      'shortcut:next-tab',
      'shortcut:prev-tab',
      'shortcut:find',
      'shortcut:clear-data',
    ];
    const fns = channels.map((c) => {
      const fn = (): void => cb(c);
      ipcRenderer.on(c, fn);
      return { c, fn };
    });
    return () => {
      for (const { c, fn } of fns) ipcRenderer.removeListener(c, fn);
    };
  },
  onEmergencyDone: (cb: () => void): (() => void) => {
    const fn = () => cb();
    ipcRenderer.on('browser:emergency-done', fn);
    return () => ipcRenderer.removeListener('browser:emergency-done', fn);
  },
};

const settings = {
  getAll: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get-all'),
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', key, value),
};

export type NullBrowserApi = typeof browser;
export type NullSettingsApi = typeof settings;

contextBridge.exposeInMainWorld('nullBrowser', browser);
contextBridge.exposeInMainWorld('nullSettings', settings);
