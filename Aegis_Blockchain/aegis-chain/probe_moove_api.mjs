import { writeFileSync } from 'fs';

const HDR = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36', 'Accept': 'application/json, text/html' };

// 1. Get main page, find JS chunks
const main = await fetch('https://moove.xyz', { headers: HDR });
const html = await main.text();
writeFileSync('moove_source.html', html);

const rawChunks = html.match(/_next\/static\/chunks\/[^"']+\.js/g) || [];
const chunks = [...new Set(rawChunks)].slice(0, 10);
console.log('JS chunks found:', chunks.length);

// 2. Scan chunks for API routes and auth keywords
const authKeywords = [];
for (const chunk of chunks.slice(0, 5)) {
  const url = 'https://moove.xyz/' + chunk;
  try {
    const r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(8000) });
    const js = await r.text();
    // Find API routes
    const routes = js.match(/["'](\/api\/[^"']{3,80})["']/g) || [];
    if (routes.length) console.log(chunk.slice(-30), '->', [...new Set(routes)].slice(0, 8).join(' | '));
    // Find auth patterns
    const authParts = js.match(/nonce|siwe|auth\/|verify|session|signIn/g) || [];
    authKeywords.push(...authParts);
  } catch(e) {
    console.log(chunk.slice(-30), 'ERR:', e.message.slice(0, 40));
  }
}
console.log('\nAuth terms across chunks:', [...new Set(authKeywords)].join(', '));

// 3. Try Privy / NextAuth / common Web3 auth endpoints
const testEndpoints = [
  'https://moove.xyz/api/auth/session',
  'https://moove.xyz/api/auth/providers',
  'https://moove.xyz/api/auth/csrf',
  'https://moove.xyz/api/user',
  'https://moove.xyz/api/profile',
  'https://api.privy.io',
  'https://moove.xyz/api/trpc',
];

console.log('\n--- probing endpoints ---');
for (const url of testEndpoints) {
  try {
    const r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(5000) });
    const ct = r.headers.get('content-type') || '';
    let body = '';
    if (ct.includes('json')) { const j = await r.json(); body = JSON.stringify(j).slice(0, 120); }
    console.log(r.status, url.replace('https://', '').slice(0, 50).padEnd(52), body.slice(0, 80));
  } catch(e) {
    console.log('ERR', url.replace('https://', '').slice(0, 50).padEnd(52), e.message.slice(0, 40));
  }
}
