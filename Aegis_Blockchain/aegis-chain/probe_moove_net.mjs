/**
 * moove.xyz network interceptor
 * Captures all API calls during wallet connect → shows us the real auth flow
 * Tries handle-first approach (fill input before clicking Connect)
 */
import { ethers } from 'ethers';
import { writeFileSync } from 'fs';
import { chromium } from 'playwright-core';

const BRAVE = 'C:\\Users\\natha\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const wallet = ethers.Wallet.createRandom();
console.log('Test wallet:', wallet.address);

const browser = await chromium.launch({
  headless: false,    // VISIBLE — watch what happens
  executablePath: BRAVE,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  slowMo: 300,        // slow enough to observe
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});

// ── Inject fake MetaMask/ethereum provider ──
await context.addInitScript(`
(function() {
  let _signReqs = [];
  window.__mooveSignRequest = null;
  window.__mooveSignResult = null;

  const ADDR = '${wallet.address}';
  const provider = {
    isMetaMask: true,
    selectedAddress: ADDR,
    chainId: '0x1',
    networkVersion: '1',
    _events: {},
    request({ method, params }) {
      console.log('[FakeETH] request:', method, JSON.stringify(params || []).slice(0, 80));
      return new Promise((resolve, reject) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return resolve([ADDR]);
        if (method === 'eth_chainId') return resolve('0x1');
        if (method === 'net_version') return resolve('1');
        if (method === 'eth_getBalance') return resolve('0x56BC75E2D63100000');
        if (method === 'wallet_switchEthereumChain') return resolve(null);
        if (method === 'personal_sign' || method === 'eth_sign' || method === 'eth_signTypedData_v4') {
          window.__mooveSignRequest = { method, params };
          const poll = setInterval(() => {
            if (window.__mooveSignResult !== null) {
              clearInterval(poll);
              const r = window.__mooveSignResult;
              window.__mooveSignResult = null;
              window.__mooveSignRequest = null;
              r.error ? reject(new Error(r.error)) : resolve(r.signature);
            }
          }, 100);
          return;
        }
        console.warn('[FakeETH] unhandled:', method);
        resolve(null);
      });
    },
    on(event, cb) { this._events[event] = cb; },
    emit(event, ...args) { if (this._events[event]) this._events[event](...args); },
    removeListener() {},
    enable() { return this.request({ method: 'eth_requestAccounts' }); },
  };

  Object.defineProperty(window, 'ethereum', { value: provider, writable: true, configurable: true });
  window.web3 = { currentProvider: provider };
  console.log('[FakeETH] injected, addr:', ADDR);
})();
`);

// ── Capture ALL network requests ──
const captured = [];
context.on('request', req => {
  const u = req.url();
  if (!u.includes('walletconnect.com/logo') && !u.includes('coingecko') && !u.includes('geckoterminal')) {
    captured.push({ type: 'REQ', method: req.method(), url: u.slice(0, 120), body: req.postData()?.slice(0, 200) });
  }
});
context.on('response', async res => {
  const u = res.url();
  if ((u.includes('/api/') || u.includes('moove') || u.includes('auth') || u.includes('user') || u.includes('profile'))
      && !u.includes('walletconnect.com/logo')) {
    try {
      const body = await res.text().catch(() => '');
      if (body && body.length < 1000) {
        captured.push({ type: 'RES', status: res.status(), url: u.slice(0, 120), body: body.slice(0, 300) });
      }
    } catch {}
  }
});

const page = await context.newPage();

// ── Capture page console + errors ──
const pageConsole = [];
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('FakeETH') || text.includes('error') || text.includes('Error') || text.includes('wagmi') || text.includes('wallet') || text.includes('connect')) {
    pageConsole.push(`[${msg.type()}] ${text.slice(0, 200)}`);
  }
});
page.on('pageerror', err => pageConsole.push(`[PAGEERR] ${err.message.slice(0, 200)}`));

