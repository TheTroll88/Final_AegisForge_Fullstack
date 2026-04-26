/**
 * moove.xyz Phantom (Solana) probe
 * Injects fake window.solana instead of window.ethereum
 * moove uses WalletConnect relay for MetaMask (unreachable without extension)
 * but uses direct window.solana for Phantom — completely different code path
 */
import { writeFileSync } from 'fs';
import { chromium } from 'playwright-core';

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

// --- Node native Ed25519 keygen ---
import { createSign, generateKeyPairSync } from 'crypto';

function generateSolanaKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  // Export raw bytes
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  const pubBytes = pubDer.slice(-32);  // last 32 = raw public key
  const privBytes = privDer.slice(-32); // last 32 = raw private key seed
  return { privateKey, publicKey, pubBytes, privBytes };
}

function base58(bytes) {
  const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = ALPHA[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

function signEd25519(privateKey, message) {
  // message is Buffer/Uint8Array
  const sig = createSign('ed25519');
  sig.update(message);
  return sig.sign(privateKey); // returns Buffer
}

const keypair = generateSolanaKeypair();
const pubkeyB58 = base58(keypair.pubBytes);
const pubkeyHex = Buffer.from(keypair.pubBytes).toString('hex');
console.log('Solana pubkey:', pubkeyB58);

// Launch browser
const browser = await chromium.launch({
  headless: false,
  executablePath: BRAVE,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  slowMo: 300,
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});

// Inject fake Phantom with full Wallet Standard support
await context.addInitScript(`
(function() {
  const PUB_BYTES = new Uint8Array([${[...keypair.pubBytes].join(',')}]);
  const PUB_B58 = '${pubkeyB58}';

  window.__solanaSignRequest = null;
  window.__solanaSignResult = null;
  window.__wsConnectCalled = false;
  window.__fetchLog = [];

  // Intercept postMessage — Phantom extension uses this channel
  const _origPM = window.postMessage.bind(window);
  window.postMessage = function(data, targetOrigin, transfer) {
    const s = JSON.stringify(data);
    if (s && s.slice(0,4) !== '" ') console.log('[PostMsg] OUT target=' + targetOrigin + ' data=' + s.slice(0,300));
    return _origPM(data, targetOrigin, transfer);
  };
  window.addEventListener('message', function(e) {
    const d = JSON.stringify(e.data);
    if (d && !d.includes('webpack') && !d.includes('statsig')) {
      console.log('[PostMsg] IN origin=' + e.origin + ' data=' + d.slice(0,300));
    }
  });

  // Intercept fetch to capture ALL POST bodies (especially auth/request)
  const _origFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const url = (typeof resource === 'string') ? resource : (resource && resource.url) || '';
    const method = (init && init.method) || 'GET';
    const body = (init && init.body) ? String(init.body).slice(0, 500) : '';
    if (method !== 'GET' || url.includes('api.moove')) {
      console.log('[FetchSpy] ' + method + ' ' + url.slice(0, 120) + (body ? ' BODY:' + body : ''));
      window.__fetchLog.push({ method, url: url.slice(0, 120), body });
    }
    try {
      const res = await _origFetch.apply(this, arguments);
      if (url.includes('api.moove') || url.includes('auth')) {
        const clone = res.clone();
        const text = await clone.text().catch(() => '');
        if (text) console.log('[FetchSpy] RESP ' + res.status + ' ' + url.slice(0, 80) + ' => ' + text.slice(0, 300));
      }
      return res;
    } catch(e) {
      console.error('[FetchSpy] FAILED ' + url.slice(0, 100) + ': ' + (e && e.message));
      throw e;
    }
  };

  // ---- Wallet Standard compliant fake Phantom ----
  // moove uses @wallet-standard/app which listens for 'wallet-standard:register-wallet' events.
  // Real Phantom fires that event on load. We replicate it.

  const wsAccount = {
    address:   PUB_B58,
    publicKey: PUB_BYTES.slice(),
    chains:    ['solana:mainnet', 'solana:devnet', 'solana:localnet'],
    features:  ['standard:connect', 'standard:disconnect', 'standard:events',
                 'solana:signMessage', 'solana:signTransaction'],
    label: 'Phantom',
    icon: undefined,
  };

  const _wsListeners = {};

  const wsWallet = {
    name:    'Phantom',
    version: '1.0.0',
    icon:    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjYWI5ZmY3Ii8+PC9zdmc+',
    chains:  ['solana:mainnet', 'solana:devnet', 'solana:localnet'],
    // Pre-populate accounts — Phantom's real extension has accounts already when unlocked.
    // If moove checks wallet.accounts.length before calling standard:connect, this lets it
    // skip connect and jump straight to signMessage (treating us as already authorized).
    accounts: [wsAccount],

    features: {
      'standard:connect': {
        version: '1.0.0',
        connect: async (input) => {
          console.log('[WalletStd] standard:connect called, silent:', input && input.silent);
          window.__wsConnectCalled = true;
          wsWallet.accounts = [wsAccount];
          (_wsListeners['change'] || []).forEach(fn => fn({ accounts: [wsAccount] }));
          return { accounts: [wsAccount] };
        },
      },
      'standard:disconnect': {
        version: '1.0.0',
        disconnect: async () => {
          console.log('[WalletStd] standard:disconnect called');
          wsWallet.accounts = [];
          (_wsListeners['change'] || []).forEach(fn => fn({ accounts: [] }));
        },
      },
      'standard:events': {
        version: '1.0.0',
        on: (event, listener) => {
          console.log('[WalletStd] events.on: ' + event);
          if (!_wsListeners[event]) _wsListeners[event] = [];
          _wsListeners[event].push(listener);
          return () => {
            _wsListeners[event] = (_wsListeners[event] || []).filter(l => l !== listener);
          };
        },
      },
      'solana:signMessage': {
        version: '1.0.0',
        signMessage: async (inputs) => {
          // inputs is an array of { account, message }
          const arr = Array.isArray(inputs) ? inputs : [inputs];
          const { account, message } = arr[0];
          console.log('[WalletStd] solana:signMessage called, msgLen=' + (message && message.length));
          const msgHex = Array.from(message).map(b => b.toString(16).padStart(2, '0')).join('');
          window.__solanaSignRequest = { messageHex: msgHex };
          return new Promise((resolve, reject) => {
            const poll = setInterval(() => {
              if (window.__solanaSignResult !== null) {
                clearInterval(poll);
                const r = window.__solanaSignResult;
                window.__solanaSignResult = null;
                window.__solanaSignRequest = null;
                if (r.error) { reject(new Error(r.error)); return; }
                resolve([{ account, signature: new Uint8Array(r.sigBytes), signedMessage: message }]);
              }
            }, 100);
            setTimeout(() => { clearInterval(poll); reject(new Error('signMessage timeout')); }, 30000);
          });
        },
      },
      'solana:signTransaction': {
        version: '1.0.0',
        signTransaction: async (inputs) => {
          console.log('[WalletStd] solana:signTransaction called');
          const arr = Array.isArray(inputs) ? inputs : [inputs];
          return arr.map(({ account, transaction }) => ({ account, signedTransaction: transaction }));
        },
      },
    },
  };

  // Helper: register our wallet with the api object provided by the app
  // The app calls: event.detail(api)  OR  event.detail.callback(api)
  // where api = { register: fn, get: fn, on: fn }
  function walletCallback(api) {
    console.log('[WalletStd] walletCallback called, api keys:', api ? Object.keys(api).join(',') : 'none');
    if (api && typeof api.register === 'function') {
      try {
        console.log('[WalletStd] Calling api.register(wallet)');
        api.register(wsWallet);

        // --- SELF-CONNECT FALLBACK ---
        // If moove never calls standard:connect within 2.5s after registration,
        // fire it ourselves and emit the change event so moove sees accounts populate.
        // This covers apps that check accounts[] after registration instead of calling connect.
        setTimeout(() => {
          if (!window.__wsConnectCalled && wsWallet.accounts.length === 0) {
            console.log('[WalletStd] Auto self-connect triggered (moove never called connect)');
            wsWallet.features['standard:connect'].connect({});
          } else {
            console.log('[WalletStd] Self-connect skipped — already have accounts:', wsWallet.accounts.length);
          }
        }, 2500);

      } catch(e) { console.error('[WalletStd] api.register err:', (e && e.message) || String(e)); }
    } else if (typeof api === 'function') {
      // Some versions pass register function directly
      try { api(wsWallet); } catch(e) { console.error('[WalletStd] api(wallet) err:', (e && e.message) || String(e)); }
    }
  }
  // Handle both detail(api) and detail.callback(api) call patterns
  walletCallback.callback = walletCallback;

  // Strategy 1: intercept addEventListener — when moove subscribes, immediately dispatch our wallet
  const _origAEL = window.addEventListener.bind(window);
  window.addEventListener = function(type, listener, options) {
    _origAEL(type, listener, options);
    if (type === 'wallet-standard:register-wallet' || type === '@wallet-standard/register-wallet') {
      console.log('[WalletStd] App subscribed to: ' + type + ' — scheduling dispatch');
      // dispatchEvent goes to all registered listeners (including the one just added via _origAEL above)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(type, {
          bubbles: false, cancelable: false, composed: false,
          detail: walletCallback,  // detail IS the callback function (moove calls detail(api))
        }));
      }, 0);
    }
  };

  // Strategy 2: fire register-wallet for early app initializers (belt+suspenders)
  setTimeout(() => {
    for (const evtName of ['wallet-standard:register-wallet', '@wallet-standard/register-wallet']) {
      console.log('[WalletStd] Delayed dispatch of ' + evtName);
      window.dispatchEvent(new CustomEvent(evtName, {
        bubbles: false, cancelable: false, composed: false,
        detail: walletCallback,
      }));
    }
  }, 50);

  // Strategy 3: listen for app-ready — app sends its API so late-loading wallets can register
  // ev.detail IS the api object { register, get, on }
  _origAEL('wallet-standard:app-ready', (ev) => {
    console.log('[WalletStd] wallet-standard:app-ready received');
    if (ev && ev.detail) {
      if (typeof ev.detail.register === 'function') {
        console.log('[WalletStd] Registering via app-ready api.register');
        try { ev.detail.register(wsWallet); } catch(e) { console.error('[WalletStd] app-ready register err:', (e && e.message) || String(e)); }
      } else if (typeof ev.detail === 'function') {
        ev.detail({ register: (w) => { console.log('[WalletStd] app-ready fn register called'); } });
      }
    }
  });

  // ---- Legacy window.solana (for detection only, moove reads isPhantom from here) ----
  window.solana = {
    isPhantom: true,
    publicKey: {
      toBase58: () => PUB_B58,
      toBytes: () => PUB_BYTES.slice(),
      toString: () => PUB_B58,
      equals: (o) => o && o.toBase58 && o.toBase58() === PUB_B58,
      toJSON:  () => PUB_B58,
    },
    isConnected: false,
    connect: async function(opts) {
      console.log('[LegacySolana] connect() called');
      this.isConnected = true;
      return { publicKey: this.publicKey };
    },
    signMessage: async function(message, display) {
      console.log('[LegacySolana] signMessage() called');
      const msgHex = Array.from(message instanceof Uint8Array ? message : new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2,'0')).join('');
      window.__solanaSignRequest = { messageHex: msgHex };
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          if (window.__solanaSignResult !== null) {
            clearInterval(poll);
            const r = window.__solanaSignResult;
            window.__solanaSignResult = null;
            window.__solanaSignRequest = null;
            if (r.error) { reject(new Error(r.error)); return; }
            resolve({ signature: new Uint8Array(r.sigBytes), publicKey: window.solana.publicKey });
          }
        }, 100);
        setTimeout(() => { clearInterval(poll); reject(new Error('legacy sign timeout')); }, 30000);
      });
    },
    signTransaction: async function(tx) { return tx; },
    signAllTransactions: async function(txs) { return txs; },
    _events: {},
    on: function(ev, h) { (this._events[ev] = this._events[ev] || []).push(h); },
    emit: function(ev, ...a) { (this._events[ev] || []).forEach(h => h(...a)); },
    removeListener: function(ev, h) { if (this._events[ev]) this._events[ev] = this._events[ev].filter(x => x !== h); },
    off: function(ev, h) { this.removeListener(ev, h); },
  };
  // Proxy window.solana to trace ALL property access/calls at click time
  const _rawSolana = window.solana;
  window.solana = new Proxy(_rawSolana, {
    get(t, prop) {
      const val = t[prop];
      if (typeof prop === 'string' && prop !== 'constructor' && prop !== 'then') {
        if (typeof val === 'function') {
          return function(...args) {
            console.log('[SolanaProxy] CALL:' + prop + '() args=' + JSON.stringify(args).slice(0,80));
            return val.apply(t, args);
          };
        }
        console.log('[SolanaProxy] GET:' + prop + '=' + (typeof val === 'object' ? '[obj]' : String(val).slice(0,60)));
      }
      return val;
    },
    set(t, prop, v) {
      console.log('[SolanaProxy] SET:' + String(prop));
      t[prop] = v; return true;
    }
  });
  window.phantom = { solana: window.solana };

  window.addEventListener('unhandledrejection', (ev) => {
    const msg = ev.reason && (ev.reason.message || ev.reason.toString) ? (ev.reason.message || ev.reason.toString()) : String(ev.reason);
    console.error('[UNHANDLED REJECTION] ' + msg.slice(0, 300));
  });

  console.log('[FakeSolana] Phantom + WalletStandard injected, pubkey:', PUB_B58);

  // Spoof Phantom chrome extension identity.
  // Some dApps check window.phantom or chrome.runtime.id === Phantom's extension ID
  // before calling wallet-standard connect. Without this they bail and show "not installed".
  const PHANTOM_EXT_ID = 'bfnaelmomeimhlpmgjnjophhpkkoljpa';
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      Object.defineProperty(chrome.runtime, 'id', {
        get: () => PHANTOM_EXT_ID, configurable: true,
      });
    } catch(e) { /* best-effort */ }
  } else if (typeof window !== 'undefined') {
    // chrome may not exist in injected scripts — define minimal stub
    try {
      window.chrome = window.chrome || {};
      window.chrome.runtime = window.chrome.runtime || {};
      Object.defineProperty(window.chrome.runtime, 'id', {
        get: () => PHANTOM_EXT_ID, configurable: true,
      });
      // sendMessage stub — Phantom extension communication channel
      window.chrome.runtime.sendMessage = function(extId, msg, opts, cb) {
        console.log('[ChromeStub] sendMessage extId=' + extId + ' msg=' + JSON.stringify(msg).slice(0,100));
        const callback = typeof opts === 'function' ? opts : cb;
        if (callback) setTimeout(() => callback({ result: 'ok' }), 50);
      };
    } catch(e) { /* best-effort */ }
  }
})();
`);

// Capture network traffic + WebSocket messages
const captured = [];
const wsMessages = [];
context.on('request', req => {
  const u = req.url();
  captured.push({ type: 'REQ', method: req.method(), url: u.slice(0, 150), body: req.postData()?.slice(0, 300) });
});
context.on('response', async res => {
  const u = res.url();
  if (u.includes('api.moove') || u.includes('/api/') || u.includes('auth') || u.includes('nonce') || u.includes('walletconnect.com')) {
    try {
      const body = await res.text().catch(() => '');
      if (body) captured.push({ type: 'RES', status: res.status(), url: u.slice(0, 120), body: body.slice(0, 500) });
    } catch {}
  }
});
context.on('requestfailed', req => {
  captured.push({ type: 'FAIL', method: req.method(), url: req.url().slice(0, 200), reason: req.failure()?.errorText });
});

const page = await context.newPage();

// CDP-level WebSocket capture
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.webSocketCreated', (ev) => {
  wsMessages.push({ type: 'WS_CREATED', url: ev.url?.slice(0, 200) });
  console.error('[CDP WS CREATED]', ev.url?.slice(0, 150));
});
cdp.on('Network.webSocketFrameReceived', (ev) => {
  wsMessages.push({ type: 'WS_RECV', data: ev.response?.payloadData?.slice(0, 300) });
  console.error('[CDP WS RECV]', ev.response?.payloadData?.slice(0, 200));
});
cdp.on('Network.webSocketFrameSent', (ev) => {
  wsMessages.push({ type: 'WS_SENT', data: ev.request?.payloadData?.slice(0, 300) });
  console.error('[CDP WS SENT]', ev.request?.payloadData?.slice(0, 200));
});

