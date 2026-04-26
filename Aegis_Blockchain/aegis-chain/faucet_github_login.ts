// faucet_github_login.ts
// Automates full GitHub OAuth flow using username + OAuth token as password
// GitHub Personal Access Tokens work as passwords for basic auth / login
import { chromium } from 'playwright-core';

const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';
const GH_USER = 'TheTroll88';
const GH_TOKEN = process.env.GH_TOKEN || 'REVOKED_ROTATE_ON_GITHUB';
const SS = 'C:\\Users\\natha\\ss_f';

async function ss(page: any, name: string) {
  await page.screenshot({ path: `${SS}_${name}.png` });
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    slowMo: 100,
  });

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  const page = await ctx.newPage();

  try {
    // Step 1: Load faucet
    console.log('Loading faucet.solana.com...');
    await page.goto('https://faucet.solana.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await ss(page, '01_loaded');

    // Step 2: Fill address
    const inp = await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await inp!.fill(TARGET);
    await page.waitForTimeout(800);
    await ss(page, '02_filled');
    console.log('Address filled');

    // Step 3: Click Connect your GitHub
    const ghBtn = await page.waitForSelector('button:has-text("GitHub"), a:has-text("GitHub"), button:has-text("Connect")', { timeout: 10000 });

    // Intercept navigation to handle OAuth redirect
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null),
      ghBtn!.click()
    ]);

    await page.waitForTimeout(2000);
    const urlNow = page.url();
    console.log(`After click URL: ${urlNow}`);
    await ss(page, '03_after_github_click');

    let target = page;
    if (popup) { target = popup as any; console.log('Popup opened'); }

    if (target.url().includes('github.com/login')) {
      console.log('On GitHub login page — filling credentials...');
      await ss(target, '04_github_login');

      // Fill username
      const userField = await target.$('input[name="login"], input[id="login_field"]');
      if (userField) {
        await userField.click({ clickCount: 3 });
        await userField.type(GH_USER, { delay: 80 });
        console.log('Username filled');
      }

      // Fill password (using token — works for API but might not for browser login)
      const passField = await target.$('input[name="password"], input[id="password"]');
      if (passField) {
        await passField.click({ clickCount: 3 });
        await passField.type(GH_TOKEN, { delay: 50 });
        console.log('Token entered as password');
      }

      await ss(target, '05_creds_filled');

      // Submit
      const signInBtn = await target.$('input[type="submit"][value*="Sign in"], button[type="submit"]');
      if (signInBtn) {
        await signInBtn.click();
        console.log('Submitted login form');
        await target.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await ss(target, '06_after_submit');
        console.log(`After submit URL: ${target.url()}`);
      }

      // Check if we're on GitHub authorization page
      if (target.url().includes('github.com/login/oauth/authorize')) {
        console.log('On authorize page — clicking Authorize...');
        const authBtn = await target.$('button:has-text("Authorize"), input[value*="Authorize"]');
        if (authBtn) {
          await authBtn.click();
          await target.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
          await ss(target, '07_after_authorize');
        }
      }
    }

    // Back on faucet — wait for redirect
    await page.waitForTimeout(3000);
    await ss(page, '08_back_on_faucet');
    console.log(`Faucet URL: ${page.url()}`);

    // Try Confirm Airdrop
    const confirmBtn = await page.$('button:not([disabled]):has-text("Confirm"), button:not([disabled]):has-text("Airdrop")');
    if (confirmBtn) {
      console.log('✅ Confirm button enabled — clicking!');
      await confirmBtn.click();
      await page.waitForTimeout(5000);
      await ss(page, '09_submitted');
    } else {
      const allBtns = await page.$$eval('button', bs => bs.map(b => ({ t: b.textContent?.trim().substring(0, 40), d: b.disabled })));
      console.log('Buttons:', JSON.stringify(allBtns, null, 2));
    }

    await page.waitForTimeout(5000);
    await ss(page, '10_final');

  } finally {
    await browser.close();
    console.log('Done. Check C:\\Users\\natha\\ss_f_*.png');
  }
}

main().catch(console.error);
