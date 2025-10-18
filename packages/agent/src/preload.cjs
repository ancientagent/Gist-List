const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gisterAgent', {
  onSession: handler => ipcRenderer.on('agent-session', (_, payload) => handler(payload)),
  submitConsent: payload => ipcRenderer.invoke('agent-consent', payload),
});
