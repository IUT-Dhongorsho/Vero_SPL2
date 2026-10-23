import { ipcMain } from 'electron';

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:check', async () => {
    return {
      available: false,
      currentVersion: '0.1.0',
      message: 'App is up to date',
    };
  });
}
