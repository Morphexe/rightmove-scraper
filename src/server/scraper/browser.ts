import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { isHeadless, isProxyEnabled } from '../config/index.js';
import type { ProxyManager } from '../proxy/index.js';
import { log } from '../utils/logger.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private proxyManager: ProxyManager | null;
  private useProxy: boolean;

  constructor(proxyManager?: ProxyManager) {
    this.proxyManager = proxyManager || null;
    this.useProxy = isProxyEnabled() && !!proxyManager;
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private async createContext(): Promise<BrowserContext> {
    const contextOptions: Parameters<Browser['newContext']>[0] = {
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    };

    if (this.useProxy && this.proxyManager) {
      const proxyUrl = this.proxyManager.getProxyUrl();
      contextOptions.proxy = { server: proxyUrl };
    }

    const context = await this.browser!.newContext(contextOptions);

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { 0: { type: 'application/pdf', description: 'PDF Viewer', suffixes: 'pdf', enabledPlugin: true } },
          { 0: { type: 'application/x-google-chrome-pdf', description: 'Chrome PDF Viewer', suffixes: 'pdf', enabledPlugin: true } },
        ],
      });

      Object.defineProperty(navigator, 'languages', { get: () => ['en-GB', 'en-US', 'en'] });

      Object.defineProperty(window, 'chrome', { get: () => ({ app: { isInstalled: true }, runtime: {} }) });

      const originalQuery = navigator.permissions?.query;
      if (navigator.permissions) {
        Object.defineProperty(navigator.permissions, 'query', {
          value: (parameters: { name: string }) => {
            if (parameters.name === 'notifications') {
              return Promise.resolve({ state: 'prompt' });
            }
            return originalQuery ? originalQuery(parameters) : Promise.resolve({ state: 'denied' });
          },
        });
      }

      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });

      delete (window as { __rmbot?: boolean }).__rmbot;
      delete (window as { _rmbot?: boolean })._rmbot;
    });

    return context;
  }

  async launch(): Promise<void> {
    if (this.browser) {
      return;
    }

    const headless = isHeadless();

    if (this.useProxy && this.proxyManager) {
      const server = this.proxyManager.getCurrentServer();
      log.info(`Launching browser (headless: ${headless}) with proxy: ${server.hostname}`);
    } else {
      log.info(`Launching browser (headless: ${headless}) without proxy`);
    }

    this.browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    this.context = await this.createContext();
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      await this.launch();
    }
    return this.context!.newPage();
  }

  async rotateProxy(): Promise<void> {
    if (!this.useProxy || !this.proxyManager) {
      log.debug('Proxy rotation skipped - no proxy configured');
      return;
    }

    log.info('Rotating proxy...');

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.proxyManager.rotate();
    const server = this.proxyManager.getCurrentServer();
    log.info(`New proxy: ${server.hostname} (${server.country})`);

    this.context = await this.createContext();
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    log.info('Browser closed');
  }
}
