/**
 * probe_moove_persistent.mjs — Persistent Google profile moove probe
 *
 * The reCAPTCHA enterprise blocker is score-based.
 * Solution: persistent Brave/Chromium profile with Google login.
 * Google account cookies → reCAPTCHA score 0.7+ → registration succeeds.
 *
 * FIRST RUN:
 *   node probe_moove_persistent.mjs --setup
 *   → Opens headful browser. Log into Google at google.com. Close when done.
 *   → Profile saved to PROFILE_DIR. Subsequent runs use it automatically.
 *
 * NORMAL RUN (after setup):
 *   node probe_moove_persistent.mjs
 *   → Uses saved profile. Registers a new moove account under @thetroll referral.
 *
 * BATCH:
 *   node probe_moove_persistent.mjs --count 5
 *   → Registers 5 accounts sequentially, 1 new wallet each.
 */

import { sign as cryptoSign, generateKeyPairSync } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright-core';

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const REFERRAL_URL = 'https://moove.xyz/@thetroll/refer';
const API_BASE = 'https://api.moove.xyz';
const PROFILE_DIR = 'C:\\Users\\natha\\aegis-chain\\moove_profile';
const ACCOUNTS_FILE = join('C:\\Users\\natha\\aegis-chain', 'moove_accounts.json');
const SETUP_MODE = process.argv.includes('--setup');
const BATCH_COUNT = process.argv.includes('--count')
  ? parseInt(process.argv[process.argv.indexOf('--count') + 1], 10) || 1
  : 1;

// ─── Wallet helpers ───────────────────────────────────────────────────────────

function generateSolanaKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  return { privateKey, publicKey, pubBytes: pubDer.slice(-32), privBytes: privDer.slice(-32) };
}

