/**
 * probe_moove3.mjs — Route-interception approach
 *
 * Problem: SolanaStandardWalletAdapter("Phantom") calls getWallets() and fails
 * because our wallet isn't in the module-local registry at construction time.
 *
 * Fix: Intercept chunk 5017 download, patch the connect() try-catch so it
 * injects our fake wallet onto the adapter object instead of throwing.
 * Also patch signMessageString to route through our window.__fakeWallet.
 *
 * Flow:
 *  1. addInitScript → window.__fakeWallet (pubkey + signMsgStr poll/sign infra)
 *  2. route(*5017-*) → fetch original JS, patch 3 strings, fulfill modified
 *  3. Navigate moove → set referral cookie → click Phantom (SOL) → connect succeeds
 *  4. moove calls signMsgStr(message) → we sign it with Ed25519
 *  5. moove POSTs to /v1/auth/token → we capture accessToken from response
 *  6. Next: use token to register handle + complete referral signup
 */

import { sign as cryptoSign, generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
import { chromium } from 'playwright-core';

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const REFERRAL_URL = 'https://moove.xyz/@thetroll/refer';

// ─── Keypair gen ──────────────────────────────────────────────────────────────

function generateSolanaKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  return {
    privateKey,
    publicKey,
    pubBytes: pubDer.slice(-32),
    privBytes: privDer.slice(-32),
  };
}

function base58(bytes) {
  const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = ALPHA[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

function signEd25519(privateKey, msgBuffer) {
  // Ed25519 in Node.js: sign(null, data, key) — NOT createSign
  return cryptoSign(null, msgBuffer, privateKey);
}

const keypair = generateSolanaKeypair();
const pubkeyB58 = base58(keypair.pubBytes);
console.log('Probe pubkey:', pubkeyB58);

// ─── Browser ─────────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  headless: false,
  executablePath: BRAVE,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  slowMo: 250,
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});

// ─── Route intercept: patch chunk 5017 ───────────────────────────────────────
// Core strategy: replace the dynamic Promise.all import with our FakeAdapter.
// This bypasses getWallets() registry entirely — no more NotDetected state.

await context.route('**5017-7a65ad0ecd7daaf1.js**', async (route) => {
  console.log('[ROUTE] Intercepting chunk 5017...');
  const response = await route.fetch();
  let body = await response.text();

  let patches = 0;

  // Patch 0 (PRIMARY): Replace dynamic adapter import with our FakeAdapter
  // Original imports SolanaStandardWalletAdapter from chunks 9036+1161+874+589+5725 (module 37457)
  // We replace with window.__FakeAdapter which always succeeds
  const ORIG0 = 'let u,{SolanaStandardWalletAdapter:p,CoinbaseWalletAdapter:h}=await Promise.all([a.e(9036),a.e(1161),a.e(874),a.e(589),a.e(5725)]).then(a.bind(a,37457))';
  const PATCHED0 = 'let u,p=window.__FakeAdapter,h=class{async connect(){return}async disconnect(){return}}';
  if (body.includes(ORIG0)) { body = body.replace(ORIG0, PATCHED0); patches++; console.log('[ROUTE] Patch 0 (FakeAdapter inject) ✓'); }
  else {
    console.log('[ROUTE] Patch 0 NOT FOUND — checking Promise.all context...');
    const i = body.indexOf('Promise.all([a.e(9036)');
    if (i >= 0) console.log('[ROUTE] Context:', body.slice(Math.max(0,i-80), i+300));
  }

  // Patch 1 (SAFETY): If Patch 0 applied then connect() won't throw,
  // but keep this as a fallback in case something still throws.
  const ORIG1 = 'try{await u.disconnect(),await u.connect()}catch(e){throw new n.Y6}';
  const PATCHED1 = 'try{if(u.disconnect)await Promise.resolve(u.disconnect()).catch(()=>{});if(u.connect)await Promise.resolve(u.connect()).catch((__ce)=>{if(window.__fakeWallet){u.publicKey=window.__fakeWallet.publicKey;u.signMessage=window.__fakeWallet.signMsg;u.signMessageString=window.__fakeWallet.signMsgStr;console.log("[PATCH1] fallback inject");}else{throw __ce;}})}catch(e){throw new n.Y6}';
  if (body.includes(ORIG1)) { body = body.replace(ORIG1, PATCHED1); patches++; console.log('[ROUTE] Patch 1 (connect safety) ✓'); }

  // Patch 2 (SAFETY): pubkey fallback
  const ORIG2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x)throw new n.Kd;';
  const PATCHED2 = 'let x=null==(o=u.publicKey)?void 0:o.toString();if(!x&&window.__fakeWallet)x=window.__fakeWallet.address;if(!x)throw new n.Kd;';
  if (body.includes(ORIG2)) { body = body.replace(ORIG2, PATCHED2); patches++; console.log('[ROUTE] Patch 2 (pubkey safety) ✓'); }

  // Patch 3: signMessageString — use FakeAdapter's or fall back to fakeWallet
  const ORIG3 = 'return await a.signMessageString(e)';
  const PATCHED3 = 'return await (a.signMessageString||window.__fakeWallet.signMsgStr).call(a,e)';
  if (body.includes(ORIG3)) { body = body.replace(ORIG3, PATCHED3); patches++; console.log('[ROUTE] Patch 3 (signMsgStr) ✓'); }

  console.log(`[ROUTE] ${patches}/4 patches applied, size: ${body.length}`);

  await route.fulfill({
    response,
    body,
    headers: { ...response.headers(), 'content-type': 'application/javascript; charset=utf-8' },
  });
});

