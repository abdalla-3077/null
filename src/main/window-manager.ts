import { BrowserWindow, app, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getSetting } from './settings-store';

let mainWindow: BrowserWindow | null = null;
/** Every window ever created, so broadcasts reach all of them. */
const allWindows = new Set<BrowserWindow>();
let chromeTop = 96;
let chromeBottom = 0;
let sideWidth = 0;
let aiWidth = 0;
let modalOpen = false;
let onLayoutChange: (() => void) | null = null;

export function setChromeSizes(sizes: {
  top: number;
  bottom: number;
  side: number;
  ai: number;
}): void {
  // The chrome always contains the toolbar, so a non-positive top means the
  // renderer measured before it was laid out. Ignore it rather than covering
  // the whole window with the native tab view.
  if (sizes.top > 0) chromeTop = sizes.top;
  chromeBottom = sizes.bottom;
  sideWidth = sizes.side;
  aiWidth = sizes.ai;
  relayout();
}

export function onRelayoutNeeded(cb: () => void): void {
  onLayoutChange = cb;
}

export function setModalOpen(open: boolean): void {
  if (modalOpen === open) return;
  modalOpen = open;
  relayout();
}

export function isModalOpen(): boolean {
  return modalOpen;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getAllWindows(): BrowserWindow[] {
  return [...allWindows];
}

export function getContentBounds(): { x: number; y: number; width: number; height: number } {
  if (!mainWindow) return { x: 0, y: 0, width: 800, height: 600 };
  const b = mainWindow.getContentBounds();
  const aiOpen = getSetting('aiPanelOpen');
  const panelW = aiOpen ? getSetting('aiPanelWidth') : 0;
  void aiWidth;
  const x = sideWidth;
  const width = Math.max(200, b.width - sideWidth - panelW);
  return { x, y: chromeTop, width, height: Math.max(200, b.height - chromeTop - chromeBottom) };
}

export function getAiPanelBounds(): { x: number; y: number; width: number; height: number } {
  if (!mainWindow) return { x: 0, y: 0, width: 360, height: 600 };
  const b = mainWindow.getContentBounds();
  const w = getSetting('aiPanelWidth');
  return { x: b.width - w, y: chromeTop, width: w, height: Math.max(200, b.height - chromeTop) };
}

export function relayout(): void {
  if (onLayoutChange) onLayoutChange();
}

export function resolveAppIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(app.getAppPath(), 'assets', 'icon.png'),
    path.join(__dirname, '..', '..', 'assets', 'icon.png'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export function createMainWindow(preloadPath: string, source?: BrowserWindow): BrowserWindow {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  let x: number | undefined;
  let y: number | undefined;
  if (source && !source.isDestroyed()) {
    try {
      const b = source.getBounds();
      x = b.x + 32;
      y = b.y + 32;
    } catch {
      /* fall back to default position */
    }
  }
  mainWindow = new BrowserWindow({
    width: Math.min(1400, Math.max(1024, width - 80)),
    height: 900,
    minWidth: 900,
    minHeight: 600,
    x,
    y,
    autoHideMenuBar: true,
    title: 'Null',
    backgroundColor: '#101014',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  allWindows.add(mainWindow);
  const created = mainWindow;
  created.on('resize', relayout);
  created.on('closed', () => {
    allWindows.delete(created);
    if (getMainWindow() === created) mainWindow = null;
  });
  return mainWindow;
}
