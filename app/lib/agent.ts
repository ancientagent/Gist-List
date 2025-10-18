import { prisma } from '@/lib/db';
import AgentClient, { type AgentEvent, type AgentAction, type FillStep } from '@gister/agent-sdk';
import { randomUUID, createSecretKey } from 'node:crypto';
import { SignJWT } from 'jose';

const TTL_SECONDS = Number(process.env.AGENT_SESSION_TTL ?? '120');
const agentBaseUrl = process.env.AGENT_BASE_URL ?? 'http://127.0.0.1:8765';
const agentTimeout = Number(process.env.AGENT_HTTP_TIMEOUT ?? '120000');
const formOnlyDomains = (process.env.AGENT_FORM_ONLY_DOMAINS ?? 'poshmark.com,www.poshmark.com,mercari.com,www.mercari.com')
  .split(',')
  .map(domain => domain.trim().toLowerCase())
  .filter(Boolean);
const apiIntegratedDomains = (process.env.AGENT_API_DOMAINS ?? 'ebay.com,www.ebay.com,etsy.com,www.etsy.com,reverb.com,www.reverb.com')
  .split(',')
  .map(domain => domain.trim().toLowerCase())
  .filter(Boolean);

const client = new AgentClient({ baseUrl: agentBaseUrl, timeoutMs: agentTimeout });

export type PostingStrategy = 'agent' | 'api' | 'extension';

export function resolvePostingStrategy(domain: string | null | undefined): PostingStrategy {
  if (process.env.AGENT_MODE !== '1') {
    return 'extension';
  }
  const normalized = domain?.toLowerCase() ?? '';
  if (!normalized) {
    return 'extension';
  }
  if (apiIntegratedDomains.includes(normalized)) {
    return 'api';
  }
  if (formOnlyDomains.includes(normalized)) {
    return 'agent';
  }
  return 'extension';
}

export interface AgentDeviceInput {
  id?: string;
  os: string;
  name: string;
  healthySites?: string[];
  jsonPolicy?: Record<string, unknown>;
}

export async function registerAgentDevice(userId: string, input: AgentDeviceInput) {
  if (input.id) {
    const existing = await prisma.agentDevice.findFirst({ where: { id: input.id, userId } });
    if (existing) {
      return prisma.agentDevice.update({
        where: { id: existing.id },
        data: {
          os: input.os,
          name: input.name,
          healthySites: input.healthySites ?? existing.healthySites,
          jsonPolicy: input.jsonPolicy ?? existing.jsonPolicy,
          lastSeenAt: new Date(),
        },
      });
    }
  }

  return prisma.agentDevice.create({
    data: {
      userId,
      os: input.os,
      name: input.name,
      healthySites: input.healthySites ?? [],
      jsonPolicy: input.jsonPolicy ?? null,
      lastSeenAt: new Date(),
    },
  });
}

export interface MintSessionInput {
  userId: string;
  deviceId: string;
  domain: string;
  actions: AgentAction[];
}

export async function mintAgentSession(input: MintSessionInput) {
  const secret = process.env.AGENT_JWS_SECRET;
  if (!secret) {
    throw new Error('AGENT_JWS_SECRET is not configured');
  }

  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  const key = createSecretKey(Buffer.from(secret, 'utf-8'));
  const normalizedDomain = input.domain.toLowerCase();
  const allowed = new Set<AgentAction>(['open', 'fill', 'upload', 'click']);
  const uniqueActions = Array.from(new Set(input.actions)).filter(action => allowed.has(action));
  if (uniqueActions.length === 0) {
    throw new Error('No valid agent actions requested');
  }

  const token = await new SignJWT({ domain: normalizedDomain })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key);

  const record = await prisma.agentSession.create({
    data: {
      userId: input.userId,
      deviceId: input.deviceId,
      token,
      domain: normalizedDomain,
      actions: uniqueActions,
      expiresAt,
    },
  });

  return { token, expiresAt, record };
}

export type AgentJobStep =
  | { type: 'open'; url: string }
  | { type: 'fill'; items: FillStep[] }
  | { type: 'upload'; selector: string; files: string[] }
  | { type: 'click'; selector: string }
  | { type: 'wait'; event: AgentEvent['type']; timeoutMs?: number };

class EventWaiter {
  private readonly waiters = new Map<AgentEvent['type'], { resolve: (value: AgentEvent) => void; timeout: NodeJS.Timeout }>();
  private readonly controller = new AbortController();

  constructor(private readonly sessionId: string) {}

  public async start() {
    await client.stream(
      this.sessionId,
      event => {
        if (this.waiters.has(event.type)) {
          const entry = this.waiters.get(event.type)!;
          clearTimeout(entry.timeout);
          entry.resolve(event);
          this.waiters.delete(event.type);
        }
      },
      this.controller.signal,
    );
  }

  public waitFor(eventType: AgentEvent['type'], timeoutMs = 15000) {
    return new Promise<AgentEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(eventType);
        reject(new Error(`Timed out waiting for ${eventType}`));
      }, timeoutMs);
      this.waiters.set(eventType, { resolve, timeout });
    });
  }

  public close() {
    this.controller.abort();
    for (const entry of this.waiters.values()) {
      clearTimeout(entry.timeout);
    }
    this.waiters.clear();
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withConsentRetry<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      if (error?.message === 'CONSENT_REQUIRED' && attempt < maxAttempts) {
        await sleep(1500);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Consent not granted in time');
}

export interface RunAgentJobInput {
  sessionId: string;
  steps: AgentJobStep[];
}

export async function runAgentJob({ sessionId, steps }: RunAgentJobInput) {
  const waiter = new EventWaiter(sessionId);
  void waiter.start().catch(error => {
    console.error('Agent event stream error', error);
  });

  try {
    for (const step of steps) {
      switch (step.type) {
        case 'open':
          await withConsentRetry(() => client.open(sessionId, step.url));
          break;
        case 'fill':
          await withConsentRetry(() => client.fill(sessionId, step.items));
          break;
        case 'upload':
          await withConsentRetry(() => client.upload(sessionId, step.selector, step.files));
          break;
        case 'click':
          await withConsentRetry(() => client.click(sessionId, step.selector));
          break;
        case 'wait':
          await waiter.waitFor(step.event, step.timeoutMs);
          break;
        default:
          console.warn(`[Agent] Unsupported step`, step);
      }
    }
  } finally {
    waiter.close();
  }
}

export async function markConsentState(sessionId: string, state: 'allowed' | 'denied' | 'pending') {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: { consentState: state },
  });
}

export async function linkRemoteSession(recordId: string, remoteSessionId: string) {
  await prisma.agentSession.update({
    where: { id: recordId },
    data: { agentSessionId: remoteSessionId },
  });
}

export function getAgentClient() {
  return client;
}
