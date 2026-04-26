/**
 * Foreman — Browser Automation
 *
 * Gives Foreman the ability to navigate the web like a human.
 * Uses Playwright (headless Chromium) — AI driving a browser
 * looks like a normal user to detection systems.
 *
 * Capabilities:
 *   - Navigate to any URL
 *   - Fill forms, click buttons
 *   - Extract page content
 *   - Take screenshots
 *   - Execute JavaScript in page context
 *   - Handle authentication flows
 */

import { existsSync } from "fs";
import { Browser, BrowserContext, chromium, Page } from "playwright-core";

export class ForemanBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private headless: boolean;

  constructor(headless = true) {
    this.headless = headless;
  }

  /**
   * Launch browser instance
   */
  async launch(): Promise<void> {
    // Try to find Chromium from @playwright/browser-chromium or system Chrome
    const executablePath = this.findChromium();

    this.browser = await chromium.launch({
      headless: this.headless,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    this.context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    this.page = await this.context.newPage();
    console.log("  [Browser] Chromium launched");
  }

  /**
   * Navigate to URL and wait for load
   */
  async goto(url: string): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return this.page.url();
  }

  /**
   * Get visible text content of current page
   */
  async getText(): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");
    return this.page.innerText("body");
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");
    return this.page.title();
  }

  /**
   * Click an element by selector
   */
  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.click(selector, { timeout: 10000 });
  }

  /**
   * Type text into an input
   */
  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.fill(selector, text);
  }

  /**
   * Execute JavaScript in the page context
   */
  async evaluate<T>(script: string): Promise<T> {
    if (!this.page) throw new Error("Browser not launched");
    return this.page.evaluate(script) as Promise<T>;
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.screenshot({ path, fullPage: true });
  }

  /**
   * Wait for a selector to appear
   */
  async waitFor(selector: string, timeout = 10000): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    if (!this.page) throw new Error("Browser not launched");
    return this.page.url();
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * Find Chromium executable
   */
  private findChromium(): string | undefined {
    const candidates = [
      // @playwright/browser-chromium installs here
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      // System Chrome on Windows
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      // Edge (Chromium) on Windows
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];

    for (const path of candidates) {
      if (path && existsSync(path)) return path;
    }

    // Let Playwright find its own
    return undefined;
  }
}
