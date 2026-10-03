import {
  BrowserWindow,
  Menu,
  app,
  clipboard,
  dialog,
  ipcMain,
  session,
  shell,
} from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  applyDeviceProfileToAllTabs,
  applyDarkReaderToAllTabs,
  applySiteThemesToAllTabs,
  approveCertificate,
  closeTab,
  createTab,
  duplicateTab,
  findInPage,
  getActiveTabId,
  getTabRecord,
  getTabs,
  goBack,
  goForward,
  goHome,
  layoutTabViews,
  navigateTab,
  navigateTabConfirmed,
  navigateSensitiveConfirmed,
  openExternal,
  reloadTab,
  refreshNewTabPages,
  reorderTabs,
  reopenClosedTab,
  resetZoom,
  restoreOriginalTab,
  setActiveTab,
  setMuted,
  setTabEventEmitter,
  setZoom,
  stopFind,
  stopTab,
  togglePin,
  translateTab,
  zoomIn,
  zoomOut,
} from '../tab-manager';
import { closeAiPanel, isAiPanelOpen, layoutAiPanel, openAiPanel } from '../ai-panel-manager';
import { clearPrivacyData } from '../privacy-manager';
import {
  cancelDownload,
  clearFinishedDownloads,
  finishDownload,
  getDownloadLocation,
  getDownloads,
  handleWillDownload,
  openDownloadedFile,
  pauseDownload,
  removeDownload,
  resumeDownload,
  setDownloadEmitter,
  showDownloadInFolder,
  triggerEmergency,
  updateDownloadProgress,
} from '../download-manager';
import {
  addBookmark,
  clearBookmarks,
  clearHistory,
  getBookmarks,
  getHistory,
  removeBookmark,
  removeHistoryEntry,
  setSessionEmitter,
  toggleBookmark,
} from '../session-store';
import { respondPermission, setPermissionEmitter } from '../permissions';
import { createMainWindow, getAllWindows, getMainWindow, isFullscreen, onFullscreenChanged, onRelayoutNeeded, setChromeSizes, setModalOpen, setWindowFullscreen } from '../window-manager';
import { setDownloadAttacher } from '../tab-manager';
import { setAiDownloadAttacher } from '../ai-panel-manager';
import { attachDownloadHandler } from '../download-manager';
import { getAllSettings, getSetting, setSetting } from '../settings-store';
import { writeInternalPages } from '../null-protocol';
import { fetchSiteImage, fetchSiteResource, inspectTab, setTabDevToolsOpen } from '../site-inspector';
import { DEVICE_PROFILES, isValidHttpUrl } from '../../shared/config';
import type { AppSettings, SiteResourceKind } from '../../shared/types';

function senderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

