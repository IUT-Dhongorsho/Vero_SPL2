import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  auth: {
    openExternal: (url: string) => ipcRenderer.invoke('auth:open-external', url),
    onDeepLink: (callback: (url: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
      ipcRenderer.on('auth:deep-link', listener);
      return () => {
        ipcRenderer.removeListener('auth:deep-link', listener);
      };
    },
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
  },
  platform: process.platform,
});
