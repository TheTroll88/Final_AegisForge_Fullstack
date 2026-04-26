/**
 * find_reg_fields.mjs — Discover remaining required fields for /v1/registration
 */
import { generateKeyPairSync, sign as cryptoSign } from 'crypto';

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
const addr = base58(pubDer.slice(-32));
const sigBuf = cryptoSign(null, Buffer.from('test-nonce-uuid', 'utf8'), privateKey);
const sig = base58(sigBuf);
console.log('addr:', addr);
console.log('sig:', sig.slice(0, 20), '...');

const base = 'https://api.moove.xyz/v1/registration';
const hdrs = { 'Content-Type': 'application/json', 'Origin': 'https://www.moove.xyz' };

async function post(body) {
  const r = await fetch(base, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
  const d = await r.json();
  return { status: r.status, errors: d.errors?.length ?? 0, raw: JSON.stringify(d).slice(0, 400) };
}

const known = { address: addr, handle: 'troll_test_a1', chainType: 'SVM', signature: sig };
const baseline = await post(known);
console.log('\nBaseline (4 fields):', baseline.errors, 'errors:', baseline.raw);
console.log('---');

// Extended candidate list
const candidates = [
  // Captcha
  'recaptchaToken', 'captchaToken', 'captcha', 'hcaptchaToken', 'hcaptcha',
  'turnstileToken', 'turnstile', 'cfTurnstileResponse', 'cfToken',
  'g-recaptcha-response', 'h-captcha-response', 'recaptcha',
  // Auth message
  'message', 'nonce', 'signedMessage', 'authMessage', 'signatureMessage',
  'proof', 'challenge', 'msg', 'data', 'payload',
  // Public key variants
  'publicKey', 'pubkey', 'pubKey', 'walletPublicKey', 'walletKey',
  'solanaPublicKey', 'solPubkey',
  // Referral
  'referralCode', 'referral', 'referrer', 'ref', 'inviteCode',
  'referralHandle', 'referrerHandle', 'inviterHandle',
  // Misc profile
  'username', 'name', 'bio', 'email',
  'termsAccepted', 'terms', 'acceptedTerms', 'agreeTerms',
  'platform', 'network', 'blockchain', 'type', 'wallet',
  'version', 'source', 'origin', 'app', 'provider',
  // Timestamp/nonce
  'timestamp', 'ts', 'time', 'expiry', 'expiresAt',
  'sessionId', 'requestId', 'trackingId',
];

for (const k of candidates) {
  const r = await post({ ...known, [k]: 'test_' + k });
  const changed = r.errors !== baseline.errors;
  const noRequiredErrors = r.errors === 0 || !r.raw.includes('Field required');
  if (changed || noRequiredErrors) {
    console.log('CANDIDATE:', k, '| errors:', baseline.errors, '->', r.errors, '|', r.raw.slice(0, 120));
  }
}

// Also try with boolean true
const boolCandidates = ['termsAccepted', 'terms', 'acceptedTerms', 'agreeToTerms', 'captchaCompleted'];
for (const k of boolCandidates) {
  const r = await post({ ...known, [k]: true });
  if (r.errors < baseline.errors) {
    console.log('BOOL CANDIDATE:', k, '| errors:', baseline.errors, '->', r.errors);
  }
}

console.log('\n--- All done ---');
console.log('If no CANDIDATE was found, the field may be auto-generated (captcha/token) in browser only.');
