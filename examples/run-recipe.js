#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function loadSdk() {
  try {
    const module = await import('../packages/agent-sdk/dist/index.js');
    return module.default;
  } catch (error) {
    console.error('[GISTer] Unable to load SDK. Did you run "pnpm --filter @gister/agent-sdk build"?');
    throw error;
  }
}

function readRecipe(path) {
  const contents = readFileSync(path, 'utf-8');
  return JSON.parse(contents);
}

async function run() {
  const [recipePath] = process.argv.slice(2);
  if (!recipePath) {
    console.error('Usage: node examples/run-recipe.js <recipe.json>');
    process.exit(1);
  }

  const token = process.env.AGENT_SESSION_TOKEN;
  if (!token) {
    console.error('Set AGENT_SESSION_TOKEN with a freshly minted JWS before running.');
    process.exit(1);
  }

  const AgentClient = await loadSdk();
  const client = new AgentClient({ baseUrl: process.env.AGENT_BASE_URL });

  const absolutePath = resolve(process.cwd(), recipePath);
  const recipe = readRecipe(absolutePath);

  const actions = recipe.steps
    .map(step => step.type)
    .filter(type => ['open', 'fill', 'upload', 'click'].includes(type));

  if (!actions.includes('open')) {
    console.error('Recipe must include an initial open step.');
    process.exit(1);
  }

  const firstOpen = recipe.steps.find(step => step.type === 'open');
  const session = await client.startSession({
    token,
    url: firstOpen.url,
    actions,
  });

  console.log(`[GISTer] Session started: ${session.sessionId} (consent=${session.consent})`);
  if (session.consent !== 'allowed') {
    console.log('[GISTer] Waiting for user consent...');
  }

  const waiters = new Map();
  const abortController = new AbortController();

  client.stream(
    session.sessionId,
    event => {
      console.log(`[Event] ${event.type}`, event.data ? JSON.stringify(event.data) : '');
      if (waiters.has(event.type)) {
        const resolver = waiters.get(event.type);
        waiters.delete(event.type);
        resolver(event);
      }
    },
    abortController.signal,
  ).catch(error => {
    console.error('Event stream error:', error);
  });

  async function waitForEvent(type, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(type);
        reject(new Error(`Timed out waiting for ${type}`));
      }, timeoutMs);
      waiters.set(type, event => {
        clearTimeout(timer);
        resolve(event);
      });
    });
  }

  for (const step of recipe.steps) {
    switch (step.type) {
      case 'open':
        await client.open(session.sessionId, step.url);
        break;
      case 'fill':
        await client.fill(session.sessionId, step.items);
        break;
      case 'upload':
        await client.upload(session.sessionId, step.selector, step.files);
        break;
      case 'click':
        await client.click(session.sessionId, step.selector);
        break;
      case 'wait':
        await waitForEvent(step.event, step.timeoutMs);
        break;
      default:
        console.warn(`Skipping unsupported step type: ${step.type}`);
    }
  }

  console.log('[GISTer] Recipe complete. Closing stream.');
  abortController.abort();
}

run().catch(error => {
  console.error('[GISTer] Recipe failed:', error);
  process.exit(1);
});
