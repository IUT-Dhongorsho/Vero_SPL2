import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerWindowIpc } from './ipc/window.ipc.js';
import { registerAuthIpc, handleAuthProtocolUrl } from './ipc/auth.ipc.js';
import { registerUpdaterIpc } from './ipc/updater.ipc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set App User Model ID for Windows toast notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.vero.app');
}

// Single instance lock to prevent duplicate desktop processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Register custom deep link protocol: vero://
if (!app.isDefaultProtocolClient('vero')) {
  app.setAsDefaultProtocolClient('vero');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Vero - Unified Collaboration Workspace',
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  registerWindowIpc(mainWindow);
  registerAuthIpc(mainWindow);
  registerUpdaterIpc();

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const deepLink = commandLine.find((arg) => arg.startsWith('vero://'));
    if (deepLink) {
      handleAuthProtocolUrl(mainWindow, deepLink);
    }
  }
});

app.on('open-url', (_event, url) => {
  if (mainWindow) {
    handleAuthProtocolUrl(mainWindow, url);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
