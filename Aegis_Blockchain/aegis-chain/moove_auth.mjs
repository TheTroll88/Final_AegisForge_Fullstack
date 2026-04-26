/**
 * moove_auth.mjs — Direct API auth for moove.xyz
 *
 * Flow:
 *  1. POST /v1/auth/request → get UUID nonce
 *  2. Sign UUID bytes with Ed25519
 *  3. POST /v1/auth/token → get accessToken (or "canSignIn:false" = need registration)
 *  4. If canSignIn:false → POST /v1/users/create → then POST /v1/auth/token again
 *  5. Use accessToken to GET /v1/referrals/claim with thetroll referral
 *
 * Run: node moove_auth.mjs
 * Run: node moove_auth.mjs --count 5   (register 5 wallets)
 */

import { sign as cryptoSign, generateKeyPairSync } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const API = 'https://api.moove.xyz';
const REFERRER = 'thetroll';
const STATE_FILE = 'moove_accounts.json';

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function genKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  return { privateKey, pubBytes: pubDer.slice(-32) };
}

function base58(bytes) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

function signMsg(privateKey, message) {
  // Ed25519 in Node.js: use sign(null, data, key) — NOT createSign
  const msgBytes = Buffer.from(message, 'utf8');
  return cryptoSign(null, msgBytes, privateKey); // returns Buffer
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Origin': 'https://www.moove.xyz',
  'Referer': 'https://www.moove.xyz/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function apiPost(path, body, token) {
  const hdrs = { ...BASE_HEADERS };
  if (token) hdrs['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { status: r.status, data };
}

async function apiGet(path, params, token) {
  const hdrs = { ...BASE_HEADERS };
  if (token) hdrs['Authorization'] = `Bearer ${token}`;
  const url = new URL(`${API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), {
    headers: hdrs,
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { status: r.status, data };
}

// ─── Core auth flow ───────────────────────────────────────────────────────────

async function authWithWallet(keypair, address) {
  // Step 1: Get nonce
  const nonceRes = await apiPost('/v1/auth/request', { address, chainType: 'SVM' });
  console.log('  Nonce response:', nonceRes.status, JSON.stringify(nonceRes.data).slice(0, 120));

  if (nonceRes.status !== 200 || !nonceRes.data.message) {
    throw new Error(`Nonce failed: ${JSON.stringify(nonceRes.data).slice(0, 100)}`);
  }

  const nonce = nonceRes.data.message; // UUID string
  const canSignIn = nonceRes.data.canSignIn;
  console.log(`  Nonce: ${nonce}, canSignIn: ${canSignIn}`);

  // Step 2: Sign the nonce
  const sigBuffer = signMsg(keypair.privateKey, nonce);
  const sigB58 = base58(sigBuffer);
  console.log(`  Signature (b58): ${sigB58.slice(0, 20)}...`);

  // Step 3: Exchange for token
  let tokenRes = await apiPost('/v1/auth/token', {
    address,
    signature: sigB58,
    message: nonce,
    chainType: 'SVM',
  });
  console.log('  Token response:', tokenRes.status, JSON.stringify(tokenRes.data).slice(0, 200));

  // If canSignIn was false, we need to POST create first, then re-auth
  if (tokenRes.status !== 200 && !canSignIn) {
    console.log('  → New user. Attempting registration...');
    return { nonce, sigB58, canSignIn: false, tokenData: tokenRes.data };
  }

  const tokens = tokenRes.data;
  if (!tokens.accessToken) throw new Error('No accessToken in response');
  return { nonce, sigB58, canSignIn: true, tokens };
}

async function registerUser(address, handle, nonce, sigB58) {
  // Real endpoint: /v1/registration (confirmed from bundle + browser capture)
  // Real body: handle, address, signature, tokenAddress:null, chainId:null, recaptchaToken
  // recaptchaToken REQUIRED — must come from browser (pass --captcha-token to use a real one)

  const captchaToken = process.env.MOOVE_CAPTCHA_TOKEN || process.argv.find((a,i) => process.argv[i-1]==='--captcha-token');
  if (!captchaToken) {
    console.log('  ⚠ No captchaToken — registration will fail (reCAPTCHA enterprise required)');
    console.log('  → Set MOOVE_CAPTCHA_TOKEN env var or pass --captcha-token <token>');
    console.log('  → Use probe_moove_stealth.mjs to capture a token from a logged-in browser');
  }

  const body = {
    handle,
    address,
    signature: sigB58,
    tokenAddress: null,
    chainId: null,
    recaptchaToken: captchaToken || 'INVALID_TOKEN',
  };

  const r = await apiPost('/v1/registration', body);
  console.log(`  Register: ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  if (r.status >= 200 && r.status < 300) return r.data;
  return null;
}

async function claimReferral(token, address) {
  // Real endpoints: /v1/referral, /v1/referral/statistics
  const attempts = [
    { method: 'POST', path: '/v1/referral', body: { referralCode: REFERRER } },
    { method: 'POST', path: '/v1/referral', body: { code: REFERRER, address } },
    { method: 'GET', path: '/v1/referral', params: { code: REFERRER } },
  ];

  for (const attempt of attempts) {
    let r;
    if (attempt.method === 'GET') {
      r = await apiGet(attempt.path, attempt.params, token);
    } else {
      r = await apiPost(attempt.path, attempt.body, token);
    }
    console.log(`  Referral [${attempt.path}]: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    if (r.status >= 200 && r.status < 300) return r.data;
  }
  return null;
}

async function getMe(token) {
  const r = await apiGet('/v1/me', null, token);
  console.log(`  /me: ${r.status}`, JSON.stringify(r.data).slice(0, 300));
  return r.data;
}

// ─── State ────────────────────────────────────────────────────────────────────

function loadAccounts() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch {}
  }
  return [];
}

function saveAccounts(accounts) {
  writeFileSync(STATE_FILE, JSON.stringify(accounts, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const COUNT = process.argv.includes('--count')
  ? parseInt(process.argv[process.argv.indexOf('--count') + 1], 10)
  : 1;

const accounts = loadAccounts();
console.log(`\n╔══════════════════════════════════════╗`);
console.log(`║     moove.xyz Direct Auth Engine     ║`);
console.log(`╚══════════════════════════════════════╝`);
console.log(`Referrer: @${REFERRER}`);
console.log(`Registering: ${COUNT} wallet(s)\n`);

for (let i = 0; i < COUNT; i++) {
  const kp = genKeypair();
  const address = base58(kp.pubBytes);
  const handle = `troll_${Math.random().toString(36).slice(2, 9)}`;

  console.log(`\n─── Wallet ${i + 1}/${COUNT} ───────────────────────────`);
  console.log(`Address: ${address}`);
  console.log(`Handle:  ${handle}`);

  try {
    // Check handle availability
    const checkRes = await apiGet('/v1/registration-check', { handle });
    console.log(`Handle check: ${checkRes.status}`, JSON.stringify(checkRes.data).slice(0, 80));

    // Auth / get nonce
    let authResult = await authWithWallet(kp, address);

    if (!authResult.canSignIn) {
      console.log('\n  → Trying registration...');
      await registerUser(address, handle, authResult.nonce, authResult.sigB58);

      // Re-auth after registration
      console.log('\n  → Re-authenticating...');
      authResult = await authWithWallet(kp, address);
    }

    if (authResult.tokens) {
      const { accessToken, refreshToken, accessTokenExpiration } = authResult.tokens;
      console.log('\n  ✅ AUTHENTICATED!');
      console.log(`  Token: ${accessToken?.slice(0, 30)}...`);
      console.log(`  Expires: ${accessTokenExpiration}`);

      // Get profile
      await getMe(accessToken);

      // Claim referral
      console.log('\n  → Claiming referral @thetroll...');
      const refResult = await claimReferral(accessToken, address);
      if (refResult) console.log('  ✅ Referral claimed!', JSON.stringify(refResult).slice(0, 100));
      else console.log('  ✗ Referral claim failed (see errors above)');

      accounts.push({
        address,
        handle,
        accessToken,
        refreshToken,
        expires: accessTokenExpiration,
        ts: Date.now(),
        referralClaimed: !!refResult,
      });
    } else {
      console.log('  ✗ Could not get access token');
      accounts.push({ address, handle, failed: true, ts: Date.now() });
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    accounts.push({ address, handle, error: e.message, ts: Date.now() });
  }

  saveAccounts(accounts);

  // Polite delay between registrations
  if (i < COUNT - 1) await new Promise(r => setTimeout(r, 2000));
}

console.log(`\n─── Done ─────────────────────────────────────`);
console.log(`Results saved to ${STATE_FILE}`);
const succeeded = accounts.filter(a => a.accessToken).length;
console.log(`Successful auths: ${succeeded}/${accounts.length}`);