const pageConsole = [];
page.on('console', msg => {
  const text = msg.text();
  pageConsole.push(`[${msg.type()}] ${text.slice(0, 300)}`);
});
page.on('pageerror', err => pageConsole.push(`[PAGEERR] ${err.message.slice(0, 200)}`));

// 1. Set referral cookie
console.log('\n[1] Setting referral cookie...');
await page.goto('https://moove.xyz/@thetroll/refer', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

// 2. Navigate to profile
console.log('[2] Navigating to /profile...');
await page.goto('https://moove.xyz/profile', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// 3. Dismiss overlay
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// 4. Fill handle
const handleInput = page.locator('input').first();
if (await handleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await handleInput.fill('troll_sol_001');
  console.log('[4] Handle filled: troll_sol_001');
}

// 5. Click Connect
const connectClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => b.textContent?.toLowerCase().includes('connect'));
  if (btn) { btn.click(); return btn.textContent?.trim(); }
  return null;
});
console.log('[5] Connect clicked:', connectClicked);
await page.waitForTimeout(2500);

// 6. Two-step click: Wallet picker → Select Network
// Step 6a: Click Phantom in the wallet list
await page.waitForTimeout(2000);
const phantomWalletClick = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const phantomBtn = buttons.find(b => b.textContent?.includes('Phantom'));
  if (phantomBtn) {
    phantomBtn.click();
    return `Wallet click: "${phantomBtn.textContent?.trim()?.slice(0, 60)}"`;
  }
  return 'Phantom wallet button not found';
});
console.log('[6a] Wallet modal click:', phantomWalletClick);
await page.waitForTimeout(2500); // Wait for sub-modal to open