// ─── Init script: fake wallet + fetch spy ────────────────────────────────────

const pubBytesArr = [...keypair.pubBytes].join(',');

await context.addInitScript(`(function() {
  const PUB_BYTES = new Uint8Array([${pubBytesArr}]);
  const PUB_B58 = '${pubkeyB58}';

  window.__solanaSignRequest = null;
  window.__solanaSignResult = null;
  window.__authTokens = null;

  // Full fetch spy — log all API calls + capture auth token response
  const _F = window.fetch;
  window.fetch = async function(resource, init) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    const method = (init && init.method) || 'GET';
    const body = (init && init.body) ? String(init.body).slice(0, 600) : '';

    if (url.includes('api.moove') || method !== 'GET') {
      console.log('[FETCH] ' + method + ' ' + url.slice(0,120) + (body ? ' BODY:' + body : ''));
    }

    const res = await _F.apply(this, arguments);

    // Clone + read auth responses
    if (url.includes('api.moove') || url.includes('/auth/') || url.includes('/token')) {
      try {
        const clone = res.clone();
        const txt = await clone.text().catch(() => '');
        if (txt) {
          console.log('[FETCH RESP] ' + res.status + ' ' + url.slice(0,80) + ' => ' + txt.slice(0,500));
          // Capture auth token
          try {
            const parsed = JSON.parse(txt);
            if (parsed.accessToken || parsed.data?.accessToken) {
              const tokens = parsed.accessToken ? parsed : parsed.data;
              window.__authTokens = tokens;
              console.log('[AUTH] accessToken captured! expires:', tokens.accessTokenExpiration);
            }
          } catch(e) {}
        }
      } catch {}
    }

    return res;
  };

  // Unhandled rejection logging
  window.addEventListener('unhandledrejection', (ev) => {
    const msg = ev.reason && (ev.reason.message || String(ev.reason));
    console.log('[REJECT] ' + String(msg).slice(0, 200));
  });

  const fakePubkey = {
    toBase58: () => PUB_B58,
    toBytes: () => PUB_BYTES.slice(),
    toString: () => PUB_B58,
    equals: (o) => o && o.toBase58 && o.toBase58() === PUB_B58,
    toJSON: () => PUB_B58,
  };

  // FakeAdapter: replaces SolanaStandardWalletAdapter — always succeeds, routes sign through poll
  window.__FakeAdapter = class FakeAdapter {
    constructor(name) {
      this.name = name || 'Phantom';
      this.publicKey = fakePubkey;
      console.log('[FakeAdapter] constructed: ' + this.name);
    }
    async connect() {
      console.log('[FakeAdapter] connect() \u2192 success');
      this.publicKey = fakePubkey;
    }
    async disconnect() {
      console.log('[FakeAdapter] disconnect()');
    }
    async signMessage(msg) {
      console.log('[FakeAdapter] signMessage(), type=' + typeof msg);
      return window.__fakeWallet.signMsg(msg);
    }
    async signMessageString(msg) {
      console.log('[FakeAdapter] signMessageString(), type=' + typeof msg);
      return window.__fakeWallet.signMsgStr(msg);
    }
  };

  window.__fakeWallet = {
    address: PUB_B58,
    publicKey: fakePubkey,

    // signMsg: Uint8Array input, returns Uint8Array signature (standard signMessage)
    signMsg: async function(msgInput) {
      console.log('[FAKE] signMsg called, type=' + (msgInput && msgInput.constructor && msgInput.constructor.name));
      const msgBytes = msgInput instanceof Uint8Array ? msgInput : new TextEncoder().encode(String(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(poll);
            const r = window.__solanaSignResult;
            window.__solanaSignResult = null;
            window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error));
            else resolve(new Uint8Array(r.sigBytes));
          }
        }, 80);
        setTimeout(() => { clearInterval(poll); reject(new Error('signMsg timeout')); }, 45000);
      });
    },

    // signMsgStr: string or Uint8Array input — moove-specific, returns base58 string
    signMsgStr: async function(msgInput) {
      console.log('[FAKE] signMsgStr called, type=' + typeof msgInput + ' len=' + (msgInput && (msgInput.length || 0)));
      const msgBytes = typeof msgInput === 'string'
        ? new TextEncoder().encode(msgInput)
        : (msgInput instanceof Uint8Array ? msgInput : new Uint8Array(msgInput));
      const msgHex = Array.from(msgBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('[FAKE] message hex (first 80): ' + msgHex.slice(0, 80));
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(poll);
            const r = window.__solanaSignResult;
            window.__solanaSignResult = null;
            window.__solanaSignRequest = null;
            if (r.error) reject(new Error(r.error));
            else {
              // Return BASE58 string — moove expects string type for signature field
              const sigB58 = window.__b58enc(new Uint8Array(r.sigBytes));
              console.log('[FAKE] signMsgStr signed OK, b58: ' + sigB58.slice(0, 20) + '...');
              resolve(sigB58);
            }
          }
        }, 80);
        setTimeout(() => { clearInterval(poll); reject(new Error('signMsgStr timeout')); }, 45000);
      });
    },
  };

  console.log('[INIT] __fakeWallet ready, pubkey=' + PUB_B58.slice(0,8) + '...');

  // Base58 encoder for in-browser use
  window.__b58enc = function(bytes) {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let n = 0n;
    for (const b of bytes) { n = n * 256n + BigInt(b); }
    let r = '';
    while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
    return r;
  };
})();`);

