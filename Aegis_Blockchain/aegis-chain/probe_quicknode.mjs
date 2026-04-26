import { chromium } from 'playwright-core';

const br = await chromium.launch({ headless: true });
const page = await br.newPage();
const posts = [];

page.on('request', r => {
  if (r.method() === 'POST') posts.push({ url: r.url(), body: r.postData()?.slice(0, 200) });
});

page.on('response', r => {
  if (r.url().includes('/api/') || r.url().includes('faucet')) {
    console.log('RESPONSE:', r.status(), r.url());
  }
});

await page.goto('https://faucet.quicknode.com/solana/devnet', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

const inp = await page.$('input[type="text"], input[placeholder]');
if (inp) {
  const ph = await inp.getAttribute('placeholder');
  console.log('Input placeholder:', ph);
  await inp.fill('7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY');
  await page.waitForTimeout(1000);
}

const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()));
console.log('Buttons:', btns.join(' | '));

// Check page source for API hints
const content = await page.content();
const apiMatches = [...content.matchAll(/['"]\/api\/[^'"]+['"]/g)].map(m => m[0]).slice(0, 20);
console.log('API paths in source:', apiMatches.join(', '));

console.log('POST requests intercepted:', JSON.stringify(posts));
await br.close();