// Step 6a.5: Dump what's in the Select Network dialog
const subModalDump = await page.evaluate(() => {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  return dialogs.map(d => ({
    text: d.innerText?.trim()?.slice(0, 200),
    buttons: Array.from(d.querySelectorAll('button')).map(b => ({
      text: b.innerText?.trim()?.slice(0, 50),
      disabled: b.disabled,
      tag: b.tagName,
    })),
    clickables: Array.from(d.querySelectorAll('[onclick], [role="button"], li, [tabindex]')).map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim()?.slice(0, 40),
      role: el.getAttribute('role'),
    })).slice(0, 20),
  }));
});
console.log('[6a.5] Sub-modal dump:', JSON.stringify(subModalDump, null, 2).slice(0, 3000));

// Step 6b: Click Phantom network option using real mouse coordinates
await page.waitForTimeout(500);

// Screenshot before click
await page.screenshot({ path: 'moove_before_click.png', fullPage: false });
console.log('[6b] Screenshot saved: moove_before_click.png');

// Check pointer-events and body state
const pageState = await page.evaluate(() => {
  const pointerEvents = window.getComputedStyle(document.body).pointerEvents;
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  return {
    bodyPointerEvents: pointerEvents,
    bodyDisplay: window.getComputedStyle(document.body).display,
    dialogCount: dialogs.length,
    dialogStates: dialogs.map(d => ({
      state: d.getAttribute('data-state'),
      pointerEvents: window.getComputedStyle(d).pointerEvents,
      display: window.getComputedStyle(d).display,
      visibility: window.getComputedStyle(d).visibility,
      opacity: window.getComputedStyle(d).opacity,
    })),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
});
console.log('[6b] Page state before click:', JSON.stringify(pageState, null, 2));

// Get bounding box of the second Phantom button (the network option, not the wallet back button)
let clickResult = 'not attempted';
try {
  const phantomBtns = page.locator('[role="dialog"] button:has-text("Phantom")');
  const count = await phantomBtns.count();
  console.log('[6b] Phantom buttons in dialog:', count);

  // Get bbox of the LAST Phantom button (the network option)
  const lastBtn = phantomBtns.last();
  const bbox = await lastBtn.boundingBox();
  console.log('[6b] Last Phantom button bbox:', JSON.stringify(bbox));

  if (bbox) {
    // Real mouse click with coordinates (center of element)
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    console.log('[6b] Mouse clicking at:', cx, cy);
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(100);
    await page.mouse.click(cx, cy);
    clickResult = `Mouse click at (${Math.round(cx)}, ${Math.round(cy)})`;

    // Screenshot immediately after click
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'moove_after_click.png', fullPage: false });
    console.log('[6b] After-click screenshot saved: moove_after_click.png');

    // Also try clicking the FIRST Phantom (ETH) if bottom doesn't work
    const firstPhantomBox = await phantomBtns.first().boundingBox();
    if (firstPhantomBox) {
      const cx2 = firstPhantomBox.x + firstPhantomBox.width / 2;
      const cy2 = firstPhantomBox.y + firstPhantomBox.height / 2;
      console.log('[6b] Also trying first Phantom (ETH) at:', cx2, cy2);
      await page.mouse.move(cx2, cy2);
      await page.waitForTimeout(100);
      await page.mouse.click(cx2, cy2);
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'moove_after_eth_click.png', fullPage: false });
      console.log('[6b] After-ETH-click screenshot saved');
    }
  } else {
    // Fallback: force click
    await lastBtn.click({ force: true });
    clickResult = 'force click (no bbox)';
  }
} catch (e) {
  clickResult = 'ERROR: ' + e.message?.slice(0, 100);
}
console.log('[6b]', clickResult);

