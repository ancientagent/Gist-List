import { BrowserWindow, ipcMain } from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentSession } from './types.js';

export class ConsentWindow {
  private window: BrowserWindow | null = null;
  private readonly baseDir = dirname(fileURLToPath(new URL('.', import.meta.url)));

  public present(session: AgentSession): void {
    if (this.window) {
      this.window.close();
    }

    this.window = new BrowserWindow({
      width: 420,
      height: 540,
      resizable: false,
      title: 'GISTer Agent Consent',
      webPreferences: {
        preload: resolve(this.baseDir, 'preload.cjs'),
        contextIsolation: true,
      },
    });

    this.window.removeMenu?.();
    this.window.on('closed', () => {
      this.window = null;
    });

    this.window.loadFile(resolve(this.baseDir, '../static/consent.html'));

    setImmediate(() => {
      this.window?.webContents.send('agent-session', {
        id: session.id,
        domain: session.domain,
        url: session.requestedUrl,
        actions: session.actions,
      });
    });
  }

  public registerHandlers(onDecision: (sessionId: string, allow: boolean) => void): void {
    ipcMain.handle('agent-consent', (_, payload: { sessionId: string; allow: boolean }) => {
      onDecision(payload.sessionId, payload.allow);
    });
  }
}