function base58(bytes) {
  const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = ALPHA[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

function randomHandle() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `troll${suffix}`;
}

// ─── Account storage ──────────────────────────────────────────────────────────

function loadAccounts() {
  if (existsSync(ACCOUNTS_FILE)) {
    try { return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8')); } catch {}
  }
  return [];
}

function saveAccount(accounts, entry) {
  accounts.push(entry);
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  console.log(`[SAVE] ${accounts.length} account(s) stored`);
}

// ─── Profile dir setup ────────────────────────────────────────────────────────

if (!existsSync(PROFILE_DIR)) {
  mkdirSync(PROFILE_DIR, { recursive: true });
  console.log(`[PROFILE] Created profile dir: ${PROFILE_DIR}`);
}

// ─── Init script (shared between setup and normal run) ───────────────────────

function buildInitScript(pubkeyB58, pubBytesArr) {
  return `(function() {
  const PUB_BYTES = new Uint8Array([${pubBytesArr}]);
  const PUB_B58 = '${pubkeyB58}';

  window.__solanaSignRequest = null;
  window.__solanaSignResult = null;
  window.__authTokens = null;

  const _F = window.fetch;
  window.fetch = async function(resource, init) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    const method = (init && init.method) || 'GET';
    const body = (init && init.body) ? String(init.body).slice(0, 600) : '';
    if (url.includes('api.moove') || method !== 'GET') {
      console.log('[FETCH] ' + method + ' ' + url.slice(0,120) + (body ? ' BODY:' + body : ''));
    }
    const res = await _F.apply(this, arguments);
    if (url.includes('api.moove') || url.includes('/auth/') || url.includes('/token')) {
      try {
        const clone = res.clone();
        const txt = await clone.text().catch(() => '');
        if (txt) {
          console.log('[FETCH RESP] ' + res.status + ' ' + url.slice(0,80) + ' => ' + txt.slice(0,500));
          try {
            const parsed = JSON.parse(txt);
            if (parsed.accessToken || (parsed.data && parsed.data.accessToken)) {
              const tokens = parsed.accessToken ? parsed : parsed.data;
              window.__authTokens = tokens;
              console.log('[AUTH] accessToken captured!');
            }
          } catch(e) {}
        }
      } catch {}
    }
    return res;
  };

  window.addEventListener('unhandledrejection', (ev) => {
    console.log('[REJECT] ' + String(ev.reason && (ev.reason.message || ev.reason)).slice(0, 200));
  });

  const fakePubkey = {
    toBase58: () => PUB_B58, toBytes: () => PUB_BYTES.slice(),
    toString:  () => PUB_B58, equals: (o) => o && o.toBase58 && o.toBase58() === PUB_B58,
    toJSON: () => PUB_B58,
  };

  window.__FakeAdapter = class FakeAdapter {
    constructor(name) { this.name = name || 'Phantom'; this.publicKey = fakePubkey; }
    async connect() { this.publicKey = fakePubkey; }
    async disconnect() {}
    async signMessage(msg) { return window.__fakeWallet.signMsg(msg); }
    async signMessageString(msg) { return window.__fakeWallet.signMsgStr(msg); }
  };

  window.__b58enc = function(bytes) {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let n = 0n; for (const b of bytes) { n = n * 256n + BigInt(b); }
    let r = ''; while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; r = '1' + r; } return r;
  };

  window.__fakeWallet = {
    address: PUB_B58, publicKey: fakePubkey,
    signMsg: async function(msgInput) {
      const msgBytes = msgInput instanceof Uint8Array ? msgInput : new TextEncoder().encode(String(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2,'0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(poll); const r = window.__solanaSignResult;
            window.__solanaSignResult = null; window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error)); else resolve(new Uint8Array(r.sigBytes));
          }
        }, 80);
        setTimeout(() => { clearInterval(poll); reject(new Error('signMsg timeout')); }, 45000);
      });
    },
    signMsgStr: async function(msgInput) {
      const msgBytes = typeof msgInput === 'string'
        ? new TextEncoder().encode(msgInput)
        : (msgInput instanceof Uint8Array ? msgInput : new Uint8Array(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2,'0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(poll); const r = window.__solanaSignResult;
            window.__solanaSignResult = null; window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error));
            else { resolve(window.__b58enc(new Uint8Array(r.sigBytes))); }
          }
        }, 80);
        setTimeout(() => { clearInterval(poll); reject(new Error('signMsgStr timeout')); }, 45000);
      });
    },
  };
  console.log('[INIT] __fakeWallet ready, pubkey=' + PUB_B58.slice(0,8) + '...');
})();`;
}

// ─── Setup mode: log into Google once ────────────────────────────────────────

if (SETUP_MODE) {
  console.log('\n=== SETUP MODE ===');
  console.log('Opening browser with persistent profile.');
  console.log('1. Log into your Google account at google.com');
  console.log('2. Wait for the green "Signed in" confirmation');
  console.log('3. Close the browser window — profile is saved automatically');
  console.log('==================\n');

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: BRAVE,
    headless: false,
    args: ['--no-sandbox'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const page = await ctx.newPage();
  await page.goto('https://accounts.google.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[SETUP] Browser open. Log into Google, then CLOSE the browser window.');

  // Wait until browser is closed by the user
  await new Promise(resolve => ctx.on('close', resolve));
  console.log('[SETUP] Profile saved. Run without --setup to register moove accounts.');
  process.exit(0);
}

// ─── Check Google cookies ─────────────────────────────────────────────────────

async function checkGoogleLogin(ctx) {
  const cookies = await ctx.cookies(['https://google.com', 'https://accounts.google.com']);
  const hasSession = cookies.some(c => (c.name === 'SSID' || c.name === 'SID' || c.name === '__Secure-3PAPISID') && c.value.length > 5);
  return hasSession;
}

// ─── Route patches: chunk 5017 ────────────────────────────────────────────────

function attachRouteInterceptor(ctx, pubkeyB58) {
  ctx.route('**5017-7a65ad0ecd7daaf1.js**', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    let patches = 0;

    const ORIG0 = 'let u,{SolanaStandardWalletAdapter:p,CoinbaseWalletAdapter:h}=await Promise.all([a.e(9036),a.e(1161),a.e(874),a.e(589),a.e(5725)]).then(a.bind(a,37457))';
    const PATCHED0 = 'let u,p=window.__FakeAdapter,h=class{async connect(){return}async disconnect(){return}}';
    if (body.includes(ORIG0)) { body = body.replace(ORIG0, PATCHED0); patches++; }

    const ORIG1 = 'try{await u.disconnect(),await u.connect()}catch(e){throw new n.Y6}';
    const PATCHED1 = 'try{if(u.disconnect)await Promise.resolve(u.disconnect()).catch(()=>{});if(u.connect)await Promise.resolve(u.connect()).catch((__ce)=>{if(window.__fakeWallet){u.publicKey=window.__fakeWallet.publicKey;u.signMessage=window.__fakeWallet.signMsg;u.signMessageString=window.__fakeWallet.signMsgStr;console.log("[PATCH1] fallback inject");}else{throw __ce;}})}catch(e){throw new n.Y6}';
    if (body.includes(ORIG1)) { body = body.replace(ORIG1, PATCHED1); patches++; }

    const ORIG2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x)throw new n.Kd;';
    const PATCHED2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x&&window.__fakeWallet)x=window.__fakeWallet.address;if(!x)throw new n.Kd;';
    if (body.includes(ORIG2)) { body = body.replace(ORIG2, PATCHED2); patches++; }

    const ORIG3 = 'return await a.signMessageString(e)';
    const PATCHED3 = 'return await (a.signMessageString||window.__fakeWallet.signMsgStr).call(a,e)';
    if (body.includes(ORIG3)) { body = body.replace(ORIG3, PATCHED3); patches++; }

    console.log(`[ROUTE] chunk 5017: ${patches}/4 patches applied`);
    await route.fulfill({
      response, body,
      headers: { ...response.headers(), 'content-type': 'application/javascript; charset=utf-8' },
    });
  });
}