// Navigate to referral URL first to set cookie
console.log('\n[1] Setting referral cookie...');
await page.goto('https://moove.xyz/@thetroll/refer', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

// Go to profile page
console.log('[2] Navigating to /profile...');
await page.goto('https://moove.xyz/profile', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// Try to trigger connect directly via JS (wagmi connect API)
console.log('[3] Trying direct JS connect...');
const jsResult = await page.evaluate(async () => {
  // Try to find wagmi store / config
  const keys = Object.keys(window).filter(k => k.toLowerCase().includes('wagmi') || k.toLowerCase().includes('web3'));
  return { keys: keys.slice(0, 10), hasEthereum: !!window.ethereum, addr: window.ethereum?.selectedAddress };
});
console.log('Window state:', JSON.stringify(jsResult));

// Dismiss overlay
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// Find handle input and fill it FIRST
console.log('[4] Looking for handle input...');
const handleInput = await page.locator('input').first();
const inputVisible = await handleInput.isVisible({ timeout: 5000 }).catch(() => false);
console.log('Handle input visible:', inputVisible);
if (inputVisible) {
  await handleInput.fill('troll_test_001');
  console.log('[4] Handle filled: troll_test_001');
  await page.waitForTimeout(1000);
}

// Now click Connect Wallet to trigger SIWE
console.log('[5] Clicking Connect Wallet...');
const connectClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => b.textContent?.toLowerCase().includes('connect'));
  if (btn) { btn.click(); return btn.textContent?.trim(); }
  return null;
});
console.log('[5] Clicked:', connectClicked);
await page.waitForTimeout(2500);

// Modal should be open — click MetaMask
console.log('[5b] Clicking MetaMask in modal...');
const mmClicked = await page.evaluate(() => {
  // Try all possible MetaMask elements — button, span, div, li
  const all = Array.from(document.querySelectorAll('*'));
  const mm = all.find(el =>
    el.children.length === 0 &&  // leaf node
    el.textContent?.trim() === 'MetaMask'
  );
  if (mm) {
    // Walk up to find a clickable parent
    let el = mm;
    for (let i = 0; i < 5; i++) {
      el.click();
      el = el.parentElement;
      if (!el) break;
    }
    return mm.textContent + ' found, clicked';
  }
  // Fallback: find any element with MetaMask text
  const fallback = all.find(el => el.textContent?.includes('MetaMask') && el instanceof HTMLElement);
  if (fallback) { fallback.click(); return 'fallback clicked: ' + fallback.tagName; }
  return null;
});
console.log('[5b] MetaMask click result:', mmClicked);

// Also try Playwright locator as backup
try {
  const mmLoc = page.locator('text=MetaMask').first();
  if (await mmLoc.isVisible({ timeout: 1000 })) {
    await mmLoc.click({ force: true });
    console.log('[5b] Playwright click on MetaMask ✓');
  }
} catch {}

await page.waitForTimeout(3000);

// Network selection step — appeared after MetaMask click
console.log('[5c] Checking for network selection...');
const networkState = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  const selectNet = all.some(el => el.textContent?.trim() === 'Select Network' || el.textContent?.includes('Select Network'));
  // Find network buttons — look for chain names
  const chains = ['Ethereum', 'Base', 'Polygon', 'BNB', 'Mainnet', 'Arbitrum', 'Optimism'];
  const found = chains.filter(c => all.some(el => el.textContent?.trim() === c || el.textContent?.trim().startsWith(c)));
  return { selectNetVisible: selectNet, chainsFound: found };
});
console.log('[5c] Network state:', JSON.stringify(networkState));

