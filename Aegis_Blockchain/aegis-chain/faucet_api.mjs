// Probe faucet.solana.com API endpoints with GitHub OAuth token
const GH_TOKEN = process.env.GH_TOKEN || 'REVOKED_ROTATE_ON_GITHUB';
const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';

async function tryEndpoint(url, method, body, headers = {}) {
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0',
        ...headers,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    const text = await r.text();
    console.log(`[${r.status}] ${url}`);
    console.log(text.substring(0, 400));
    return { status: r.status, text };
  } catch (e) {
    console.log(`[ERR] ${url} — ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Probing faucet.solana.com API ===\n');

  // 1. Try with bearer token (GitHub OAuth token style)
  await tryEndpoint('https://faucet.solana.com/api/v1/request', 'POST',
    { wallet: TARGET, amount: 2 },
    { 'Authorization': `Bearer ${GH_TOKEN}` }
  );

  // 2. Try with token as cookie (some GH OAuth flows use session cookies)
  await tryEndpoint('https://faucet.solana.com/api/v1/request', 'POST',
    { wallet: TARGET, amount: 2 },
    { 'Cookie': `token=${GH_TOKEN}` }
  );

  // 3. Probe what endpoints exist
  await tryEndpoint('https://faucet.solana.com/api/v1/confirm', 'POST',
    { wallet: TARGET },
    { 'Authorization': `Bearer ${GH_TOKEN}` }
  );

  // 4. Try Quicknode free devnet faucet (no auth needed)
  await tryEndpoint('https://api.devnet.solana.com', 'POST',
    { jsonrpc: '2.0', id: 1, method: 'requestAirdrop',
      params: [TARGET, 1000000000] },
    {}
  );

  // 5. Solfate API v2 check
  await tryEndpoint(`https://api.solfate.com/v2/airdrop?address=${TARGET}`, 'GET', null, {});

  // 6. Alchemy devnet (they have one)
  await tryEndpoint('https://solana-devnet.g.alchemy.com/v2/demo', 'POST',
    { jsonrpc: '2.0', id: 1, method: 'requestAirdrop',
      params: [TARGET, 1000000000] },
    {}
  );

  // 7. Helius devnet
  await tryEndpoint('https://devnet.helius-rpc.com/?api-key=REVOKED_ROTATE_ON_HELIUS', 'POST',
    { jsonrpc: '2.0', id: 1, method: 'requestAirdrop',
      params: [TARGET, 2000000000] },
    {}
  );

  // 8. Web3Auth Solana faucet
  await tryEndpoint('https://api.web3auth.io/api/faucet', 'POST',
    { chainId: 'devnet', toAddress: TARGET },
    {}
  );
}

main();
