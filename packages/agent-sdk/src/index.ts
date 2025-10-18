import fetch, { RequestInit, Response } from 'node-fetch';
import { ZodError, z } from 'zod';

export type AgentAction = 'open' | 'fill' | 'upload' | 'click';

export interface StartSessionRequest {
  token: string;
  url: string;
  actions: AgentAction[];
}

export interface StartSessionResponse {
  sessionId: string;
  consent: 'pending' | 'allowed' | 'denied';
}

export interface FillStep {
  selector: string;
  text: string;
}

export interface AgentEvent<T = Record<string, unknown>> {
  type:
    | 'OPENING'
    | 'OPENED_FORM'
    | 'FILLED_FIELDS'
    | 'UPLOADED_IMAGES'
    | 'SUBMITTED'
    | 'PUBLISHED'
    | 'NEEDS_LOGIN'
    | 'CHALLENGE_DETECTED'
    | 'ERROR';
  timestamp: number;
  data?: T;
}

export interface AgentClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

const defaultOptions: Required<Pick<AgentClientOptions, 'baseUrl' | 'timeoutMs'>> = {
  baseUrl: 'http://127.0.0.1:8765',
  timeoutMs: 120_000,
};

const jsonSchema = z.object({ error: z.string() }).partial();

export class AgentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: AgentClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? defaultOptions.baseUrl;
    this.timeoutMs = options.timeoutMs ?? defaultOptions.timeoutMs;
  }

  public async startSession(payload: StartSessionRequest): Promise<StartSessionResponse> {
    const response = await this.request('/v1/session/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as StartSessionResponse;
    return data;
  }

  public async cancel(sessionId: string): Promise<void> {
    await this.request('/v1/session/cancel', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  public async open(sessionId: string, url: string): Promise<void> {
    await this.request('/v1/browser/open', {
      method: 'POST',
      body: JSON.stringify({ sessionId, url }),
    });
  }

  public async fill(sessionId: string, steps: FillStep[]): Promise<void> {
    await this.request('/v1/dom/fill', {
      method: 'POST',
      body: JSON.stringify({ sessionId, steps }),
    });
  }

  public async upload(sessionId: string, selector: string, files: string[]): Promise<void> {
    await this.request('/v1/dom/upload', {
      method: 'POST',
      body: JSON.stringify({ sessionId, selector, files }),
    });
  }

  public async click(sessionId: string, selector: string): Promise<void> {
    await this.request('/v1/dom/click', {
      method: 'POST',
      body: JSON.stringify({ sessionId, selector }),
    });
  }

  public async state(sessionId: string): Promise<{ url: string; title: string }> {
    const response = await this.request(`/v1/page/state?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
    });
    return (await response.json()) as { url: string; title: string };
  }

  public async stream(
    sessionId: string,
    onEvent: (event: AgentEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await this.request(`/v1/events/stream?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      signal,
    });

    if (!response.body) {
      throw new Error('Missing event stream body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (chunk.startsWith('data:')) {
          const data = chunk.replace(/^data:\s*/, '');
          try {
            const payload = JSON.parse(data) as AgentEvent;
            onEvent(payload);
          } catch (error) {
            console.warn('Failed to parse SSE event', error);
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = new URL(path, this.baseUrl).toString();
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };

    const controller = new AbortController();
    const usingExternalSignal = Boolean(init.signal);
    const signal = usingExternalSignal ? init.signal! : controller.signal;
    const timeout = setTimeout(() => {
      if (!usingExternalSignal) {
        controller.abort();
      }
    }, this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal,
      });

      if (!response.ok) {
        let message = `Agent request failed (${response.status})`;
        try {
          const parsed = jsonSchema.parse(await response.json());
          if (parsed.error) {
            message = parsed.error;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            // ignore parse errors
          }
        }
        const err = new Error(message);
        (err as any).status = response.status;
        throw err;
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const defaultClient = new AgentClient();
export default AgentClient;
