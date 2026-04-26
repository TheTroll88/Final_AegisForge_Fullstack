/**
 * probe_moove_stealth.mjs — Stealth-mode probe for moove.xyz registration
 *
 * Uses playwright-extra with puppeteer-extra-plugin-stealth to bypass
 * reCAPTCHA enterprise bot detection.
 * 
 * Run: node probe_moove_stealth.mjs
 */

import { chromium as playwrightChromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { sign as cryptoSign, generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';

playwrightChromium.use(StealthPlugin());

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const REFERRAL_URL = 'https://moove.xyz/@thetroll/refer';

// ─── Keypair ─────────────────────────────────────────────────────────────────

function base58(bytes) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const pubBytes = pubDer.slice(-32);
const pubkeyB58 = base58(pubBytes);
console.log('Probe pubkey:', pubkeyB58);

// ─── Stealth Browser ─────────────────────────────────────────────────────────

const browser = await playwrightChromium.launch({
  headless: false,
  executablePath: BRAVE,
  args: [
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
  slowMo: 150,
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/Chicago',
});

// ─── Route intercept ─────────────────────────────────────────────────────────

await context.route('**5017-7a65ad0ecd7daaf1.js**', async (route) => {
  console.log('[ROUTE] Intercepting chunk 5017...');
  const response = await route.fetch();
  let body = await response.text();
  let patches = 0;

  const ORIG0 = 'let u,{SolanaStandardWalletAdapter:p,CoinbaseWalletAdapter:h}=await Promise.all([a.e(9036),a.e(1161),a.e(874),a.e(589),a.e(5725)]).then(a.bind(a,37457))';
  const PATCHED0 = 'let u,p=window.__FakeAdapter,h=class{async connect(){return}async disconnect(){return}}';
  if (body.includes(ORIG0)) { body = body.replace(ORIG0, PATCHED0); patches++; console.log('[ROUTE] Patch 0 ✓'); }

  const ORIG1 = 'try{await u.disconnect(),await u.connect()}catch(e){throw new n.Y6}';
  const PATCHED1 = 'try{if(u.disconnect)await Promise.resolve(u.disconnect()).catch(()=>{});if(u.connect)await Promise.resolve(u.connect()).catch((__ce)=>{if(window.__fakeWallet){u.publicKey=window.__fakeWallet.publicKey;u.signMessage=window.__fakeWallet.signMsg;u.signMessageString=window.__fakeWallet.signMsgStr;console.log("[PATCH1] fallback inject");}else{throw __ce;}})}catch(e){throw new n.Y6}';
  if (body.includes(ORIG1)) { body = body.replace(ORIG1, PATCHED1); patches++; console.log('[ROUTE] Patch 1 ✓'); }

  const ORIG2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x)throw new n.Kd;';
  const PATCHED2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x&&window.__fakeWallet)x=window.__fakeWallet.address;if(!x)throw new n.Kd;';
  if (body.includes(ORIG2)) { body = body.replace(ORIG2, PATCHED2); patches++; console.log('[ROUTE] Patch 2 ✓'); }

  const ORIG3 = 'return await a.signMessageString(e)';
  const PATCHED3 = 'return await (a.signMessageString||window.__fakeWallet.signMsgStr).call(a,e)';
  if (body.includes(ORIG3)) { body = body.replace(ORIG3, PATCHED3); patches++; console.log('[ROUTE] Patch 3 ✓'); }

  console.log(`[ROUTE] ${patches}/4 patches applied`);
  await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'application/javascript; charset=utf-8' } });
});

// ─── Init script ─────────────────────────────────────────────────────────────

const pubBytesArr = [...pubBytes].join(',');

