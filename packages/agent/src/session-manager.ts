import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  AgentAction,
  AgentSession,
  ConsentDecision,
  ConsentState,
  PolicyConfig,
  VerifiedToken,
} from './types.js';

interface SessionManagerOptions {
  ttlSeconds: number;
  policy: PolicyConfig;
}

export class SessionManager {
  private readonly sessions = new Map<string, AgentSession>();
  private readonly usedTokens = new Set<string>();
  private readonly options: SessionManagerOptions;
  private readonly allowedActions: Set<AgentAction> = new Set(['open', 'fill', 'upload', 'click']);

  constructor(options: SessionManagerOptions) {
    this.options = options;
  }

  public beginSession(token: VerifiedToken, requestedUrl: string, actions: AgentAction[]): AgentSession {
    if (this.usedTokens.has(token.jti)) {
      throw Object.assign(new Error('Token already consumed'), { status: 401, code: 'INVALID_TOKEN' });
    }

    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = token.exp - now;
    if (remainingTtl <= 0 || remainingTtl > this.options.ttlSeconds) {
      throw Object.assign(new Error('Token expired'), { status: 401, code: 'INVALID_TOKEN' });
    }

    const url = this.parseUrl(requestedUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== token.domain.toLowerCase()) {
      throw Object.assign(new Error('Token domain mismatch'), { status: 403, code: 'POLICY_DENIED' });
    }

    if (!this.isDomainAllowed(hostname)) {
      throw Object.assign(new Error('Domain not allow-listed'), { status: 403, code: 'POLICY_DENIED' });
    }

    const sanitizedActions = this.sanitizeActions(actions);
    if (sanitizedActions.length === 0) {
      throw Object.assign(new Error('No actions permitted'), { status: 403, code: 'POLICY_DENIED' });
    }

    const session: AgentSession = {
      id: randomUUID(),
      userId: token.userId,
      domain: hostname,
      tokenId: token.jti,
      createdAt: new Date(),
      expiresAt: new Date(token.exp * 1000),
      consent: 'pending',
      actions: sanitizedActions,
      requestedUrl: url.toString(),
      eventBus: new EventEmitter(),
      rateWindow: { windowStart: Date.now(), count: 0 },
    };

    this.sessions.set(session.id, session);
    this.usedTokens.add(token.jti);
    return session;
  }

  public getSession(sessionId: string): AgentSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw Object.assign(new Error('Session not found'), { status: 404, code: 'SESSION_NOT_FOUND' });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      session.page?.close().catch(() => undefined);
      this.sessions.delete(sessionId);
      throw Object.assign(new Error('Session expired'), { status: 403, code: 'SESSION_EXPIRED' });
    }
    return session;
  }

  public requireConsent(session: AgentSession): void {
    if (session.consent === 'allowed') {
      return;
    }

    const denialMap: Record<ConsentState, { status: number; code: string }> = {
      pending: { status: 403, code: 'CONSENT_REQUIRED' },
      denied: { status: 403, code: 'CONSENT_DENIED' },
      cancelled: { status: 403, code: 'SESSION_CANCELLED' },
      allowed: { status: 200, code: 'OK' },
    };

    const detail = denialMap[session.consent];
    if (detail.status !== 200) {
      throw Object.assign(new Error('Consent is required'), detail);
    }
  }

  public ensureActionAllowed(session: AgentSession, action: AgentAction): void {
    if (!this.allowedActions.has(action)) {
      throw Object.assign(new Error('Unsupported action'), { status: 400, code: 'INVALID_ACTION' });
    }

    if (!session.actions.includes(action)) {
      throw Object.assign(new Error('Action not approved'), { status: 403, code: 'POLICY_DENIED' });
    }
  }

  public ensureUrlAllowed(session: AgentSession, url: string | undefined): string {
    if (!url) {
      return session.requestedUrl;
    }

    const parsed = this.parseUrl(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname !== session.domain.toLowerCase()) {
      throw Object.assign(new Error('Navigation outside approved domain'), { status: 403, code: 'POLICY_DENIED' });
    }

    if (!this.isDomainAllowed(hostname)) {
      throw Object.assign(new Error('Domain not allow-listed'), { status: 403, code: 'POLICY_DENIED' });
    }

    session.requestedUrl = parsed.toString();
    return session.requestedUrl;
  }

  public handleConsent(decision: ConsentDecision): ConsentState {
    const session = this.getSession(decision.sessionId);
    session.consent = decision.allow ? 'allowed' : 'denied';
    if (!decision.allow) {
      session.page?.close().catch(() => undefined);
      this.sessions.delete(decision.sessionId);
    }
    return session.consent;
  }

  public cancelSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.consent = 'cancelled';
    session.page?.close().catch(() => undefined);
    this.sessions.delete(sessionId);
  }

  public clearExpired(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) {
        session.page?.close().catch(() => undefined);
        this.sessions.delete(sessionId);
      }
    }
  }

  private isDomainAllowed(hostname: string): boolean {
    return this.options.policy.allowDomains.includes(hostname);
  }

  public trackAction(session: AgentSession): void {
    const now = Date.now();
    const windowMs = 60_000;
    if (now - session.rateWindow.windowStart > windowMs) {
      session.rateWindow = { windowStart: now, count: 0 };
    }

    session.rateWindow.count += 1;
    if (session.rateWindow.count > this.options.policy.rateLimits.maxActionsPerMinute) {
      throw Object.assign(new Error('Rate limit exceeded'), { status: 429, code: 'RATE_LIMITED' });
    }
  }

  private sanitizeActions(actions: AgentAction[]): AgentAction[] {
    const unique = new Set<AgentAction>();
    for (const action of actions) {
      if (this.allowedActions.has(action)) {
        unique.add(action);
      }
    }
    return Array.from(unique);
  }

  private parseUrl(url: string): URL {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol');
      }
      return parsed;
    } catch (error) {
      throw Object.assign(new Error('Invalid URL supplied'), { status: 400, code: 'INVALID_REQUEST', cause: error });
    }
  }
}
