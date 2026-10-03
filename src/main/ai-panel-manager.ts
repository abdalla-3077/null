import { WebContentsView, session } from 'electron';
import { getMainWindow, getAiPanelBounds, isFullscreen, isModalOpen } from './window-manager';
import { getSetting } from './settings-store';
import { DEVICE_PROFILES } from '../shared/config';

let aiView: WebContentsView | null = null;
let aiDownloadAttacher: ((ses: Electron.Session) => void) | null = null;

export function setAiDownloadAttacher(fn: (ses: Electron.Session) => void): void {
  aiDownloadAttacher = fn;
}

function lazyAiDownload(ses: Electron.Session): void {
  try {
    aiDownloadAttacher?.(ses);
  } catch {
    /* ignore */
  }
}
let currentProviderUrl: string | null = null;

export function isAiPanelOpen(): boolean {
  return aiView !== null;
}

export function openAiPanel(url: string): void {
  const win = getMainWindow();
  if (!win) return;
  const profile = DEVICE_PROFILES[getSetting('deviceProfile')] ?? DEVICE_PROFILES.linux;
  if (!aiView) {
    aiView = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        partition: 'null-ai',
      },
    });
    aiView.webContents.setUserAgent(profile.userAgent);
    aiView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    lazyAiDownload(aiView.webContents.session);
    win.contentView.addChildView(aiView);
  }
  if (currentProviderUrl !== url) {
    currentProviderUrl = url;
    void aiView.webContents.loadURL(url).catch(() => undefined);
  }
  layoutAiPanel();
}

export function closeAiPanel(): void {
  const win = getMainWindow();
  if (aiView && win) {
    try {
      win.contentView.removeChildView(aiView);
    } catch {
      /* ignore */
    }
  }
  if (aiView) {
    try {
      (aiView.webContents as unknown as { destroy?: () => void }).destroy?.();
    } catch {
      /* ignore */
    }
  }
  aiView = null;
  currentProviderUrl = null;
}

export function layoutAiPanel(): void {
  if (!aiView) return;
  if (isModalOpen() || isFullscreen()) {
    aiView.setVisible(false);
    return;
  }
  aiView.setBounds(getAiPanelBounds());
  aiView.setVisible(true);
}

export async function clearAiSessionData(): Promise<void> {
  try {
    const ses = session.fromPartition('null-ai');
    await ses.clearStorageData({
      storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'serviceworkers'],
    });
    await ses.clearCache();
  } catch {
    /* ignore */
  }
}
