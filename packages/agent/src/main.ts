import { app as electronApp } from 'electron';
import type { Server } from 'node:http';
import { createServer, lifecycle, sessionManager } from './server.js';
import { ConsentWindow } from './consent-window.js';

const consentWindow = new ConsentWindow();
let httpServer: Server | null = null;

async function startServer() {
  if (httpServer) {
    return;
  }
  const expressApp = createServer();
  httpServer = expressApp.listen(8765, '127.0.0.1', () => {
    console.log('GISTer Agent API listening on http://127.0.0.1:8765');
  });
}

electronApp.whenReady().then(async () => {
  await startServer();

  lifecycle.on('session:created', session => {
    consentWindow.present(session);
  });

  consentWindow.registerHandlers((sessionId, allow) => {
    try {
      sessionManager.handleConsent({ sessionId, allow });
    } catch (error) {
      console.error('Failed to handle consent decision', error);
    }
  });

  setInterval(() => {
    try {
      sessionManager.clearExpired();
    } catch (error) {
      console.error('Failed to clear expired sessions', error);
    }
  }, 30_000).unref();
});

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    electronApp.quit();
  }
});

electronApp.on('before-quit', () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
});