await page.waitForTimeout(3000);

// 7. Poll for Solana sign request
console.log('[7] Polling for solana signMessage (30s)...');
const deadline = Date.now() + 30000;
let signed = false;
while (Date.now() < deadline) {
  const req = await page.evaluate(() => window.__solanaSignRequest).catch(() => null);
  if (req) {
    console.log('[7] SIGN REQUEST received! msgHex:', req.messageHex.slice(0, 80));
    const msgBuffer = Buffer.from(req.messageHex, 'hex');
    const sigBuffer = signEd25519(keypair.privateKey, msgBuffer);
    const sigBytes = [...sigBuffer];
    await page.evaluate((bytes) => {
      window.__solanaSignResult = { sigBytes: bytes };
    }, sigBytes);
    console.log('[7] Signed ✓ sig:', sigBuffer.toString('hex').slice(0, 40) + '...');
    signed = true;
    break;
  }
  await page.waitForTimeout(300);
}

if (!signed) {
  console.log('[7] No sign request. Page state:');
  console.log('URL:', page.url());
  const body = (await page.innerText('body').catch(() => '')).slice(0, 300).replace(/\n+/g, ' ');
  console.log('Body:', body);

  // Check WalletConnect state in page
  const wcState = await page.evaluate(() => {
    // Try to get WC pairing URI or session data from window
    return {
      wcUri: window.__wcUri || window.walletConnectUri || null,
      wcStore: (() => {
        try { return Object.entries(localStorage).filter(([k]) => k.includes('wc') || k.includes('wallet')).map(([k,v]) => [k, v.slice(0,100)]); } catch { return []; }
      })(),
      solanaSignCalled: window.__solanaSignCalled || false,
      solanaConnectCalled: window.__solanaConnectCalled || false,
    };
  }).catch(() => ({}));
  console.log('[7] WC state:', JSON.stringify(wcState).slice(0, 500));
}

await page.waitForTimeout(5000);

// Save and print results
writeFileSync('moove_traffic_phantom.json', JSON.stringify(captured.filter(c =>
  !c.url.includes('relay.link') && !c.url.includes('coingecko') && !c.url.includes('githubusercontent')
), null, 2));

console.log('\n=== Page Console (ALL) ===');
pageConsole.slice(-50).forEach(m => console.log(m));

console.log('\n=== WebSocket Activity ===');
if (wsMessages.length === 0) console.log('(no WS connections at all)');
wsMessages.slice(0, 30).forEach(m => console.log(`[${m.type}]`, (m.url || m.data || '').slice(0, 200)));

const interesting = captured.filter(r =>
  r.url.includes('api.moove') || r.url.includes('/api/') || r.url.includes('auth') || r.url.includes('nonce')
);
console.log('\n=== moove API Calls ===');
if (interesting.length === 0) console.log('(none)');
interesting.forEach(r => {
  console.log(`[${r.type}] ${r.method || r.status} ${r.url}`);
  if (r.body) console.log('    ', r.body.slice(0, 300));
});

await browser.close();