// ─── Human warmup ─────────────────────────────────────────────────────────────

async function humanWarmup(page) {
  const moves = [[400,300],[450,350],[500,400],[520,300],[480,250],[600,400],[650,350]];
  for (const [x, y] of moves) {
    await page.mouse.move(x + Math.random()*30-15, y + Math.random()*30-15, { steps: 8 });
    await page.waitForTimeout(80 + Math.random()*200);
  }
  await page.mouse.wheel(0, 200 + Math.random()*100);
  await page.waitForTimeout(400 + Math.random()*400);
  await page.mouse.wheel(0, -(100 + Math.random()*80));
  await page.waitForTimeout(300);
}

// ─── Main registration flow ───────────────────────────────────────────────────

async function registerAccount(ctx, keypair, handle) {
  const pubkeyB58 = base58(keypair.pubBytes);
  const pubBytesArr = [...keypair.pubBytes].join(',');

  await ctx.addInitScript(buildInitScript(pubkeyB58, pubBytesArr));

  const captured = [];
  ctx.on('request', req => {
    const u = req.url();
    if (u.includes('api.moove') || u.includes('/v1/')) {
      captured.push({ dir: 'REQ', method: req.method(), url: u, body: req.postData()?.slice(0, 500) });
    }
  });
  ctx.on('response', async res => {
    const u = res.url();
    if (u.includes('api.moove') || u.includes('/v1/')) {
      const body = await res.text().catch(() => '');
      if (body) captured.push({ dir: 'RES', status: res.status(), url: u, body: body.slice(0, 600) });
    }
  });

  const page = await ctx.newPage();
  page.on('console', m => process.stdout.write(`[PAGE] ${m.text().slice(0,250)}\n`));

  // Node-side sign resolver
  const signPoll = setInterval(async () => {
    try {
      const req = await page.evaluate(() => window.__solanaSignRequest).catch(() => null);
      if (req?.messageHex) {
        const msgBuf = Buffer.from(req.messageHex, 'hex');
        const sigBuf = cryptoSign(null, msgBuf, keypair.privateKey);
        await page.evaluate((sigBytes) => {
          window.__solanaSignResult = { sigBytes };
          window.__solanaSignRequest = null;
        }, [...sigBuf]);
        console.log(`[SIGN] Signed ${req.messageHex.slice(0,20)}... → ${sigBuf.slice(0,4).toString('hex')}...`);
      }
    } catch {}
  }, 100);

  try {
    console.log(`\n[REG] Account: ${handle} | ${pubkeyB58.slice(0,12)}...`);

    await page.goto(REFERRAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await humanWarmup(page);
    await page.waitForTimeout(3000);

    // Click Phantom (SOL) connect button
    const phantomBtn = page.getByRole('button', { name: /phantom/i });
    if (await phantomBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await phantomBtn.click();
      console.log('[NAV] Phantom button clicked');
    } else {
      // Fallback: look for any SOL/Solana wallet option
      const walletBtn = page.locator('button, [role="button"]').filter({ hasText: /phantom|solana|sol wallet/i }).first();
      if (await walletBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await walletBtn.click();
        console.log('[NAV] SOL wallet button clicked (fallback)');
      } else {
        console.log('[NAV] No wallet button found — checking page state');
        const bodyText = await page.locator('body').innerText().catch(() => '');
        console.log('[NAV] Page text:', bodyText.slice(0, 200));
      }
    }

    await page.waitForTimeout(4000);

    // Detect registration dialog (new user)
    const dialogDetected = await page.evaluate(() => {
      const els = document.querySelectorAll('input[placeholder*="handle" i], input[placeholder*="username" i], input[placeholder*="@" i], input[type="text"]');
      return els.length > 0;
    });

    if (dialogDetected) {
      console.log('[NAV] Registration dialog detected');

      const handleInput = page.locator('input[placeholder*="handle" i], input[placeholder*="username" i], input[placeholder*="@" i], input[type="text"]').first();
      await handleInput.waitFor({ timeout: 8000 });
      await handleInput.fill(handle);
      await page.waitForTimeout(1200);

      // Click Create / Continue / Submit
      const createBtn = page.getByRole('button', { name: /create|continue|submit|sign up|register/i });
      if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createBtn.click();
        console.log('[NAV] Create button clicked');
      } else {
        await page.keyboard.press('Enter');
        console.log('[NAV] Pressed Enter');
      }

      await page.waitForTimeout(8000); // wait for reCAPTCHA + sign + registration to fire
    } else {
      console.log('[NAV] No dialog — may already be logged in or different flow');
    }

    // Dump results
    const regReq  = captured.find(c => c.dir === 'REQ'  && c.url.includes('/v1/registration'));
    const regRes  = captured.find(c => c.dir === 'RES'  && c.url.includes('/v1/registration'));
    const tokenRes = captured.find(c => c.dir === 'RES' && (c.url.includes('/auth/token') || c.url.includes('/auth/request')));

    console.log('\n--- Registration traffic ---');
    if (regReq) console.log(' REQ  body:', regReq.body?.slice(0, 300));
    if (regRes) console.log(' RES ', regRes.status, regRes.body?.slice(0, 300));
    else console.log(' (no /v1/registration request seen)');

    // Check for auth tokens in page context
    const tokens = await page.evaluate(() => window.__authTokens).catch(() => null);
    if (tokens?.accessToken) {
      console.log('\n✅ REGISTERED! accessToken:', tokens.accessToken.slice(0, 20), '...');
      return { address: pubkeyB58, handle, privateKeyHex: keypair.privBytes.toString('hex'), tokens };
    } else if (regRes?.status >= 200 && regRes?.status < 300) {
      console.log('\n✅ REGISTERED! (no token captured yet — may need auth/token step)');
      return { address: pubkeyB58, handle, privateKeyHex: keypair.privBytes.toString('hex') };
    } else {
      const errBody = regRes?.body || '(no response)';
      console.log('\n✗ Registration failed:', errBody.slice(0, 200));
      return null;
    }
  } finally {
    clearInterval(signPoll);
    await page.close();
  }
}

