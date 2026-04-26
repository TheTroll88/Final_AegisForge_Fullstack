/**
 * moove_referral.ts — Moove.xyz Referral Signup Bot
 *
 * Registers fresh EVM wallets on moove.xyz through the thetroll referral link.
 * Uses Playwright + injected window.ethereum provider to simulate MetaMask.
 * Wallet signs SIWE message automatically — no human interaction needed.
 *
 * Usage:
 *   npx tsx moove_referral.ts           # Register 5 wallets
 *   npx tsx moove_referral.ts 20        # Register 20 wallets
 */

import { ethers } from "ethers";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BrowserContext, chromium, Page } from "playwright-core";

const REFERRAL_URL = "https://moove.xyz/@thetroll/refer";
const SIGNUP_URL   = "https://moove.xyz";
const WALLETS_FILE = join(import.meta.dirname || __dirname, "moove_wallets.json");
const BATCH_SIZE   = parseInt(process.argv[2] || "5", 10);

interface SavedWallet {
  address: string;
  privateKey: string;
  handle: string;
  registeredAt: string;
  status: "success" | "failed" | "pending";
  error?: string;
}

function loadWallets(): SavedWallet[] {
  if (!existsSync(WALLETS_FILE)) return [];
  return JSON.parse(readFileSync(WALLETS_FILE, "utf-8"));
}

function saveWallets(wallets: SavedWallet[]): void {
  writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
}

function generateHandle(index: number): string {
  const ts = Date.now().toString(36).slice(-4);
  return `troll_${ts}_${String(index).padStart(3, "0")}`;
}

/**
 * Build the injected provider script for the page.
 * Called with page.addInitScript — runs in browser context before any page JS.
 */
function buildProviderScript(address: string, chainId: number): string {
  return `
  (function() {
    let _signerCallback = null;

    window.__mooveSignRequest = null;
    window.__mooveSignResult = null;

    const provider = {
      isMetaMask: true,
      isBraveWallet: false,
      selectedAddress: '${address}',
      chainId: '0x${chainId.toString(16)}',
      networkVersion: '${chainId}',

      request: function(args) {
        return new Promise((resolve, reject) => {
          const { method, params } = args;

          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            resolve(['${address}']);
            return;
          }

          if (method === 'eth_chainId') {
            resolve('0x${chainId.toString(16)}');
            return;
          }

          if (method === 'net_version') {
            resolve('${chainId}');
            return;
          }

          if (method === 'personal_sign' || method === 'eth_sign') {
            // params[0] = message (hex or utf8), params[1] = address
            const rawMsg = params[0];
            window.__mooveSignRequest = { method, message: rawMsg, address: params[1] };

            // Polling wait for result from Node bridge
            const poll = setInterval(() => {
              if (window.__mooveSignResult !== null) {
                clearInterval(poll);
                const result = window.__mooveSignResult;
                window.__mooveSignResult = null;
                window.__mooveSignRequest = null;
                if (result.error) {
                  reject(new Error(result.error));
                } else {
                  resolve(result.signature);
                }
              }
            }, 50);
            return;
          }

          if (method === 'wallet_switchEthereumChain') {
            resolve(null);
            return;
          }

          if (method === 'eth_getBalance') {
            resolve('0x56BC75E2D63100000'); // 100 ETH
            return;
          }

          if (method === 'eth_sendTransaction') {
            reject(new Error('Transactions not supported in bot mode'));
            return;
          }

          console.warn('[FakeMetaMask] Unhandled method:', method);
          resolve(null);
        });
      },

      on: function(event, cb) {
        // No-op for events
      },

      removeListener: function() {},
      enable: function() {
        return this.request({ method: 'eth_requestAccounts' });
      },
    };

    // Override window.ethereum
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: true,
      configurable: true,
    });

    // Also set window.web3 for older dapps
    window.web3 = { currentProvider: provider };

    console.log('[FakeMetaMask] Injected. Address: ${address}');
  })();
  `;
}

async function signMessage(privateKey: string, message: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  // moove.xyz uses personal_sign which passes hex-encoded UTF8
  let decoded: string;
  if (message.startsWith("0x")) {
    try {
      decoded = ethers.toUtf8String(message);
    } catch {
      decoded = message;
    }
  } else {
    decoded = message;
  }
  return wallet.signMessage(decoded);
}