// ─── Network capture ─────────────────────────────────────────────────────────

const captured = [];
context.on('request', req => {
  const u = req.url();
  if (u.includes('api.moove') || u.includes('/auth') || u.includes('/v1/')) {
    captured.push({ dir: 'REQ', method: req.method(), url: u.slice(0, 200), body: req.postData()?.slice(0, 400) });
  }
});
context.on('response', async res => {
  const u = res.url();
  if (u.includes('api.moove') || u.includes('/auth') || u.includes('/v1/')) {
    const body = await res.text().catch(() => '');
    if (body) captured.push({ dir: 'RES', status: res.status(), url: u.slice(0, 150), body: body.slice(0, 600) });
  }
});

const pageConsole = [];
const page = await context.newPage();
page.on('console', m => { const t = `[${m.type()}] ${m.text().slice(0, 300)}`; pageConsole.push(t); process.stdout.write(t + '\n'); });
page.on('pageerror', e => { const t = '[PAGEERR] ' + e.message.slice(0, 200); pageConsole.push(t); console.log(t); });

// ─── Navigation ───────────────────────────────────────────────────────────────

// Human warmup: random mouse movements to boost reCAPTCHA score
async function humanWarmup(page) {
  // Simulate natural browsing: scroll, move mouse, pause
  const moves = [
    [400, 300], [450, 350], [500, 400], [520, 300], [480, 250],
    [600, 400], [650, 350], [700, 300], [730, 400], [680, 450],
  ];
  for (const [x, y] of moves) {
    await page.mouse.move(x + Math.random() * 30 - 15, y + Math.random() * 30 - 15, { steps: 8 });
    await page.waitForTimeout(80 + Math.random() * 200);
  }
  await page.mouse.wheel(0, 200 + Math.random() * 100);
  await page.waitForTimeout(500 + Math.random() * 500);
  await page.mouse.wheel(0, -(100 + Math.random() * 80));
  await page.waitForTimeout(300 + Math.random() * 300);
}