// ─── Apply referral ───────────────────────────────────────────────────────────

async function applyReferral(accessToken) {
  try {
    const r = await fetch(`${API_BASE}/v1/referral`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: 'thetroll' }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      console.log('[REFERRAL] ✅ Applied thetroll referral!', JSON.stringify(d).slice(0, 100));
      return true;
    }
    console.log('[REFERRAL] ✗', r.status, JSON.stringify(d).slice(0, 100));
    return false;
  } catch (e) {
    console.log('[REFERRAL] Error:', e.message);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n=== moove.xyz Persistent Probe (${BATCH_COUNT} account(s)) ===\n`);

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  executablePath: BRAVE,
  headless: false, // keep visible so reCAPTCHA sees real interaction
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});

// Check Google login status
const googleLoggedIn = await checkGoogleLogin(ctx);
if (!googleLoggedIn) {
  console.log('\n⚠ Google session not detected in profile.');
  console.log('Run: node probe_moove_persistent.mjs --setup');
  console.log('Then log into Google, close the browser, and re-run without --setup.\n');
  await ctx.close();
  process.exit(1);
}
console.log('[PROFILE] Google session detected ✓\n');

// Attach route interceptor (for ALL pages in this context)
const accounts = loadAccounts();
let successCount = 0;

for (let i = 0; i < BATCH_COUNT; i++) {
  const keypair = generateSolanaKeypair();
  const handle = randomHandle();

  console.log(`\n[${i + 1}/${BATCH_COUNT}] Registering ${handle}...`);
  attachRouteInterceptor(ctx, base58(keypair.pubBytes));

  const result = await registerAccount(ctx, keypair, handle);

  if (result) {
    successCount++;
    if (result.tokens?.accessToken) {
      await applyReferral(result.tokens.accessToken);
    }
    saveAccount(accounts, { ...result, registeredAt: new Date().toISOString() });
  }

  if (i < BATCH_COUNT - 1) {
    const delay = 8000 + Math.random() * 5000;
    console.log(`\n[BATCH] Waiting ${Math.round(delay/1000)}s before next account...`);
    await new Promise(r => setTimeout(r, delay));
  }
}

console.log(`\n=== Done: ${successCount}/${BATCH_COUNT} accounts registered ===`);
if (successCount > 0) {
  console.log(`Accounts saved to moove_accounts.json`);
}

await ctx.close();
