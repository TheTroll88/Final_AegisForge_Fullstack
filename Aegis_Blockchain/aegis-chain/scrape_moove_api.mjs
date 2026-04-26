/**
 * scrape_moove_api.mjs — Pulls all /v1/ API paths from moove bundle
 */
import { chromium } from 'playwright-core';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const CACHE = 'moove_api_paths.json';

const browser = await chromium.launch({ headless: true, executablePath: BRAVE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0' });

const allPaths = new Set();
const seen = new Set();

ctx.on('response', async (res) => {
  const u = res.url();
  if (!u.endsWith('.js') || seen.has(u)) return;
  seen.add(u);
  try {
    const body = await res.text();
    if (body.length < 500 || body.length > 5_000_000) return;
    const matches = [...body.matchAll(/["'`](\/v1\/[a-zA-Z0-9_\-\/]{2,60})["'`]/g)].map(m => m[1]);
    if (matches.length > 0) {
      matches.forEach(p => allPaths.add(p));
      console.log(`[${u.split('/').pop()?.slice(0,40)}] +${matches.length} paths: ${[...new Set(matches)].slice(0,5).join(', ')}`);
    }
  } catch {}
});

const page = await ctx.newPage();
console.log('Loading moove.xyz...');
await page.goto('https://www.moove.xyz', { waitUntil: 'networkidle', timeout: 40000 });
await page.waitForTimeout(3000);

// Also check profile page to load more chunks
console.log('Loading /profile...');
await page.goto('https://www.moove.xyz/profile', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);

const sorted = [...allPaths].sort();
console.log('\n=== ALL /v1/ API PATHS FOUND ===');
sorted.forEach(p => console.log(p));
console.log(`\nTotal: ${sorted.length} unique paths`);
writeFileSync(CACHE, JSON.stringify(sorted, null, 2));

await browser.close();