console.log('\n[1] Setting referral cookie...');
await page.goto(REFERRAL_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
await humanWarmup(page);
await page.waitForTimeout(3000);

console.log('[2] Navigating to /profile...');
await page.goto('https://moove.xyz/profile', { waitUntil: 'domcontentloaded', timeout: 25000 });
await humanWarmup(page);
await page.waitForTimeout(4000);

await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// Fill handle if visible
const handleInput = page.locator('input').first();
if (await handleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await handleInput.fill('troll_sol_' + Math.floor(Math.random() * 9000 + 1000));
  console.log('[3] Handle filled');
}

// Click Connect
const connectResult = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => /connect/i.test(b.textContent || ''));
  if (btn) { btn.click(); return btn.textContent?.trim(); }
  return null;
});
console.log('[4] Connect clicked:', connectResult);
await page.waitForTimeout(2500);

// Click Phantom wallet
const phantomWalletClick = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Phantom'));
  if (btn) { btn.click(); return btn.textContent?.trim().slice(0, 60); }
  return 'not found';
});
console.log('[5] Phantom wallet click:', phantomWalletClick);
await page.waitForTimeout(2500);

// Take screenshot of select network modal
await page.screenshot({ path: 'moove3_before_sol.png' });

// Click Phantom SOL (the last Phantom button = SOL option)
let solClickResult = 'not attempted';
try {
  const phantomBtns = page.locator('[role="dialog"] button:has-text("Phantom"), button:has-text("Phantom")');
  const count = await phantomBtns.count();
  console.log('[6] Phantom buttons found:', count);

  if (count > 0) {
    const target = phantomBtns.last(); // last = SOL option
    const bbox = await target.boundingBox();
    if (bbox) {
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      console.log('[6] Clicking Phantom SOL at:', Math.round(cx), Math.round(cy));
      await page.mouse.move(cx, cy);
      await page.waitForTimeout(100);
      await page.mouse.click(cx, cy);
      solClickResult = `mouse click (${Math.round(cx)}, ${Math.round(cy)})`;
    } else {
      await target.click({ force: true });
      solClickResult = 'force click';
    }
  }
} catch (e) {
  solClickResult = 'ERROR: ' + e.message?.slice(0, 80);
}
console.log('[6]', solClickResult);

// Screenshot after click
await page.waitForTimeout(1500);
await page.screenshot({ path: 'moove3_after_sol.png' });

// ─── Sign request polling ────────────────────────────────────────────────────

console.log('[7] Waiting up to 60s for signMessage or auth token...');
const deadline = Date.now() + 60000;
let signed = false;
let authTokens = null;
let registrationAttempted = false;

