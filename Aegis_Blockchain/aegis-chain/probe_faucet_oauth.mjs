import { chromium } from 'playwright-core';

const br = await chromium.launch({ headless: true });
const page = await br.newPage();

let oauthUrl = null;

// Intercept GitHub OAuth redirect
page.on('request', async r => {
  const url = r.url();
  if (url.includes('github.com/login/oauth') || url.includes('github.com/login/device') || url.includes('client_id=')) {
    console.log('GITHUB OAUTH URL:', url);
    oauthUrl = url;
  }
});

page.on('response', async r => {
  if (r.url().includes('/api/auth') || r.url().includes('/api/request') || r.url().includes('faucet')) {
    console.log('RESPONSE:', r.status(), r.url());
    try { console.log('BODY:', (await r.text()).slice(0, 200)); } catch {}
  }
});

await page.goto('https://faucet.solana.com', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

const content = await page.content();
// Look for GitHub OAuth link in page
const oauthLinks = [...content.matchAll(/github\.com\/login\/oauth\/authorize[^"']+/g)].map(m => m[0]);
console.log('OAuth links in page source:', oauthLinks.slice(0, 5));

// Also look for client_id
const clientIds = [...content.matchAll(/client_id[=:]["']?([A-Za-z0-9]+)/g)].map(m => m[1]);
console.log('Client IDs found:', clientIds);

// Find and click the GitHub button
const btn = await page.$('button:has-text("GitHub"), a:has-text("GitHub"), [data-testid="github"], button[aria-label*="GitHub"]');
if (btn) {
  console.log('Found GitHub auth button:', await btn.textContent());
  // Set up navigation interception
  const interceptPromise = page.waitForRequest(r => r.url().includes('github.com'), { timeout: 5000 }).catch(() => null);
  await btn.click().catch(() => {});
  const req = await interceptPromise;
  if (req) console.log('Intercepted GitHub request:', req.url());
} else {
  console.log('No GitHub button found. Page buttons:',
    await page.$$eval('button', els => els.map(e => e.textContent?.trim()).join(' | ')));
}

await br.close();
