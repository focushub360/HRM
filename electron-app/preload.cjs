const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
    getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),
});
