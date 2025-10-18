import type { Response } from 'express';
import type { AgentEventPayload } from './types.js';

export function initEventStream(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

export function writeEvent(res: Response, event: AgentEventPayload): void {
  const payload = JSON.stringify(event);
  res.write(`data: ${payload}\n\n`);
}

export function closeStream(res: Response): void {
  res.write('event: end\n');
  res.write('data: {}\n\n');
  res.end();
}
