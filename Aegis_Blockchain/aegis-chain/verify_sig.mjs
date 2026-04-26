/**
 * verify_sig.mjs — Verify our Ed25519 signing matches what the server would verify
 */
import { generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'crypto';

function base58(bytes) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let r = '';
  while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r; }
  return r;
}

function base58To(str) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const c of str) {
    const i = A.indexOf(c);
    if (i < 0) throw new Error(`bad char: ${c}`);
    n = n * 58n + BigInt(i);
  }
  const hex = n.toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}

// 1. Generate keypair
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const pubBytes = pubDer.slice(-32);
const address = base58(pubBytes);
console.log('Address:', address);

// 2. Mock nonce (UUID format like moove sends)
const nonce = 'f310eb75-b6fd-48e7-8f0f-a888df6731ff';
const msgBytes = Buffer.from(nonce, 'utf8');
console.log('Nonce:', nonce);
console.log('MsgBytes hex:', msgBytes.toString('hex'));

// 3. Sign
const sigBuffer = cryptoSign(null, msgBytes, privateKey);
const sigB58 = base58(sigBuffer);
console.log('Signature b58:', sigB58.slice(0, 40) + '...');
console.log('Signature hex:', sigBuffer.toString('hex').slice(0, 40) + '...');
console.log('Signature length:', sigBuffer.length, 'bytes');  // Should be 64

// 4. Local verify
const isValid = cryptoVerify(null, msgBytes, publicKey, sigBuffer);
console.log('\nLocal verify result:', isValid, '(expected: true)');

// 5. Test round-trip through b58 encoding/decoding
const sigDecoded = base58To(sigB58);
const isValidRoundTrip = cryptoVerify(null, msgBytes, publicKey, sigDecoded);
console.log('Round-trip b58 verify:', isValidRoundTrip, '(expected: true)');

// 6. Check API request flow (what happens when registration is attempted)
console.log('\n--- API test (no browser reCAPTCHA) ---');
const HDRS = { 'Content-Type': 'application/json', 'Origin': 'https://www.moove.xyz' };

// Get nonce from server
const nr = await fetch('https://api.moove.xyz/v1/auth/request', {
  method: 'POST', headers: HDRS,
  body: JSON.stringify({ address, chainType: 'SVM' }),
});
const nd = await nr.json();
console.log('Server nonce:', nd.message, 'canSignIn:', nd.canSignIn);

// Sign server nonce
const serverNonce = nd.message;
const serverMsgBytes = Buffer.from(serverNonce, 'utf8');
const serverSig = cryptoSign(null, serverMsgBytes, privateKey);
const serverSigB58 = base58(serverSig);

// Local verify of server nonce signature
const serverLocalVerify = cryptoVerify(null, serverMsgBytes, publicKey, serverSig);
console.log('Server nonce local verify:', serverLocalVerify);

// Try auth/token (expected to fail for new address, but let's see error)
const tr = await fetch('https://api.moove.xyz/v1/auth/token', {
  method: 'POST', headers: HDRS,
  body: JSON.stringify({ address, signature: serverSigB58, message: serverNonce, chainType: 'SVM' }),
});
const td = await tr.json();
console.log('Auth token response:', tr.status, JSON.stringify(td).slice(0, 200));
