const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onUpdateMessage: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('update-message', subscription);
    return () => ipcRenderer.removeListener('update-message', subscription);
  },
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
});