export function registerIpc(preloadPath: string): void {
  void preloadPath;
  setDownloadAttacher(attachDownloadHandler);
  setAiDownloadAttacher(attachDownloadHandler);
  setTabEventEmitter(broadcast);
  setDownloadEmitter(broadcast);
  setSessionEmitter(broadcast);
  setPermissionEmitter(broadcast);
  onRelayoutNeeded(() => {
    layoutTabViews();
    layoutAiPanel();
  });
  onFullscreenChanged((fullscreen) => {
    broadcast('browser:fullscreen-changed', fullscreen);
  });

  ipcMain.handle('settings:get-all', () => getAllSettings());
  ipcMain.handle('settings:set', (_e, key: keyof AppSettings, value: AppSettings[typeof key]) => {
    if (key === 'emergencyCustomUrl' && typeof value === 'string' && value.trim() !== '') {
      if (!isValidHttpUrl(value.trim())) throw new Error('Invalid URL');
    }
    if (key === 'newTabWallpaper' && !['none', 'coastal-dusk', 'alpine-fog', 'desert-night', 'forest-canopy', 'arctic-glow', 'city-rain', 'lavender-dusk', 'fjord-morning', 'canyon-glow', 'aurora-mesh', 'ink-tide', 'nebula-drift'].includes(String(value))) {
      throw new Error('Invalid wallpaper');
    }
    if (key === 'translateLanguage' && typeof value === 'string' && !/^[a-z]{2}(-[A-Z]{2})?$/.test(value)) {
      throw new Error('Invalid language');
    }
    setSetting(key, value as never);
    broadcast('settings:changed', getAllSettings());
    if (key === 'theme' || key === 'appearance' || key === 'aiProviders' || key === 'newTabShowAI' || key === 'newTabWallpaper' || key === 'searchEngine' || key === 'widgetCity' || key === 'widgetWeather' || key === 'widgetCrypto') {
      try {
        writeInternalPages();
        refreshNewTabPages();
      } catch {
        /* ignore */
      }
    }
    if (key === 'darkReader') applyDarkReaderToAllTabs();
    if (key === 'youtubeTheme' || key === 'googleTheme') applySiteThemesToAllTabs();
    if (key === 'deviceProfile') applyDeviceProfileToAllTabs();
    if (key === 'aiPanelOpen') {
      if (value) {
        const providers = getSetting('aiProviders');
        const active = providers.find((p) => p.id === getSetting('aiActiveProvider')) ?? providers[0];
        if (active) openAiPanel(active.url);
      } else {
        closeAiPanel();
      }
      layoutTabViews();
    }
    if (key === 'aiPanelWidth' || key === 'aiActiveProvider') {
      layoutAiPanel();
      layoutTabViews();
    }
    return getAllSettings();
  });

  ipcMain.handle('browser:create-tab', (_e, url?: string, activate?: boolean) =>
    createTab(url, activate ?? true),
  );
  ipcMain.handle('browser:close-tab', (_e, id: string) => closeTab(id));
  ipcMain.handle('browser:activate-tab', (_e, id: string) => setActiveTab(id));
  ipcMain.handle('browser:navigate', (_e, id: string, input: string) => navigateTab(id, input));
  ipcMain.handle('browser:navigate-confirm', (_e, id: string, url: string) =>
    navigateTabConfirmed(id, url),
  );
  ipcMain.handle('browser:sensitive-confirm', (_e, id: string, url: string, trustHost: boolean) =>
    navigateSensitiveConfirmed(id, url, !!trustHost),
  );
  ipcMain.handle('browser:cert-approve', (_e, id: string, url: string) =>
    approveCertificate(id, url),
  );
  ipcMain.handle('browser:reload', (_e, id: string, hard?: boolean) => reloadTab(id, !!hard));
  ipcMain.handle('browser:stop', (_e, id: string) => stopTab(id));
  ipcMain.handle('browser:go-back', (_e, id: string) => goBack(id));
  ipcMain.handle('browser:go-forward', (_e, id: string) => goForward(id));
  ipcMain.handle('browser:go-home', (_e, id: string) => goHome(id));
  ipcMain.handle('browser:duplicate-tab', (_e, id: string) => duplicateTab(id));
  ipcMain.handle('browser:reopen-closed', () => reopenClosedTab());
  ipcMain.handle('browser:mute-tab', (_e, id: string, muted: boolean) => setMuted(id, muted));
  ipcMain.handle('browser:toggle-pin', (_e, id: string) => togglePin(id));
  ipcMain.handle('browser:reorder-tabs', (_e, ids: string[]) => reorderTabs(ids));
  ipcMain.handle('browser:get-tabs', () => ({ tabs: getTabs(), activeId: getActiveTabId() }));
  ipcMain.handle('browser:zoom-in', (_e, id: string) => zoomIn(id));
  ipcMain.handle('browser:zoom-out', (_e, id: string) => zoomOut(id));
  ipcMain.handle('browser:zoom-reset', (_e, id: string) => resetZoom(id));
  ipcMain.handle('browser:zoom-set', (_e, id: string, factor: number) => setZoom(id, Number(factor)));
  ipcMain.handle('browser:translate', (_e, id: string, lang?: string) => translateTab(id, lang));
  ipcMain.handle('browser:translate-restore', (_e, id: string) => restoreOriginalTab(id));

  ipcMain.handle('bookmarks:get', () => getBookmarks());
  ipcMain.handle('bookmarks:toggle', (_e, url: string, title: string, favicon: string) =>
    toggleBookmark(url, title, favicon),
  );
  ipcMain.handle('bookmarks:add', (_e, url: string, title: string, favicon: string) => {
    addBookmark(url, title, favicon);
    return getBookmarks();
  });
  ipcMain.handle('bookmarks:remove', (_e, id: string) => removeBookmark(id));
  ipcMain.handle('bookmarks:clear', () => clearBookmarks());

  ipcMain.handle('history:get', () => getHistory());
  ipcMain.handle('history:remove', (_e, id: string) => removeHistoryEntry(id));
  ipcMain.handle('history:clear', () => clearHistory());

  ipcMain.handle('browser:permission-respond', (_e, id: string, allow: boolean) =>
    respondPermission(id, !!allow),
  );
  ipcMain.handle('browser:dev-info', (_e, id: string | null) => inspectTab(id ?? getActiveTabId()));
  ipcMain.handle('browser:dev-resource', (_e, id: string | null, kind: SiteResourceKind, url?: string) =>
    fetchSiteResource(id ?? getActiveTabId(), kind, url),
  );
  ipcMain.handle('browser:dev-devtools', (_e, id: string, open: boolean) =>
    setTabDevToolsOpen(id, !!open),
  );
  ipcMain.handle('browser:dev-image', (_e, url: string | null, referer?: string | null) =>
    fetchSiteImage(url, referer),
  );
  ipcMain.handle('browser:find', (_e, id: string, q: string, fwd?: boolean, mc?: boolean) =>
    findInPage(id, q, fwd ?? true, mc ?? false),
  );
  ipcMain.handle('browser:find-stop', (_e, id: string) => stopFind(id));
  ipcMain.handle('browser:open-external', (_e, url: string) => openExternal(url));

  ipcMain.handle('browser:ai-open', (_e, providerId: string) => {
    const providers = getSetting('aiProviders');
    const p = providers.find((x) => x.id === providerId);
    if (!p) throw new Error('Unknown provider');
    setSetting('aiPanelOpen', true);
    setSetting('aiActiveProvider', providerId);
    openAiPanel(p.url);
    layoutTabViews();
    broadcast('settings:changed', getAllSettings());
  });
  ipcMain.handle('browser:ai-close', () => {
    setSetting('aiPanelOpen', false);
    closeAiPanel();
    layoutTabViews();
    broadcast('settings:changed', getAllSettings());
  });
  ipcMain.handle('browser:ai-toggle', (_e, providerId?: string) => {
    if (isAiPanelOpen()) {
      setSetting('aiPanelOpen', false);
      closeAiPanel();
    } else {
      const providers = getSetting('aiProviders');
      const p =
        providers.find((x) => x.id === (providerId ?? getSetting('aiActiveProvider'))) ??
        providers[0];
      if (!p) return;
      setSetting('aiPanelOpen', true);
      setSetting('aiActiveProvider', p.id);
      openAiPanel(p.url);
    }
    layoutTabViews();
    broadcast('settings:changed', getAllSettings());
  });

  ipcMain.handle('browser:set-chrome', (_e, sizes: { top: number; bottom: number; side: number }) => {
    setChromeSizes({ ...sizes, ai: 0 });
  });
  ipcMain.handle('browser:set-modal-open', (_e, open: boolean) => {
    setModalOpen(!!open);
  });
  ipcMain.handle('browser:get-fullscreen', () => isFullscreen());
  ipcMain.handle('browser:set-window-fullscreen', (_e, fullscreen: boolean) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return isFullscreen();
    const value = !!fullscreen;
    setWindowFullscreen(value);
    try {
      if (win.isFullScreen() !== value) win.setFullScreen(value);
    } catch {
      /* ignore */
    }
    return isFullscreen();
  });

  ipcMain.handle('browser:clear-session', () => clearPrivacyData());
  ipcMain.handle('browser:emergency', () => triggerEmergency());

  ipcMain.handle('browser:device-profile', () =>
    DEVICE_PROFILES[getSetting('deviceProfile')] ?? DEVICE_PROFILES.linux,
  );

  ipcMain.handle('browser:downloads', () => getDownloads());
  ipcMain.handle('browser:download-reveal', (_e, p: string) => showDownloadInFolder(p));
  ipcMain.handle('browser:download-open', (_e, p: string) => openDownloadedFile(p));
  ipcMain.handle('browser:download-pause', (_e, id: string) => pauseDownload(id));
  ipcMain.handle('browser:download-resume', (_e, id: string) => resumeDownload(id));
  ipcMain.handle('browser:download-cancel', (_e, id: string) => cancelDownload(id));
  ipcMain.handle('browser:download-remove', (_e, id: string) => removeDownload(id));
  ipcMain.handle('browser:download-clear-finished', () => clearFinishedDownloads());

  ipcMain.handle('browser:new-window', (event) => {
    createMainWindow(preloadPathRef, senderWindow(event) ?? undefined);
  });

  ipcMain.handle('browser:window-action', (event, action: 'min' | 'max' | 'close') => {
    const win = senderWindow(event);
    if (!win) return;
    if (action === 'min') win.minimize();
    else if (action === 'max') {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    } else win.close();
  });

  ipcMain.handle('browser:pick-download-dir', async (event) => {
    const win = senderWindow(event);
    const res = await dialog.showOpenDialog(win ?? undefined as never, {
      properties: ['openDirectory'],
    });
    return res.canceled ? null : res.filePaths[0] ?? null;
  });

  ipcMain.handle('browser:show-context-menu', (event, menu: { tabId: string; linkURL: string; srcURL: string; selectionText: string; isEditable: boolean }) => {
    const win = senderWindow(event);
    if (!win) return;
    const { tabId, linkURL, srcURL, selectionText, isEditable } = menu;
    const record = getTabRecord(tabId);
    const template: Electron.MenuItemConstructorOptions[] = [];
    if (linkURL) {
      template.push(
        { label: 'Open link in new tab', click: () => createTab(linkURL, true) },
        { label: 'Copy link address', click: () => clipboard.writeText(linkURL) },
        { type: 'separator' },
      );
    }
    if (srcURL) {
      template.push(
        { label: 'Open image in new tab', click: () => createTab(srcURL, true) },
        { label: 'Copy image address', click: () => clipboard.writeText(srcURL) },
        { type: 'separator' },
      );
    }
    if (selectionText) {
      template.push({
        label: `Search for "${selectionText.slice(0, 32)}"`,
        click: () => createTab(selectionText, true),
      });
    }
    if (isEditable) {
      template.push(
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
      );
    } else if (!selectionText) {
      template.push({ role: 'copy' }, { type: 'separator' });
    }
    template.push(
      { label: 'Back', enabled: !!record && record.view.webContents.navigationHistory.canGoBack(), click: () => goBack(tabId) },
      { label: 'Forward', enabled: !!record && record.view.webContents.navigationHistory.canGoForward(), click: () => goForward(tabId) },
      { label: 'Reload', click: () => reloadTab(tabId) },
    );
    if (getSetting('devMode')) {
      template.push(
        { type: 'separator' },
        {
          label: 'Inspect element',
          click: () => record?.view.webContents.inspectElement(0, 0),
        },
      );
    }
    Menu.buildFromTemplate(template).popup();
  });

  ipcMain.on('renderer:ready', () => {
    broadcast('settings:changed', getAllSettings());
    broadcast('browser:fullscreen-changed', isFullscreen());
    if (getTabs().length === 0) createTab(undefined, true);
    else {
      const { tabs, activeId } = { tabs: getTabs(), activeId: getActiveTabId() };
      broadcast('tabs:changed', tabs, activeId);
    }
    if (getSetting('aiPanelOpen')) {
      const providers = getSetting('aiProviders');
      const active = providers.find((p) => p.id === getSetting('aiActiveProvider')) ?? providers[0];
      if (active) openAiPanel(active.url);
      layoutTabViews();
    }
  });

  session.defaultSession.on('will-download', (event, item) => {
    const id = randomUUID();
    const filename = item.getFilename();
    const url = item.getURL();
    const dir = getDownloadLocation();
    const savePath = path.join(dir, filename);
    if (getSetting('askWhereToSave')) {
      const win = getMainWindow();
      const res = dialog.showSaveDialogSync(win ?? undefined as never, {
        defaultPath: savePath,
        buttonLabel: 'Save',
      });
      if (!res) {
        event.preventDefault();
        return;
      }
      item.setSavePath(res);
      handleWillDownload(id, filename, url, res, item.getTotalBytes(), item);
    } else {
      item.setSavePath(savePath);
      handleWillDownload(id, filename, url, savePath, item.getTotalBytes(), item);
    }
    item.on('updated', (_e, state) => {
      if (state === 'progressing') updateDownloadProgress(id, item.getReceivedBytes(), item.isPaused());
    });
    item.once('done', (_e, state) => {
      finishDownload(id, state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted');
    });
  });

  app.on('before-quit', (e) => {
    e.preventDefault();
    void clearPrivacyData().finally(() => {
      app.exit(0);
    });
  });
}

let preloadPathRef = '';
export function setPreloadPath(p: string): void {
  preloadPathRef = p;
}

export function openLinkExternal(url: string): void {
  if (/^https?:/.test(url)) void shell.openExternal(url);
}