await context.addInitScript(`(function() {
  const PUB_BYTES = new Uint8Array([${pubBytesArr}]);
  const PUB_B58 = '${pubkeyB58}';
  window.__solanaSignRequest = null;
  window.__solanaSignResult = null;
  window.__authTokens = null;

  const _F = window.fetch;
  window.fetch = async function(resource, init) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    const method = (init && init.method) || 'GET';
    const body = (init && init.body) ? String(init.body).slice(0, 300) : '';
    if (url.includes('api.moove') || method !== 'GET') {
      console.log('[FETCH] ' + method + ' ' + url.slice(0,120) + (body ? ' BODY:' + body : ''));
    }
    const res = await _F.apply(this, arguments);
    if (url.includes('api.moove')) {
      try {
        const clone = res.clone();
        const txt = await clone.text().catch(() => '');
        if (txt) {
          console.log('[FETCH RESP] ' + res.status + ' ' + url.slice(0,80) + ' => ' + txt.slice(0,400));
          try {
            const parsed = JSON.parse(txt);
            if (parsed.accessToken || parsed.data?.accessToken) {
              window.__authTokens = parsed.accessToken ? parsed : parsed.data;
              console.log('[AUTH] Token captured!');
            }
          } catch(e) {}
        }
      } catch {}
    }
    return res;
  };

  window.addEventListener('unhandledrejection', (ev) => {
    console.log('[REJECT] ' + String(ev.reason?.message || ev.reason).slice(0, 200));
  });

  window.__b58enc = function(bytes) {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let n = 0n;
    for (const b of bytes) { n = n * 256n + BigInt(b); }
    let r = '';
    while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
    return r;
  };

  const fakePubkey = {
    toBase58: () => PUB_B58, toBytes: () => PUB_BYTES.slice(),
    toString: () => PUB_B58, equals: (o) => o?.toBase58?.() === PUB_B58, toJSON: () => PUB_B58,
  };

  window.__FakeAdapter = class FakeAdapter {
    constructor(name) {
      this.name = name || 'Phantom';
      this.publicKey = fakePubkey;
      console.log('[FakeAdapter] constructed: ' + this.name);
    }
    async connect() { console.log('[FakeAdapter] connect()'); this.publicKey = fakePubkey; }
    async disconnect() { console.log('[FakeAdapter] disconnect()'); }
    async signMessage(msg) { return window.__fakeWallet.signMsg(msg); }
    async signMessageString(msg) { return window.__fakeWallet.signMsgStr(msg); }
  };

  window.__fakeWallet = {
    address: PUB_B58,
    publicKey: fakePubkey,
    signMsg: async function(msgInput) {
      const msgBytes = msgInput instanceof Uint8Array ? msgInput : new TextEncoder().encode(String(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2,'0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const t = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(t);
            const r = window.__solanaSignResult;
            window.__solanaSignResult = null; window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error));
            else resolve(new Uint8Array(r.sigBytes));
          }
        }, 80);
        setTimeout(() => { clearInterval(t); reject(new Error('timeout')); }, 45000);
      });
    },
    signMsgStr: async function(msgInput) {
      console.log('[FAKE] signMsgStr len=' + (msgInput?.length || 0));
      const msgBytes = typeof msgInput === 'string' ? new TextEncoder().encode(msgInput)
        : (msgInput instanceof Uint8Array ? msgInput : new Uint8Array(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2,'0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const t = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(t);
            const r = window.__solanaSignResult;
            window.__solanaSignResult = null; window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error));
            else resolve(window.__b58enc(new Uint8Array(r.sigBytes)));
          }
        }, 80);
        setTimeout(() => { clearInterval(t); reject(new Error('timeout')); }, 45000);
      });
    },
  };
  console.log('[INIT] fakeWallet ready: ' + PUB_B58.slice(0,8));
})();`);

// ─── Network capture ─────────────────────────────────────────────────────────

const captured = [];
context.on('request', req => {
  const u = req.url();
  if (u.includes('api.moove') || u.includes('/v1/')) {
    captured.push({ dir: 'REQ', method: req.method(), url: u.slice(0, 200), body: req.postData()?.slice(0, 800) });
  }
});
context.on('response', async res => {
  const u = res.url();
  if (u.includes('api.moove') || u.includes('/v1/')) {
    const body = await res.text().catch(() => '');
    if (body) captured.push({ dir: 'RES', status: res.status(), url: u.slice(0, 150), body: body.slice(0, 800) });
  }
});

const pageConsole = [];
const page = await context.newPage();
page.on('console', m => { const t = `[${m.type()}] ${m.text().slice(0, 300)}`; pageConsole.push(t); process.stdout.write(t + '\n'); });
page.on('pageerror', e => console.log('[ERR]', e.message.slice(0, 150)));

// ─── Human warmup ─────────────────────────────────────────────────────────────

async function humanMove(page) {
  const moves = [
    [400,300],[450,350],[500,280],[520,350],[480,420],
    [600,380],[650,300],[700,400],[720,350],[680,430],
    [550,500],[500,450],[460,380],[430,320],[400,260],
  ];
  for (const [x, y] of moves) {
    await page.mouse.move(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20, { steps: Math.floor(5 + Math.random() * 10) });
    await page.waitForTimeout(100 + Math.random() * 300);
  }
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 80 + Math.random() * 100);
    await page.waitForTimeout(300 + Math.random() * 400);
  }
  await page.mouse.wheel(0, -(200 + Math.random() * 100));
  await page.waitForTimeout(400);
}

// ─── Navigation ─────────────────────────────────────────────────────────────

