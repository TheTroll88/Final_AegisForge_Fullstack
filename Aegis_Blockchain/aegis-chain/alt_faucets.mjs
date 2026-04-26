// alt_faucets.mjs — try faucets that don't require GitHub OAuth
const TARGET = '7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY';

async function post(url, body, headers = {}) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', ...headers },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    console.log(`[${r.status}] ${url}`);
    console.log(t.substring(0, 300));
    return { status: r.status, text: t };
  } catch (e) { console.log(`[ERR] ${url}: ${e.message}`); return null; }
}

async function get(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } });
    const t = await r.text();
    console.log(`[GET ${r.status}] ${url}`);
    console.log(t.substring(0, 300));
    return { status: r.status, text: t };
  } catch (e) { console.log(`[ERR] ${url}: ${e.message}`); return null; }
}

async function main() {
  console.log('=== ALT FAUCET PROBE ===\n');

  // 1. QuickNode devnet faucet API
  await post('https://faucet.quicknode.com/api/v1/solana/devnet/request', { address: TARGET });
  await post('https://faucet.quicknode.com/solana/devnet', { address: TARGET });

  // 2. Alchemy Solana devnet faucet
  await post('https://solana-devnet.g.alchemy.com/v2/albt-FEFZ0GkjzBChqYt-o9s8YFd3_ZOb5n', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 2000000000]
  });
  await get(`https://faucets.alchemy.com/api/faucet?address=${TARGET}&chain=solana-devnet`);

  // 3. Triangle platform faucet (POW-based?)
  await get(`https://faucet.triangleplatform.com/api/solana/devnet?address=${TARGET}`);
  await post('https://faucet.triangleplatform.com/api/solana/devnet/request', { address: TARGET });

  // 4. Solana Labs testnet (different from devnet)
  await post('https://api.testnet.solana.com', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 1000000000]
  });

  // 5. Try Helius with a fresh / free key
  await post('https://devnet.helius-rpc.com/?api-key=REVOKED_ROTATE_ON_HELIUS', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 2000000000]
  });

  // 6. Drip.solana.com or similar community faucets
  await post('https://api.drip.trade/faucet/devnet', { wallet: TARGET });

  // 7. SOL faucet at solana-labs/example-helloworld project style
  await post('https://api.devnet.solana.com/', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 500000000]
  });

  // 8. Jito devnet RPC
  await post('https://devnet.jito-labs.xyz/rpc', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 1000000000]
  });

  // 9. Check if Sol.faucet.zenith or similar is active
  await get(`https://solana-airdrop.web3auth.io/?publicAddress=${TARGET}&network=devnet`);

  // 10. Syndica devnet
  await post('https://solana-devnet.rpcpool.com/', {
    jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TARGET, 1000000000]
  });

  console.log('\n=== Done ===');
}

main();
