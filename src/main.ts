import { app, Menu, protocol } from 'electron';

protocol.registerSchemesAsPrivileged([
  { scheme: 'null', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);
import { getMainWindow } from './main/window-manager';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createMainWindow } from './main/window-manager';
import { registerNullProtocol, writeInternalPages } from './main/null-protocol';
import { registerIpc, setPreloadPath } from './main/ipc';
import { cleanupOnQuit } from './main/privacy-manager';
import { handleCertificateError } from './main/tab-manager';

app.on('certificate-error', (event, webContents, url, error, certificate, callback, isMainFrame) => {
  handleCertificateError(event, webContents, url, error, certificate, callback, isMainFrame);
});

if (started) {
  app.quit();
}

const PRELOAD_PATH = path.join(__dirname, 'preload.js');
setPreloadPath(PRELOAD_PATH);

function boot(): void {
  try {
    writeInternalPages();
  } catch {
    /* ignore */
  }
  registerNullProtocol();
  registerIpc(PRELOAD_PATH);
  const win = createMainWindow(PRELOAD_PATH);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  buildAppMenu();
}

function buildAppMenu(): void {
  const send = (channel: string): void => {
    getMainWindow()?.webContents.send(channel);
  };
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => send('shortcut:new-tab') },
        { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => send('shortcut:new-window') },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('shortcut:close-tab') },
        { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => send('shortcut:reopen-tab') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => send('shortcut:reload') },
        { label: 'Hard Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => send('shortcut:hard-reload') },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => send('shortcut:fullscreen') },
        { type: 'separator' },
        { label: 'Find in Page', accelerator: 'CmdOrCtrl+F', click: () => send('shortcut:find') },
        { label: 'Focus Address Bar', accelerator: 'CmdOrCtrl+L', click: () => send('shortcut:focus-address') },
        { label: 'Next Tab', accelerator: 'CmdOrCtrl+Tab', click: () => send('shortcut:next-tab') },
        { label: 'Previous Tab', accelerator: 'CmdOrCtrl+Shift+Tab', click: () => send('shortcut:prev-tab') },
      ],
    },
    {
      label: 'Privacy',
      submenu: [{ label: 'Clear Session Data', accelerator: 'CmdOrCtrl+Shift+Delete', click: () => send('shortcut:clear-data') }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('ready', boot);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void cleanupOnQuit().finally(() => app.exit(0));
  }
});

app.on('activate', () => {
  if (getMainWindow() === null) boot();
});