console.log('\n[1] Visiting referral URL...');
await page.goto(REFERRAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await humanMove(page);
await page.waitForTimeout(4000);

console.log('[2] Visiting /profile...');
await page.goto('https://moove.xyz/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
await humanMove(page);
await page.waitForTimeout(5000);

await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

// Fill initial handle input if visible
const hi = page.locator('input').first();
if (await hi.isVisible({ timeout: 2000 }).catch(() => false)) {
  await hi.fill('troll_sol_' + Math.floor(Math.random() * 9000 + 1000));
  console.log('[3] Initial handle filled');
}

// Click Connect
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(b => /connect/i.test(b.textContent));
  b?.click();
});
console.log('[4] Connect clicked');
await page.waitForTimeout(2500);

// Click Phantom
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Phantom'));
  b?.click();
});
console.log('[5] Phantom clicked');
await page.waitForTimeout(2500);

// Click SOL option
try {
  const btns = page.locator('button:has-text("Phantom")');
  const count = await btns.count();
  console.log('[6] Phantom buttons:', count);
  if (count > 0) {
    const bbox = await btns.last().boundingBox();
    if (bbox) await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    else await btns.last().click({ force: true });
  }
} catch (e) { console.log('[6] Error:', e.message?.slice(0, 60)); }
await page.waitForTimeout(2500);

// ─── Poll for sign request and create profile dialog ─────────────────────────

console.log('[7] Polling for sign request or Create Profile dialog (90s)...');
const deadline = Date.now() + 90000;
let signed = false;
let authTokens = null;
let regAttempted = false;

while (Date.now() < deadline) {
  // Check for "Create profile" dialog
  if (!regAttempted) {
    const createVisible = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(b => /create\s*profile/i.test(b.textContent || ''));
      return b && b.offsetParent !== null;
    }).catch(() => false);

    if (createVisible) {
      regAttempted = true;
      console.log('[7a] Create Profile dialog visible!');
      const handle = 'troll' + Math.random().toString(36).slice(2, 8);
      console.log('[7a] Handle:', handle);
      await page.waitForTimeout(500);

      // Fill handle
      try {
        const inp = page.locator('[role="dialog"] input').first();
        if (await inp.isVisible({ timeout: 1000 }).catch(() => false)) {
          await inp.click();
          await inp.fill(handle, { timeout: 2000 });
          console.log('[7a] Handle filled via dialog input');
        }
      } catch {}

      await page.waitForTimeout(1000);

      // Click Create profile
      try {
        await page.locator('button:has-text("Create profile")').first().click({ timeout: 3000 });
        console.log('[7a] Create Profile clicked');
      } catch {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find(b => /create\s*profile/i.test(b.textContent));
          b?.click();
        });
        console.log('[7a] Create Profile clicked (fallback)');
      }
      await page.waitForTimeout(4000);
    }
  }

  // Check sign request
  const req = await page.evaluate(() => window.__solanaSignRequest).catch(() => null);
  if (req && !signed) {
    signed = true;
    console.log('[7] SIGN REQUEST received');
    const msgBuffer = Buffer.from(req.messageHex, 'hex');
    console.log('[7] Message:', msgBuffer.toString('utf8').slice(0, 80));
    const sigBuffer = cryptoSign(null, msgBuffer, privateKey);
    await page.evaluate((bytes) => { window.__solanaSignResult = { sigBytes: bytes }; }, [...sigBuffer]);
    console.log('[7] Signed ✓');
  }

  // Check auth tokens
  authTokens = await page.evaluate(() => window.__authTokens).catch(() => null);
  if (authTokens) {
    console.log('\n[7] AUTH TOKEN CAPTURED! 🎉');
    console.log('accessToken:', String(authTokens.accessToken || '').slice(0, 60) + '...');
    break;
  }

  await page.waitForTimeout(300);
}

// ─── Finish ─────────────────────────────────────────────────────────────────

await page.waitForTimeout(5000);
const result = { pubkey: pubkeyB58, signed, authTokens, networkTraffic: captured };
writeFileSync('moove_stealth_result.json', JSON.stringify(result, null, 2));
console.log('\nResult saved to moove_stealth_result.json');

const regTraffic = captured.filter(n => n.url?.includes('registration') && !n.url.includes('registration-check'));
if (regTraffic.length) {
  console.log('\nRegistration traffic:');
  regTraffic.forEach(n => console.log(` ${n.dir} ${n.status || ''} ${n.url}`));
  const regReq = regTraffic.find(n => n.dir === 'REQ');
  if (regReq?.body) console.log(' BODY:', regReq.body);
  const regRes = regTraffic.find(n => n.dir === 'RES');
  if (regRes?.body) console.log(' RESP:', regRes.body);
}

await browser.close();
console.log('Done.');
