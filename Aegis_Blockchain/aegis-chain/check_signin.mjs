/**
 * check_signin.mjs — Check if a wallet was registered on moove
 * and attempt to sign in if so (requires the private key)
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

const HDRS = { 'Content-Type': 'application/json', 'Origin': 'https://www.moove.xyz' };

// Address from last probe run — check if it was registered
const addr = '7pMxcR1UFJrPZed34nz93Hb5c4FmJEXKsEBFifoEiY8C';
const r = await fetch('https://api.moove.xyz/v1/auth/request', {
  method: 'POST',
  headers: HDRS,
  body: JSON.stringify({ address: addr, chainType: 'SVM' }),
});
const d = await r.json();
console.log(`canSignIn for ${addr.slice(0,8)}...: ${d.canSignIn} (nonce: ${d.message})`);

// Also test registration with tokenAddress/chainId fields
console.log('\n--- Testing real registration body shape ---');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const newAddr = base58(pubDer.slice(-32));
// Get nonce
const n1 = await fetch('https://api.moove.xyz/v1/auth/request', {
  method: 'POST', headers: HDRS, body: JSON.stringify({ address: newAddr, chainType: 'SVM' }),
});
const nd = await n1.json();
console.log('New nonce:', nd.message, 'canSignIn:', nd.canSignIn);
// Sign it
const sig = base58(cryptoSign(null, Buffer.from(nd.message, 'utf8'), privateKey));
// Register with real field structure (tokenAddress/chainId = null)
const reg = await fetch('https://api.moove.xyz/v1/registration', {
  method: 'POST',
  headers: HDRS,
  body: JSON.stringify({
    handle: 'troll' + Math.random().toString(36).slice(2, 8),
    address: newAddr,
    signature: sig,
    tokenAddress: null,
    chainId: null,
    chainType: 'SVM',
    recaptchaToken: 'fake'
  }),
});
const rd = await reg.json();
console.log('Registration with real shape:', reg.status, JSON.stringify(rd).slice(0, 200));