if (networkState.selectNetVisible) {
  // body has pointer-events:none (Radix modal animation) — use Playwright native click
  // which uses CDP Input.dispatchMouseEvent and bypasses CSS pointer-events
  console.log('[5c] Waiting for modal to fully render...');
  await page.waitForTimeout(2000);

  // The network selector shows chain icons from relay.link — click parent of first icon
  // Try multiple approaches
  let netClicked = false;

  // Approach 1: Click relay.link image — this is the chain icon, bubbles to chain selector
  try {
    const chainImgs = page.locator('img[src*="relay.link/icons/square"]');
    const imgCount = await chainImgs.count();
    console.log('[5c] relay.link chain icons found:', imgCount);
    if (imgCount > 0) {
      await chainImgs.first().click({ force: true });
      console.log('[5c] Clicked first chain icon ✓');
      netClicked = true;
    }
  } catch(e) { console.log('[5c] icon click error:', e.message.slice(0, 50)); }

  // Approach 2: Second button in dialog (first is usually back/close)
  if (!netClicked) {
    try {
      const dialogBtns = page.locator('[role="dialog"] button, [data-state="open"] button');
      const count = await dialogBtns.count();
      console.log('[5c] Dialog buttons found:', count);
      if (count > 1) {
        await dialogBtns.nth(1).click({ force: true });
        console.log('[5c] Clicked dialog button [1] ✓');
        netClicked = true;
      }
    } catch(e) { console.log('[5c] Approach 2 error:', e.message.slice(0, 50)); }
  }

  // Approach 2: Find image with relay.link src — it's a chain icon in the network selector
  if (!netClicked) {
    try {
      const chainIcon = page.locator('img[src*="relay.link"]').first();
      if (await chainIcon.isVisible({ timeout: 2000 })) {
        // Click the ancestor button
        const parentBtn = chainIcon.locator('xpath=ancestor::button[1]');
        if (await parentBtn.count() > 0) {
          await parentBtn.click({ force: true });
          console.log('[5c] Clicked chain icon parent button ✓');
          netClicked = true;
        } else {
          await chainIcon.click({ force: true });
          console.log('[5c] Clicked chain icon directly ✓');
          netClicked = true;
        }
      }
    } catch {}
  }

  // Approach 3: Use mouse.click at known position (last resort)
  if (!netClicked) {
    // Click somewhere in the center-ish of the page where modal buttons are
    await page.mouse.click(720, 400);
    console.log('[5c] Fallback: mouse click at center');
  }

  await page.waitForTimeout(2000);
}

// Poll for sign request
console.log('[6] Waiting for SIWE sign request (30s)...');
const deadline = Date.now() + 30000;
let signed = false;
while (Date.now() < deadline) {
  const req = await page.evaluate(() => window.__mooveSignRequest).catch(() => null);
  if (req) {
    console.log('[6] SIGN REQUEST:', req.method, JSON.stringify(req.params).slice(0, 200));
    // Sign it
    let sig;
    const msg = req.params[0];
    if (req.method === 'personal_sign') {
      const decoded = msg.startsWith('0x') ? Buffer.from(msg.slice(2), 'hex').toString('utf8') : msg;
      sig = await wallet.signMessage(decoded);
    } else {
      sig = await wallet.signMessage(msg);
    }
    await page.evaluate((s) => { window.__mooveSignResult = { signature: s }; }, sig);
    console.log('[6] Signed! Waiting for profile creation...');
    signed = true;
    break;
  }
  await page.waitForTimeout(500);
}

if (!signed) {
  console.log('[6] No sign request received. Dumping page state...');
  const url = page.url();
  const text = (await page.innerText('body').catch(() => '')).slice(0, 400).replace(/\n+/g, ' ');
  console.log('URL:', url);
  console.log('Body:', text);
}

await page.waitForTimeout(5000);

// Save captured traffic
writeFileSync('moove_traffic.json', JSON.stringify(captured, null, 2));
console.log('\n[7] Captured', captured.length, 'requests → moove_traffic.json');

// Print API-looking ones
const interesting = captured.filter(r =>
  r.url.includes('/api/') || r.url.includes('auth') || r.url.includes('user') ||
  r.url.includes('profile') || r.url.includes('nonce') || r.url.includes('relay')
);
console.log('\n=== Interesting requests ===');
interesting.forEach(r => {
  console.log(`[${r.type}] ${r.method || r.status} ${r.url}`);
  if (r.body) console.log('    body:', r.body.slice(0, 150));
});

console.log('\n=== Page Console Messages ===');
pageConsole.slice(-20).forEach(m => console.log(m));

await browser.close();
