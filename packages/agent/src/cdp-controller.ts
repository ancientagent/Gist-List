import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import type { AgentSession, PolicyConfig } from './types.js';

interface ConnectOptions {
  chromeEndpoint?: string;
  headless?: boolean;
}

export class CdpController {
  private browser: Browser | null = null;
  private readonly policy: PolicyConfig;

  constructor(policy: PolicyConfig) {
    this.policy = policy;
  }

  public async connect(options: ConnectOptions = {}): Promise<void> {
    if (this.browser) {
      return;
    }

    const endpoint = options.chromeEndpoint || process.env.AGENT_CHROME_WS_ENDPOINT;
    if (endpoint) {
      this.browser = await puppeteer.connect({ browserWSEndpoint: endpoint });
      return;
    }

    this.browser = await puppeteer.launch({
      headless: options.headless ?? false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  public async ensurePage(session: AgentSession): Promise<Page> {
    if (!this.browser) {
      await this.connect();
    }

    if (!this.browser) {
      throw new Error('Unable to start browser');
    }

    if (session.page && !session.page.isClosed()) {
      return session.page;
    }

    const page = await this.browser.newPage();
    session.page = page;

    if (this.policy.navigation.sameOriginOnly) {
      await page.setRequestInterception(true);
      page.on('request', (req: HTTPRequest) => {
        const url = new URL(req.url());
        if (url.hostname !== new URL(session.requestedUrl).hostname) {
          req.abort('blockedbyclient');
        } else {
          req.continue();
        }
      });
    }

    return page;
  }

  public async open(session: AgentSession, url: string): Promise<void> {
    const page = await this.ensurePage(session);
    session.eventBus.emit('event', { type: 'OPENING', timestamp: Date.now() });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
    session.eventBus.emit('event', { type: 'OPENED_FORM', timestamp: Date.now(), data: { url: page.url(), title: await page.title() } });
  }

  public async fill(session: AgentSession, steps: Array<{ selector: string; text: string }>): Promise<void> {
    const page = await this.ensurePage(session);
    for (const step of steps) {
      await this.typeWithHumanDelays(page, step.selector, step.text);
    }
    session.eventBus.emit('event', { type: 'FILLED_FIELDS', timestamp: Date.now(), data: { count: steps.length } });
  }

  public async upload(session: AgentSession, selector: string, files: string[]): Promise<void> {
    const page = await this.ensurePage(session);
    const input = await page.waitForSelector(selector, { timeout: 30_000 });
    if (!input) {
      throw Object.assign(new Error('Selector not found'), { status: 422, code: 'BAD_SELECTOR' });
    }
    const normalized = this.normalizeUploadPaths(files);
    await input.uploadFile(...normalized);
    session.eventBus.emit('event', { type: 'UPLOADED_IMAGES', timestamp: Date.now(), data: { files: files.length } });
  }

  public async click(session: AgentSession, selector: string): Promise<void> {
    const page = await this.ensurePage(session);
    const element = await page.waitForSelector(selector, { timeout: 30_000 });
    if (!element) {
      throw Object.assign(new Error('Selector not found'), { status: 422, code: 'BAD_SELECTOR' });
    }
    await element.click({ delay: 50 });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120_000 }).catch(() => undefined);
    session.eventBus.emit('event', { type: 'SUBMITTED', timestamp: Date.now() });
    session.eventBus.emit('event', { type: 'PUBLISHED', timestamp: Date.now(), data: { url: page.url() } });
  }

  public async pageState(session: AgentSession): Promise<{ url: string; title: string }> {
    const page = await this.ensurePage(session);
    return { url: page.url(), title: await page.title() };
  }

  private async typeWithHumanDelays(page: Page, selector: string, text: string): Promise<void> {
    const field = await page.waitForSelector(selector, { timeout: 30_000 });
    if (!field) {
      throw Object.assign(new Error('Selector not found'), { status: 422, code: 'BAD_SELECTOR' });
    }
    await field.click({ clickCount: 3 });
    await field.press('Backspace');
    for (const char of text) {
      const delay = this.randomDelay();
      await field.type(char, { delay });
    }
  }

  private randomDelay(): number {
    const { minDelayMs, maxDelayMs } = this.policy.typing;
    return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  }

  private normalizeUploadPaths(files: string[]): string[] {
    return files.map(file => {
      if (file.startsWith('file://')) {
        try {
          return fileURLToPath(file);
        } catch (error) {
          console.warn('Failed to parse file:// path', file, error);
          return file;
        }
      }

      if (isAbsolute(file)) {
        return file;
      }

      return resolvePath(process.cwd(), file);
    });
  }
}
