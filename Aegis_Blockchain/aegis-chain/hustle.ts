/**
 * hustle.ts — Aggressive free crypto hunter
 *
 * Hits every real faucet and airdrop checker for Nathan's wallets.
 * Runs continuously, reports everything worth acting on.
 *
 * Wallets:
 *   Solana: A5x55fr2BzVS31WRmRc7okJ4utCkqkTJKBAiqoAxQy6 (Foreman)
 *   Solana: 3k2kHCqhLLnnQXX29CimrKYAsXdMBT4QdJSyX8Z7FGBU (Nathan FGBU)
 *   EVM:    0xF03e4D51F7132DA16d59f41f20B1B80712F8Af53 (Foreman Base)
 *   EVM:    0x30Cbd5ffb18B38cC77Cca71B609259547cB3be5B (Nathan Base)
 */

const WALLETS = {
  solana_foreman:  "A5x55fr2BzVS31WRmRc7okJ4utCkqkTJKBAiqoAxQy6",
  solana_nathan:   "3k2kHCqhLLnnQXX29CimrKYAsXdMBT4QdJSyX8Z7FGBU",
  evm_foreman:     "0xF03e4D51F7132DA16d59f41f20B1B80712F8Af53",
  evm_nathan:      "0x30Cbd5ffb18B38cC77Cca71B609259547cB3be5B",
};

const SOLANA_DEVNET  = "https://api.devnet.solana.com";
const SOLANA_MAINNET = "https://api.mainnet-beta.solana.com";

const H = "═".repeat(56);

function log(msg: string) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  [${ts}] ${msg}`);
}

function banner(title: string) {
  console.log(`\n  ╔${H}╗`);
  console.log(`  ║  ${title.padEnd(54)} ║`);
  console.log(`  ╚${H}╝`);
}

// ─── Solana RPC helper ────────────────────────────────────

async function solRpc(endpoint: string, method: string, params: any[]) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json() as any;
}

// ─── 1. DEVNET AIRDROP ────────────────────────────────────
// Free devnet SOL — useful for testing Solana programs

async function claimDevnetAirdrop(address: string, label: string): Promise<void> {
  log(`Requesting devnet SOL airdrop for ${label}...`);
  try {
    const res = await solRpc(SOLANA_DEVNET, "requestAirdrop", [address, 2_000_000_000]); // 2 SOL
    if (res.result) {
      log(`✓ Devnet airdrop sent! TX: ${res.result}`);
      log(`  → Check: https://explorer.solana.com/tx/${res.result}?cluster=devnet`);
    } else if (res.error) {
      log(`✗ Devnet airdrop failed: ${res.error.message}`);
    }
  } catch (e: any) {
    log(`✗ Devnet airdrop error: ${e.message}`);
  }
}

// ─── 2. MAINNET BALANCES ─────────────────────────────────

async function checkSolanaBalance(address: string, label: string): Promise<number> {
  try {
    const res = await solRpc(SOLANA_MAINNET, "getBalance", [address]);
    const sol = (res.result?.value ?? 0) / 1e9;
    log(`${label} SOL balance: ${sol.toFixed(6)} SOL`);
    return sol;
  } catch {
    return 0;
  }
}

async function checkSolanaTokens(address: string, label: string): Promise<void> {
  try {
    const res = await solRpc(SOLANA_MAINNET, "getTokenAccountsByOwner", [
      address,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" },
    ]);
    const accounts = res.result?.value ?? [];
    if (accounts.length === 0) {
      log(`${label} has no SPL tokens`);
      return;
    }
    log(`${label} holds ${accounts.length} SPL token accounts:`);
    for (const acct of accounts.slice(0, 10)) {
      const info = acct.account?.data?.parsed?.info;
      if (!info) continue;
      const amount = parseFloat(info.tokenAmount?.uiAmountString ?? "0");
      if (amount > 0) {
        log(`  • ${info.mint.slice(0, 12)}... — ${amount.toLocaleString()} tokens`);
      }
    }
    if (accounts.length > 10) log(`  ... and ${accounts.length - 10} more`);
  } catch (e: any) {
    log(`Token check failed: ${e.message}`);
  }
}

// ─── 3. AIRDROP ELIGIBILITY CHECKS ───────────────────────