while (Date.now() < deadline) {
  // ─── Check for "Create profile" (new user) dialog ──────────────────────────
  if (!registrationAttempted) {
    const dialogInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => /create\s*profile/i.test(b.textContent || ''));
      if (!createBtn) return null;
      // Find handle input — could be in dialog or page
      const inputs = Array.from(document.querySelectorAll('input'));
      const handleInput = inputs.find(el =>
        el.placeholder?.toLowerCase().includes('handle') ||
        el.name?.toLowerCase().includes('handle') ||
        el.id?.toLowerCase().includes('handle') ||
        el.getAttribute('aria-label')?.toLowerCase().includes('handle') ||
        el.closest('[class*="dialog"], [role="dialog"]')
      );
      return {
        btnVisible: createBtn.offsetParent !== null,
        btnText: createBtn.textContent?.trim().slice(0, 50),
        hasHandleInput: !!handleInput,
        inputCount: inputs.length,
      };
    }).catch(() => null);

    if (dialogInfo && dialogInfo.btnVisible) {
      console.log('\n[7a] "Create profile" dialog detected!', JSON.stringify(dialogInfo));
      registrationAttempted = true;

      // Fill using Playwright native fill — triggers proper React synthetic events
      const randHandle = 'troll' + Math.random().toString(36).slice(2, 8);
      console.log(`[7a] Using handle: ${randHandle}`);

      // Try multiple selectors for the handle input inside the dialog
      const inputSelectors = [
        '[role="dialog"] input',
        'input[placeholder*="handle" i]',
        'input[name*="handle" i]',
        'input[id*="handle" i]',
        'dialog input',
        'input',
      ];
      let inputFilled = false;
      for (const sel of inputSelectors) {
        try {
          const loc = page.locator(sel).first();
          const visible = await loc.isVisible({ timeout: 1500 }).catch(() => false);
          if (visible) {
            await loc.click({ timeout: 2000 });
            await loc.selectText().catch(() => {});
            await loc.fill(randHandle, { timeout: 3000 });
            await page.waitForTimeout(400);
            // Verify value was set
            const val = await loc.inputValue().catch(() => '');
            console.log(`[7a] Input [${sel}] filled: "${val}"`);
            if (val.length > 0) { inputFilled = true; break; }
          }
        } catch {}
      }
      if (!inputFilled) console.log('[7a] WARNING: Could not fill handle input');

      await page.waitForTimeout(800);

      // Click the "Create profile" button using Playwright locator
      try {
        const createBtn = page.locator('button:has-text("Create profile"), button:has-text("Create Profile")').first();
        const btnVisible = await createBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (btnVisible) {
          await createBtn.click({ timeout: 3000 });
          console.log('[7a] "Create profile" button clicked via Playwright locator');
        } else {
          // Fallback: JS click
          const js = await page.evaluate(() => {
            const b = Array.from(document.querySelectorAll('button')).find(b => /create\s*profile/i.test(b.textContent || ''));
            if (b) { b.click(); return b.textContent?.trim(); }
            return null;
          });
          console.log('[7a] Fallback JS click:', js);
        }
      } catch (e) {
        console.log('[7a] Button click error:', e.message?.slice(0, 60));
      }

      // Capture the registration API calls
      await page.waitForTimeout(4000);

      // Check if a different endpoint was called (capture from network captures)
      const regCalls = captured.filter(c => c.dir === 'REQ' && c.body && !c.url.includes('/auth/request') && !c.url.includes('/auth/token') && c.url.includes('api.moove'));
      if (regCalls.length > 0) {
        console.log('[7a] Registration API call detected:');
        regCalls.forEach(c => console.log(`  ${c.method} ${c.url.slice(0, 100)} body: ${c.body?.slice(0, 250)}`));
      }
    }
  }

  // Check for sign request
  const req = await page.evaluate(() => window.__solanaSignRequest).catch(() => null);
  if (req && !signed) {
    console.log('\n[7] SIGN REQUEST received!');
    console.log('    Message hex:', req.messageHex.slice(0, 120));

    // Decode message for readability
    const msgBuffer = Buffer.from(req.messageHex, 'hex');
    const msgText = msgBuffer.toString('utf8').slice(0, 300);
    console.log('    Message text:', msgText);

    // Sign with our Ed25519 key
    const sigBuffer = signEd25519(keypair.privateKey, msgBuffer);
    const sigBytes = [...sigBuffer];

    await page.evaluate((bytes) => {
      window.__solanaSignResult = { sigBytes: bytes };
    }, sigBytes);

    console.log('[7] Signed ✓ sig:', sigBuffer.toString('hex').slice(0, 40) + '...');
    signed = true;
  }

  // Check for captured auth tokens
  authTokens = await page.evaluate(() => window.__authTokens).catch(() => null);
  if (authTokens) {
    console.log('\n[7] AUTH TOKENS CAPTURED! 🎉');
    console.log('    accessToken:', String(authTokens.accessToken || '').slice(0, 60) + '...');
    console.log('    expires:', authTokens.accessTokenExpiration);
    break;
  }

  await page.waitForTimeout(300);
}

// ─── Final state ─────────────────────────────────────────────────────────────

await page.waitForTimeout(5000);

const finalUrl = page.url();
const bodyText = await page.innerText('body').catch(() => '').then(t => t.slice(0, 400).replace(/\s+/g, ' '));
console.log('\nFinal URL:', finalUrl);
console.log('Page body:', bodyText);

// Save results
const result = {
  pubkey: pubkeyB58,
  signed,
  authTokens,
  consoleLog: pageConsole.slice(-50),
  networkTraffic: captured,
};
writeFileSync('moove3_result.json', JSON.stringify(result, null, 2));
console.log('\nResult saved to moove3_result.json');

if (!signed && !authTokens) {
  console.log('\n[DIAGNOSE] No sign request. Checking page state...');
  const dialogs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"]')).map(d => ({
      text: d.innerText?.trim().slice(0, 200),
      state: d.getAttribute('data-state'),
    }))
  ).catch(() => []);
  console.log('Dialogs:', JSON.stringify(dialogs, null, 2));
}

await browser.close();
console.log('\nDone.');