async function registerWallet(
  context: BrowserContext,
  wallet: ethers.HDNodeWallet,
  handle: string,
  index: number
): Promise<{ success: boolean; error?: string }> {
  const page = await context.newPage();

  // Intercept auth-related requests to understand SIWE flow
  const capturedRequests: { method: string; url: string; body?: string }[] = [];
  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("auth") || u.includes("nonce") || u.includes("siwe") || u.includes("verify") || u.includes("user") || u.includes("profile")) {
      capturedRequests.push({ method: req.method(), url: u, body: req.postData() || undefined });
    }
  });

  try {
    // Inject fake MetaMask before page loads
    await page.addInitScript(buildProviderScript(wallet.address, 1));

    // Always go directly to /profile — cleaner flow, no tutorial overlay
    const targetUrl = SIGNUP_URL + "/profile";
    console.log(`  [${index + 1}] Navigating → ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait for React hydration
    await page.waitForTimeout(3000);

    // Dismiss any tutorial overlays
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);

    // Try to directly trigger wallet connection via JS instead of UI
    // This bypasses the wallet selector modal entirely
    const directConnect = await page.evaluate(async () => {
      try {
        if (!(window as any).ethereum) return { error: "No ethereum provider" };
        // Directly call eth_requestAccounts — this is what Connect wallet does
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        return { accounts };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    console.log(`  [${index + 1}] Direct connect result: ${JSON.stringify(directConnect)}`);

    await page.waitForTimeout(2000);

    // After direct connect, sign the SIWE if the app noticed the connected wallet
    const signed = await handleSigningLoop(page, wallet.privateKey, index, 15_000);

    if (!signed) {
      // Try clicking the UI button and selecting MetaMask as fallback
      console.log(`  [${index + 1}] No SIWE from direct connect — trying UI flow`);

      const connectSelectors = [
        'button:has-text("Connect wallet")',
        'button:has-text("Connect")',
        '[data-testid="connect-wallet"]',
      ];

      for (const sel of connectSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click({ force: true });
          console.log(`  [${index + 1}] Clicked connect UI (${sel})`);
          break;
        }
      }

      await page.waitForTimeout(2000);

      // Force-click MetaMask in modal
      const walletClicked = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("button, span, div, li, a"));
        const mm = els.find((el) => el.textContent?.trim().includes("MetaMask"));
        if (mm) {
          (mm as HTMLElement).click();
          return true;
        }
        return false;
      });
      console.log(`  [${index + 1}] MetaMask clicked via JS: ${walletClicked}`);

      await page.waitForTimeout(2000);

      // Try SIWE again
      await handleSigningLoop(page, wallet.privateKey, index, 15_000);
    }

    // Dump captured network requests for debugging
    if (capturedRequests.length > 0) {
      console.log(`  [${index + 1}] Network (auth): ${capturedRequests.map(r => `${r.method} ${r.url.slice(0, 80)}`).join(" | ")}`);
    }

    // Check if wallet connected by looking at page state
    await page.waitForTimeout(1000);
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        ethereum: !!(window as any).ethereum,
        accounts: (window as any).__connectedAccounts || null,
      };
    });
    console.log(`  [${index + 1}] State: ${JSON.stringify(pageState)}`);

    // Look for handle input and fill it
    const handleFilled = await page.evaluate(async (h: string) => {
      const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
      const handleInput = inputs.find(
        (el) => el.placeholder?.toLowerCase().includes("handle") ||
                el.name?.toLowerCase().includes("handle") ||
                el.id?.toLowerCase().includes("handle")
      );
      if (handleInput) {
        handleInput.value = h;
        handleInput.dispatchEvent(new Event("input", { bubbles: true }));
        handleInput.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    }, handle);

    if (handleFilled) {
      console.log(`  [${index + 1}] Handle filled via JS: ${handle}`);
      await page.waitForTimeout(1500);

      // Click submit
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
        const submit = btns.find((b) => /create|get started|submit|continue/i.test(b.textContent || ""));
        if (submit) submit.click();
      });
      await page.waitForTimeout(3000);
    }

    // Final state check
    const url = page.url();
    const bodyText = await page.innerText("body").catch(() => "");
    const lowerBody = bodyText.toLowerCase();
    const success =
      url.includes("/settings") ||
      url.includes("/dashboard") ||
      lowerBody.includes("edit profile") ||
      lowerBody.includes("your profile") ||
      lowerBody.includes("wallet address") ||
      lowerBody.includes(handle.toLowerCase());

    if (success) {
      console.log(`  [${index + 1}] ✓ Registered: ${handle}`);
    } else {
      const snippet = bodyText.slice(0, 300).replace(/\n+/g, " ");
      console.log(`  [${index + 1}] ? Result unclear. Body: ${snippet}`);
    }

    return { success };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Poll for window.__mooveSignRequest, sign it via Node bridge, inject result back.
 */
async function handleSigningLoop(
  page: Page,
  privateKey: string,
  index: number,
  timeoutMs = 20_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const signReq = await page.evaluate(() => (window as any).__mooveSignRequest).catch(() => null);

    if (signReq) {
      console.log(`  [${index + 1}] Signing SIWE message (method: ${signReq.method})`);
      try {
        const signature = await signMessage(privateKey, signReq.message);
        await page.evaluate((sig: string) => {
          (window as any).__mooveSignResult = { signature };
        }, signature);
        console.log(`  [${index + 1}] Signed ✓`);
        return true;
      } catch (err: any) {
        await page.evaluate((errMsg: string) => {
          (window as any).__mooveSignResult = { error: errMsg };
        }, err.message);
        return false;
      }
    }

    await page.waitForTimeout(200);
  }

  return false;
}

async function launchBrowser(executablePath: string | undefined) {
  return chromium.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  const existing = loadWallets();
  const successCount = existing.filter((w) => w.status === "success").length;
  console.log(`\n[MooveReferral] Starting — ${BATCH_SIZE} new registrations`);
  console.log(`[MooveReferral] Referral: ${REFERRAL_URL}`);
  console.log(`[MooveReferral] Already registered: ${successCount}`);
  console.log();

  const executablePath = findChromium();
  let browser = await launchBrowser(executablePath);

  const results: SavedWallet[] = [...existing];

  for (let i = 0; i < BATCH_SIZE; i++) {
    const evmWallet = ethers.Wallet.createRandom();
    const handle = generateHandle(existing.length + i);

    let context: BrowserContext | null = null;
    let success = false;
    let error: string | undefined;

    try {
      // First, visit the referral URL in a quick context to set referral cookies
      // then carry those cookies forward to the profile page
      context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1920, height: 1080 },
        locale: "en-US",
      });

      // Stage 1: visit referral URL (no wallet injection needed — just cookies)
      const refPage = await context.newPage();
      try {
        await refPage.goto(REFERRAL_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await refPage.waitForTimeout(2000);
        console.log(`  [${i + 1}] Referral cookie set → now registering`);
      } catch {
        console.log(`  [${i + 1}] Referral page timed out (cookies may not be set)`);
      } finally {
        await refPage.close().catch(() => {});
      }

      const result = await registerWallet(context, evmWallet, handle, i);
      success = result.success;
      error = result.error;
    } catch (err: any) {
      error = err.message;
      // Browser may have crashed — relaunch
      if (err.message?.includes("closed") || err.message?.includes("Target")) {
        console.log(`  [${i + 1}] Browser crashed — relaunching`);
        await browser.close().catch(() => {});
        browser = await launchBrowser(executablePath);
      }
    } finally {
      await context?.close().catch(() => {});
    }

    const entry: SavedWallet = {
      address: evmWallet.address,
      privateKey: evmWallet.privateKey,
      handle,
      registeredAt: new Date().toISOString(),
      status: success ? "success" : "failed",
      ...(error ? { error } : {}),
    };

    results.push(entry);
    saveWallets(results);

    if (!success) {
      console.log(`  [${i + 1}] ✗ Failed: ${error}`);
    }

    // Delay between registrations to avoid rate limiting
    if (i < BATCH_SIZE - 1) await new Promise((r) => setTimeout(r, 3000));
  }

  await browser.close().catch(() => {});

  const newSuccess = results.filter((w) => w.status === "success").length;
  const newFailed = results.filter((w) => w.status === "failed").length;
  console.log();
  console.log(`[MooveReferral] Done.`);
  console.log(`[MooveReferral] Total registered: ${newSuccess} | Failed: ${newFailed}`);
  console.log(`[MooveReferral] Wallets saved to moove_wallets.json`);
  console.log();
}

function findChromium(): string | undefined {
  const candidates = [
    join(import.meta.dirname || __dirname, "node_modules", "@playwright", "browser-chromium", ".local-chromium", "linux-1169", "chrome-linux", "chrome"),
    join(import.meta.dirname || __dirname, "node_modules", "@playwright", "browser-chromium", ".local-chromium", "win64-1169", "chrome-win", "chrome.exe"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env.LOCALAPPDATA || "", "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
  ];
  return candidates.find(existsSync);
}

main().catch(console.error);