async function checkJupiterAirdrop(address: string, label: string): Promise<void> {
  log(`Checking Jupiter airdrop eligibility for ${label}...`);
  try {
    // Jupiter JUP airdrop API
    const res = await fetch(`https://worker.jup.ag/airdrop-wallets/${address}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data && data.amount > 0) {
        log(`🎯 JUP AIRDROP ELIGIBLE! Amount: ${data.amount} JUP`);
        log(`   → Claim at: https://jup.ag/airdrop`);
      } else {
        log(`  Jupiter: Not eligible (${JSON.stringify(data).slice(0, 60)})`);
      }
    } else {
      log(`  Jupiter API: ${res.status}`);
    }
  } catch (e: any) {
    log(`  Jupiter check failed: ${e.message}`);
  }
}

async function checkMeteoraAirdrop(address: string, label: string): Promise<void> {
  log(`Checking Meteora/DLMM airdrop for ${label}...`);
  try {
    const res = await fetch(`https://claim.meteora.ag/api/claimable?wallet=${address}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data?.claimable > 0) {
        log(`🎯 METEORA CLAIMABLE! ${data.claimable}`);
        log(`   → Claim at: https://claim.meteora.ag`);
      } else {
        log(`  Meteora: Not eligible`);
      }
    }
  } catch {
    log(`  Meteora: API unreachable`);
  }
}

async function checkSolayerAirdrop(address: string, label: string): Promise<void> {
  log(`Checking Solayer airdrop for ${label}...`);
  try {
    const res = await fetch(`https://app.solayer.org/api/airdrop/check?wallet=${address}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data?.eligible || data?.amount > 0) {
        log(`🎯 SOLAYER ELIGIBLE! ${JSON.stringify(data)}`);
        log(`   → Claim at: https://app.solayer.org`);
      } else {
        log(`  Solayer: Not eligible`);
      }
    }
  } catch {
    log(`  Solayer: API unreachable`);
  }
}

async function checkKamino(address: string, label: string): Promise<void> {
  log(`Checking Kamino KMNO airdrop for ${label}...`);
  try {
    const res = await fetch(`https://api.kamino.finance/airdrop/eligibility?wallet=${address}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json() as any;
      const amount = data?.totalAmount ?? data?.amount ?? 0;
      if (amount > 0) {
        log(`🎯 KAMINO ELIGIBLE! Amount: ${amount} KMNO`);
        log(`   → Claim at: https://app.kamino.finance`);
      } else {
        log(`  Kamino: Not eligible`);
      }
    }
  } catch {
    log(`  Kamino: API unreachable`);
  }
}

async function checkDriftAirdrop(address: string, label: string): Promise<void> {
  log(`Checking Drift DRIFT airdrop for ${label}...`);
  try {
    const res = await fetch(`https://app.drift.trade/api/airdrop/check/${address}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data?.eligible || data?.amount > 0) {
        log(`🎯 DRIFT ELIGIBLE! ${JSON.stringify(data)}`);
        log(`   → Claim at: https://app.drift.trade`);
      } else {
        log(`  Drift: Not eligible`);
      }
    }
  } catch {
    log(`  Drift: API unreachable`);
  }
}

// ─── 4. BASE / EVM CHECKS ────────────────────────────────

async function checkBaseTokens(address: string, label: string): Promise<void> {
  log(`Checking Base token holdings for ${label}...`);
  try {
    // Use Blockscout API for Base (free, no key needed)
    const res = await fetch(
      `https://base.blockscout.com/api/v2/addresses/${address}/tokens?type=ERC-20`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const items = data?.items ?? [];
      const withValue = items.filter((t: any) => parseFloat(t.value ?? "0") > 0);
      if (withValue.length > 0) {
        log(`${label} has ${withValue.length} ERC-20 tokens on Base:`);
        for (const t of withValue.slice(0, 8)) {
          const symbol = t.token?.symbol ?? "???";
          const val = parseFloat(t.value) / Math.pow(10, parseInt(t.token?.decimals ?? "18"));
          log(`  • ${symbol}: ${val.toLocaleString()}`);
        }
      } else {
        log(`  ${label}: No ERC-20 tokens on Base`);
      }
    }
  } catch (e: any) {
    log(`  Base token check failed: ${e.message}`);
  }
}

// ─── 5. LIVE PUMP.FUN OPPORTUNITIES ──────────────────────

