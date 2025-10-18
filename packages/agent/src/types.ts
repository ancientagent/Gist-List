import { Page } from 'puppeteer-core';
import { EventEmitter } from 'node:events';

export type AgentEventType =
  | 'OPENING'
  | 'OPENED_FORM'
  | 'FILLED_FIELDS'
  | 'UPLOADED_IMAGES'
  | 'SUBMITTED'
  | 'PUBLISHED'
  | 'NEEDS_LOGIN'
  | 'CHALLENGE_DETECTED'
  | 'ERROR';

export interface AgentEventPayload {
  type: AgentEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type AgentAction = 'open' | 'fill' | 'upload' | 'click';

export interface SessionActions {
  actions: AgentAction[];
}

export type ConsentState = 'pending' | 'allowed' | 'denied' | 'cancelled';

export interface AgentSession {
  id: string;
  userId: string;
  domain: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
  consent: ConsentState;
  actions: SessionActions['actions'];
  requestedUrl: string;
  page?: Page;
  eventBus: EventEmitter;
  rateWindow: { windowStart: number; count: number };
}

export interface PolicyConfig {
  allowDomains: string[];
  typing: { minDelayMs: number; maxDelayMs: number };
  rateLimits: { maxActionsPerMinute: number };
  navigation: { sameOriginOnly: boolean };
}

export interface VerifiedToken {
  jti: string;
  userId: string;
  domain: string;
  exp: number;
}

export interface ConsentDecision {
  sessionId: string;
  allow: boolean;
}
