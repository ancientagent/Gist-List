import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { EventEmitter } from 'node:events';
import { loadPolicy } from './policy.js';
import { SessionManager } from './session-manager.js';
import { verifyToken } from './security.js';
import { CdpController } from './cdp-controller.js';
import { closeStream, initEventStream, writeEvent } from './events.js';
import type { AgentAction, AgentSession } from './types.js';

const policy = loadPolicy();
export const sessionManager = new SessionManager({ ttlSeconds: 120, policy });
const cdp = new CdpController(policy);
export const lifecycle = new EventEmitter();

async function withSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = (req.query.sessionId as string) || (req.body?.sessionId as string);
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const session = sessionManager.getSession(sessionId);
    (req as Request & { agentSession: AgentSession }).agentSession = session;
    return next();
  } catch (error: any) {
    return res.status(error.status || 404).json({ error: error.code || 'SESSION_NOT_FOUND' });
  }
}

function handleError(res: Response, error: any) {
  const status = error.status || 500;
  const code = error.code || 'AGENT_ERROR';
  if (status >= 500) {
    console.error('Agent error:', error);
  }
  res.status(status).json({ error: code });
}

export function createServer() {
  const app = express();
  app.locals.sessionManager = sessionManager;
  app.locals.events = lifecycle;

  app.use(express.json({ limit: '1mb' }));
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: false }));

  app.post('/v1/session/start', async (req, res) => {
    try {
      const { token, url, actions } = req.body as { token: string; url: string; actions: AgentAction[] };
      if (!token || !url || !Array.isArray(actions) || actions.length === 0) {
        return res.status(400).json({ error: 'INVALID_REQUEST' });
      }

      const verified = await verifyToken(token, {
        secret: process.env.AGENT_JWS_SECRET || '',
      });

      const session = sessionManager.beginSession(verified, url, actions || []);
      sessionManager.clearExpired();
      lifecycle.emit('session:created', session);

      res.json({ sessionId: session.id, consent: session.consent });
    } catch (error: any) {
      handleError(res, error);
    }
  });

  app.post('/v1/session/cancel', (req, res) => {
    try {
      const { sessionId } = req.body as { sessionId: string };
      if (!sessionId) {
        return res.status(400).json({ error: 'INVALID_REQUEST' });
      }
      sessionManager.cancelSession(sessionId);
      res.json({ ok: true });
    } catch (error: any) {
      handleError(res, error);
    }
  });

  app.post('/v1/browser/open', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    try {
      sessionManager.requireConsent(session);
      sessionManager.ensureActionAllowed(session, 'open');
      const targetUrl = sessionManager.ensureUrlAllowed(session, req.body?.url || session.requestedUrl);
      sessionManager.trackAction(session);
      await cdp.open(session, targetUrl);
      res.json({ ok: true });
    } catch (error: any) {
      session.eventBus.emit('event', {
        type: 'ERROR',
        timestamp: Date.now(),
        data: { code: error.code || 'AGENT_ERROR' },
      });
      handleError(res, error);
    }
  });

  app.post('/v1/dom/fill', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    try {
      sessionManager.requireConsent(session);
      sessionManager.ensureActionAllowed(session, 'fill');
      sessionManager.trackAction(session);
      const steps = req.body?.steps || [];
      await cdp.fill(session, steps);
      res.json({ ok: true });
    } catch (error: any) {
      session.eventBus.emit('event', {
        type: 'ERROR',
        timestamp: Date.now(),
        data: { code: error.code || 'AGENT_ERROR' },
      });
      handleError(res, error);
    }
  });

  app.post('/v1/dom/upload', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    try {
      sessionManager.requireConsent(session);
      sessionManager.ensureActionAllowed(session, 'upload');
      sessionManager.trackAction(session);
      const { selector, files } = req.body as { selector: string; files: string[] };
      if (!selector || !Array.isArray(files)) {
        return res.status(400).json({ error: 'INVALID_REQUEST' });
      }
      await cdp.upload(session, selector, files);
      res.json({ ok: true });
    } catch (error: any) {
      session.eventBus.emit('event', {
        type: 'ERROR',
        timestamp: Date.now(),
        data: { code: error.code || 'AGENT_ERROR' },
      });
      handleError(res, error);
    }
  });

  app.post('/v1/dom/click', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    try {
      sessionManager.requireConsent(session);
      sessionManager.ensureActionAllowed(session, 'click');
      sessionManager.trackAction(session);
      const selector = req.body?.selector;
      if (!selector) {
        return res.status(400).json({ error: 'INVALID_REQUEST' });
      }
      await cdp.click(session, selector);
      res.json({ ok: true });
    } catch (error: any) {
      session.eventBus.emit('event', {
        type: 'ERROR',
        timestamp: Date.now(),
        data: { code: error.code || 'AGENT_ERROR' },
      });
      handleError(res, error);
    }
  });

  app.get('/v1/page/state', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    try {
      const state = await cdp.pageState(session);
      res.json(state);
    } catch (error: any) {
      session.eventBus.emit('event', {
        type: 'ERROR',
        timestamp: Date.now(),
        data: { code: error.code || 'AGENT_ERROR' },
      });
      handleError(res, error);
    }
  });

  app.get('/v1/events/stream', withSession, async (req, res) => {
    const session = (req as Request & { agentSession: AgentSession }).agentSession;
    initEventStream(res);

    const listener = (payload: { type: string; timestamp: number; data?: Record<string, unknown> }) => {
      writeEvent(res, payload);
    };

    session.eventBus.on('event', listener);

    req.on('close', () => {
      session.eventBus.off('event', listener);
      closeStream(res);
    });
  });

  return app;
}