async function scanPumpFunNow(): Promise<void> {
  log(`Scanning Pump.fun for hot tokens right now...`);
  try {
    const res = await fetch(
      "https://frontend-api.pump.fun/coins?offset=0&limit=20&sort=last_trade_timestamp&order=DESC&includeNsfw=false",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
    );
    if (!res.ok) { log(`  Pump.fun API: ${res.status}`); return; }
    const coins = await res.json() as any[];
    const now = Date.now();

    const hotCoins = coins.filter((c: any) => {
      const mc = c.usd_market_cap ?? 0;
      const age = (now - (c.created_timestamp ?? 0)) / 60_000;
      return age < 30 && mc > 5_000 && mc < 300_000;
    });

    if (hotCoins.length === 0) {
      log(`  No hot coins in the early window right now`);
      return;
    }

    log(`  Found ${hotCoins.length} coins in the early window:`);
    for (const c of hotCoins.slice(0, 5)) {
      const age = ((now - (c.created_timestamp ?? 0)) / 60_000).toFixed(1);
      const mc = (c.usd_market_cap ?? 0).toLocaleString();
      log(`  🔥 ${c.symbol ?? "???"} | $${mc} MC | ${age}m old | pump.fun/${c.mint}`);
    }
  } catch (e: any) {
    log(`  Pump.fun scan failed: ${e.message}`);
  }
}

// ─── 6. SUPERTEAM QUICK BOUNTIES ─────────────────────────

async function checkSuperteamBounties(): Promise<void> {
  log(`Checking Superteam for quick bounties...`);
  try {
    const res = await fetch(
      "https://earn.superteam.fun/api/listings?type=bounty&status=open&take=10",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const listings = data?.data ?? data?.listings ?? [];
      if (listings.length > 0) {
        log(`  Found ${listings.length} open bounties:`);
        for (const b of listings.slice(0, 5)) {
          const reward = b.rewardAmount ?? b.usdValue ?? "?";
          const title = (b.title ?? b.name ?? "Untitled").slice(0, 50);
          log(`  💰 $${reward} — ${title}`);
          log(`     → https://earn.superteam.fun/listings/${b.slug ?? ""}`);
        }
      } else {
        log(`  No bounties parsed from API`);
      }
    } else {
      log(`  Superteam API: ${res.status}`);
    }
  } catch (e: any) {
    log(`  Superteam check failed: ${e.message}`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(`  ╔${H}╗`);
  console.log(`  ║  HUSTLE ENGINE — Full send free crypto hunter       ║`);
  console.log(`  ╚${H}╝`);
  console.log();

  // ── ROUND 1: Devnet airdrops (free SOL for testing) ──
  banner("STEP 1: Devnet SOL Airdrop (free test SOL)");
  await claimDevnetAirdrop(WALLETS.solana_foreman, "Foreman");
  await claimDevnetAirdrop(WALLETS.solana_nathan, "Nathan FGBU");

  // ── ROUND 2: Check real balances ──
  banner("STEP 2: Real Wallet Balances");
  await checkSolanaBalance(WALLETS.solana_nathan, "Nathan FGBU");
  await checkSolanaTokens(WALLETS.solana_nathan, "Nathan FGBU");
  await checkBaseTokens(WALLETS.evm_nathan, "Nathan Base");

  // ── ROUND 3: Airdrop eligibility checks ──
  banner("STEP 3: Airdrop Eligibility — Nathan FGBU Wallet");
  await checkJupiterAirdrop(WALLETS.solana_nathan, "FGBU");
  await checkMeteoraAirdrop(WALLETS.solana_nathan, "FGBU");
  await checkKamino(WALLETS.solana_nathan, "FGBU");
  await checkDriftAirdrop(WALLETS.solana_nathan, "FGBU");
  await checkSolayerAirdrop(WALLETS.solana_nathan, "FGBU");

  // ── ROUND 4: Live market scan ──
  banner("STEP 4: Live Pump.fun Hot Coins RIGHT NOW");
  await scanPumpFunNow();

  // ── ROUND 5: Bounties ──
  banner("STEP 5: Superteam Bounties");
  await checkSuperteamBounties();

  // ── Summary ──
  console.log();
  console.log(`  ╔${H}╗`);
  console.log(`  ║  HUSTLE COMPLETE — Watch above for 🎯 markers       ║`);
  console.log(`  ║  Any 🎯 line = real claimable money. Act on it NOW.  ║`);
  console.log(`  ╚${H}╝`);
  console.log();
}

main().catch(console.error);
