import { ipcMain, shell, type BrowserWindow } from 'electron';

export function registerAuthIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('auth:open-external', async (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
    }
  });
}

export function handleAuthProtocolUrl(mainWindow: BrowserWindow, url: string): void {
  if (mainWindow && !mainWindow.isDestroyed() && url.startsWith('vero://')) {
    mainWindow.webContents.send('auth:deep-link', url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}
