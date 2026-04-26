// faucet_triangle.ts — Triangle Platform faucet, Solana devnet
import { chromium } from 'playwright-core';

const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';
const SS = 'C:\\Users\\natha';

async function main() {
  const browser = await chromium.launch({
    headless: false, // visible so we can see what happens + pass hCaptcha if any
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    slowMo: 150,
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  try {
    console.log('Loading Triangle faucet...');
    await page.goto('https://faucet.triangleplatform.com/solana/devnet', {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.screenshot({ path: `${SS}\\tri_01_loaded.png` });
    console.log('Loaded');

    // Fill the address input
    const input = await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await input!.click({ clickCount: 3 });
    await input!.fill(TARGET);
    console.log('Address filled');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}\\tri_02_filled.png` });

    // Check if button enabled now
    const btn = await page.$('button:has-text("Request")');
    const isDisabled = await btn!.getAttribute('disabled');
    console.log(`Request button disabled: ${isDisabled !== null}`);
    await page.screenshot({ path: `${SS}\\tri_03_btn_state.png` });

    // If there's a captcha, wait for it
    const hasCaptcha = await page.$('iframe[src*="hcaptcha"], iframe[src*="recaptcha"], .h-captcha, .g-recaptcha');
    if (hasCaptcha) {
      console.log('CAPTCHA detected — waiting 20s for manual solve or auto...');
      await page.waitForTimeout(20000);
    }

    // Try clicking Request anyway
    if (btn) {
      try {
        await btn.click({ force: true });
        console.log('Clicked Request button');
        await page.waitForTimeout(4000);
        await page.screenshot({ path: `${SS}\\tri_04_after_click.png` });
      } catch (e) {
        console.log('Click failed:', (e as Error).message.split('\n')[0]);
      }
    }

    // Read response / any success message
    const body = await page.evaluate(() => document.body.innerText);
    console.log('Page text (first 500):', body.substring(0, 500));

    // Check all API calls made
    console.log('\nWaiting for any async response...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SS}\\tri_05_final.png` });
    const bodyFinal = await page.evaluate(() => document.body.innerText);
    console.log('Final page text:', bodyFinal.substring(0, 500));

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
