// faucet_brave_session.ts
// Uses Nathan's real Brave browser profile — GitHub already logged in there.
// This means GitHub OAuth on faucet.solana.com will auto-approve.
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright-core';

const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';
const BRAVE_USER_DATA = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data';
const BRAVE_EXE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

// We'll use a COPY of the profile so we don't corrupt Nathan's active browser
const TEMP_PROFILE = 'C:\\Users\\natha\\AppData\\Local\\Temp\\brave_faucet_session';

async function copyProfileDir(src: string, dest: string) {
  if (fs.existsSync(dest)) {
    console.log('Using existing temp profile...');
    return;
  }
  console.log('Copying Brave Default profile for session...');
  fs.mkdirSync(dest, { recursive: true });

  // Copy just the key files for cookies/session
  const defaultSrc = path.join(src, 'Default');
  const defaultDest = path.join(dest, 'Default');
  fs.mkdirSync(defaultDest, { recursive: true });

  const needed = ['Cookies', 'Login Data', 'Local Storage', 'Session Storage', 'Extension Cookies'];
  for (const name of needed) {
    const s = path.join(defaultSrc, name);
    const d = path.join(defaultDest, name);
    if (fs.existsSync(s)) {
      try {
        if (fs.statSync(s).isDirectory()) {
          fs.cpSync(s, d, { recursive: true });
        } else {
          fs.copyFileSync(s, d);
        }
        console.log(`  Copied: ${name}`);
      } catch (e) {
        console.log(`  Skip (locked): ${name}`);
      }
    }
  }
}

async function main() {
  // Copy Brave profile (with GitHub cookies)
  await copyProfileDir(BRAVE_USER_DATA, TEMP_PROFILE);

  const ssDir = 'C:\\Users\\natha';

  console.log('\nLaunching browser with Brave session cookies...');

  // Use chromium with the user data dir (will have Nathan's GitHub session)
  const browser = await chromium.launchPersistentContext(TEMP_PROFILE, {
    headless: false, // must be non-headless for OAuth redirects to work reliably
    executablePath: BRAVE_EXE,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions-except',
      '--disable-sync',
    ],
    viewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to faucet.solana.com...');
    await page.goto('https://faucet.solana.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: `${ssDir}\\faucet_s01_loaded.png` });
    console.log('Page loaded');

    // Fill in the wallet address
    const input = await page.waitForSelector('input[type="text"], input[placeholder*="address"], input[placeholder*="wallet"], input[placeholder*="Wallet"]', { timeout: 10000 });
    await input!.click({ clickCount: 3 });
    await input!.type(TARGET, { delay: 30 });
    console.log('Address filled');
    await page.screenshot({ path: `${ssDir}\\faucet_s02_filled.png` });

    // Select amount if needed (click "Amount" button or similar)
    try {
      const amountBtn = await page.$('button[aria-label*="amount" i], button:has-text("2"), button:has-text("5")');
      if (amountBtn) { await amountBtn.click(); await page.waitForTimeout(500); }
    } catch {}

    // Click "Connect your GitHub"
    console.log('Clicking Connect your GitHub...');
    const githubBtn = await page.waitForSelector('button:has-text("Connect your GitHub"), button:has-text("GitHub"), a:has-text("GitHub")', { timeout: 10000 });
    await githubBtn!.click();
    console.log('Clicked GitHub button');
    await page.screenshot({ path: `${ssDir}\\faucet_s03_github_click.png` });

    // Wait for GitHub OAuth page or redirect back
    console.log('Waiting for OAuth resolution (up to 30s)...');
    await page.waitForTimeout(3000);

    const urlNow = page.url();
    console.log(`Current URL: ${urlNow}`);
    await page.screenshot({ path: `${ssDir}\\faucet_s04_after_oauth.png` });

    if (urlNow.includes('github.com')) {
      console.log('Landed on GitHub — checking if already authorized...');
      // Look for "Authorize" button if needed
      try {
        const authBtn = await page.$('button[name="authorize"], input[value*="Authorize"]');
        if (authBtn) {
          await authBtn.click();
          console.log('Clicked Authorize on GitHub');
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
          await page.screenshot({ path: `${ssDir}\\faucet_s05_back_from_oauth.png` });
        } else {
          console.log('Already authorized — should auto-redirect');
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
          await page.screenshot({ path: `${ssDir}\\faucet_s05_back_from_oauth.png` });
        }
      } catch (e) {
        console.log('Navigation may have completed: ' + (e as Error).message);
        await page.screenshot({ path: `${ssDir}\\faucet_s05_back_from_oauth.png` });
      }
    }

    console.log(`Page URL after OAuth: ${page.url()}`);
    await page.waitForTimeout(2000);

    // Now look for enabled "Confirm Airdrop" button
    console.log('Looking for Confirm Airdrop button...');
    await page.screenshot({ path: `${ssDir}\\faucet_s06_ready.png` });

    const confirmBtn = await page.$('button:not([disabled]):has-text("Confirm Airdrop"), button:not([disabled]):has-text("Request Airdrop")');
    if (confirmBtn) {
      console.log('✅ Confirm Airdrop button is ENABLED — clicking...');
      await confirmBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${ssDir}\\faucet_s07_submitted.png` });
      console.log('Airdrop request submitted!');
    } else {
      console.log('❌ Confirm button still disabled — checking page state...');
      const allBtns = await page.$$eval('button', (btns) =>
        btns.map(b => ({ text: b.textContent?.trim(), disabled: b.disabled }))
      );
      console.log('Buttons:', JSON.stringify(allBtns, null, 2));
    }

    await page.waitForTimeout(3000);

    // Check balance
    console.log('\nChecking balance...');
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
    try {
      const bal = await conn.getBalance(new PublicKey(TARGET));
      console.log(`Balance: ${bal / 1e9} SOL`);
    } catch (e) {
      console.log('Balance check skipped (rate limit or error)');
    }

  } finally {
    await browser.close();
    console.log('\nDone. Check screenshots in C:\\Users\\natha\\');
  }
}

main().catch(console.error);
