import { app, dialog, shell } from 'electron';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getMainWindow } from './window-manager';
import { clearPrivacyData } from './privacy-manager';
import { clearAllTabs, createTab } from './tab-manager';
import { closeAiPanel } from './ai-panel-manager';
import { getSetting } from './settings-store';
import { GOOGLE_HOME, isValidHttpUrl } from '../shared/config';

export function resolveEmergencyDestination(): string {
  const dest = getSetting('emergencyDestination');
  if (dest === 'blank') return 'about:blank';
  if (dest === 'custom') {
    const custom = getSetting('emergencyCustomUrl').trim();
    if (isValidHttpUrl(custom)) return custom;
    return GOOGLE_HOME;
  }
  return GOOGLE_HOME;
}

export async function triggerEmergency(): Promise<void> {
  closeAiPanel();
  await clearPrivacyData();
  clearAllTabs();
  const url = resolveEmergencyDestination();
  if (url === 'about:blank') {
    createTab('about:blank', true);
  } else {
    createTab(url, true, { bypassInsecureWarning: true });
  }
  const win = getMainWindow();
  win?.webContents.send('browser:emergency-done');
}

export interface DownloadRecord {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  startTime: number;
}

const downloads = new Map<string, DownloadRecord>();
/** Live Electron handles for in-flight downloads. Never serialised to the renderer. */
const activeItems = new Map<string, Electron.DownloadItem>();
let downloadIdCounter = 0;
let emit: (channel: string, ...args: unknown[]) => void = () => undefined;

export function setDownloadEmitter(fn: (channel: string, ...args: unknown[]) => void): void {
  emit = fn;
}

function broadcastDownloads(): void {
  emit('browser:downloads-changed', [...downloads.values()]);
}

export function attachDownloadHandler(ses: Electron.Session): void {
  ses.removeAllListeners('will-download');
  ses.on('will-download', (event, item) => {
    void handleSessionDownload(event, item);
  });
}

function handleSessionDownload(event: Electron.Event, item: Electron.DownloadItem): void {
  const dlg = dialog;
  const id = nodeRandomUUID();
  const filename = item.getFilename() || 'download';
  const url = item.getURL();
  let dir = getDownloadLocation();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  if (!fs.existsSync(dir)) dir = app.getPath('downloads');
  const savePath = path.join(dir, filename);
  if (getSetting('askWhereToSave')) {
    const res = dlg.showSaveDialogSync(getMainWindow() ?? undefined as never, {
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
}

export function handleWillDownload(
  downloadId: string,
  filename: string,
  url: string,
  savePath: string,
  totalBytes: number,
  item?: Electron.DownloadItem,
): void {
  const id = downloadId || `dl-${++downloadIdCounter}`;
  const rec: DownloadRecord = {
    id,
    filename,
    url,
    savePath,
    receivedBytes: 0,
    totalBytes,
    state: 'progressing',
    startTime: Date.now(),
  };
  downloads.set(id, rec);
  if (item) activeItems.set(id, item);
  broadcastDownloads();
}

export function updateDownloadProgress(id: string, received: number, paused = false): void {
  const rec = downloads.get(id);
  if (!rec) return;
  rec.receivedBytes = received;
  if (rec.state !== 'completed' && rec.state !== 'cancelled' && rec.state !== 'interrupted') {
    rec.state = paused ? 'paused' : 'progressing';
  }
  emit('browser:downloads-changed', [...downloads.values()]);
}

export function finishDownload(id: string, state: DownloadRecord['state']): void {
  const rec = downloads.get(id);
  if (!rec) return;
  rec.state = state;
  activeItems.delete(id);
  broadcastDownloads();
}

export function pauseDownload(id: string): void {
  const rec = downloads.get(id);
  const item = activeItems.get(id);
  if (!rec || !item || rec.state !== 'progressing') return;
  try {
    item.pause();
    rec.state = 'paused';
    broadcastDownloads();
  } catch {
    /* item already finished */
  }
}

export function resumeDownload(id: string): void {
  const rec = downloads.get(id);
  const item = activeItems.get(id);
  if (!rec || !item || rec.state !== 'paused') return;
  try {
    if (item.canResume()) item.resume();
    rec.state = 'progressing';
    broadcastDownloads();
  } catch {
    /* item already finished */
  }
}

export function cancelDownload(id: string): void {
  const item = activeItems.get(id);
  try {
    item?.cancel();
  } catch {
    /* ignore */
  }
  const rec = downloads.get(id);
  if (rec) {
    rec.state = 'cancelled';
    activeItems.delete(id);
    broadcastDownloads();
  }
}

export function removeDownload(id: string): void {
  activeItems.delete(id);
  downloads.delete(id);
  broadcastDownloads();
}

export function clearFinishedDownloads(): void {
  for (const [id, rec] of downloads) {
    if (rec.state !== 'progressing' && rec.state !== 'paused') downloads.delete(id);
  }
  broadcastDownloads();
}

export function getDownloads(): DownloadRecord[] {
  return [...downloads.values()];
}

export function showDownloadInFolder(savePath: string): void {
  shell.showItemInFolder(savePath);
}

export function openDownloadedFile(savePath: string): void {
  shell.openPath(savePath).then((err) => {
    if (err) {
      const win = getMainWindow();
      if (win) dialog.showErrorBox('Cannot open file', err);
    }
  });
}

export function getDownloadLocation(): string {
  const custom = getSetting('downloadLocation').trim();
  if (custom) return custom;
  return app.getPath('downloads');
}
