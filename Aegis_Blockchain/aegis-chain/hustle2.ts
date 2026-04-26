/**
 * hustle2.ts — Round 2: Deeper sweep
 *
 * - Full Base token list with USD values
 * - FGBU transaction history → which protocols used → airdrop check
 * - More Solana airdrop programs: Marginfi, Sanctum, Tensor, Pyth, Orca, Raydium
 * - Fixed Superteam endpoint
 * - Alternative pump.fun feed
 */

const WALLETS = {
  solana_nathan:  "3k2kHCqhLLnnQXX29CimrKYAsXdMBT4QdJSyX8Z7FGBU",
  evm_nathan:     "0x30Cbd5ffb18B38cC77Cca71B609259547cB3be5B",
};

const SOLANA_MAINNET = "https://api.mainnet-beta.solana.com";
const H = "═".repeat(58);

function log(msg: string) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  [${ts}] ${msg}`);
}

function banner(title: string) {
  console.log(`\n  ╔${H}╗`);
  console.log(`  ║  ${title.padEnd(56)} ║`);
  console.log(`  ╚${H}╝`);
}

async function solRpc(method: string, params: any[]) {
  const res = await fetch(SOLANA_MAINNET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json() as any;
}

// ─── 1. Full Base wallet value breakdown ─────────────────

async function fullBaseWallet(): Promise<void> {
  log("Fetching full Base wallet token list with USD values...");
  try {
    // Blockscout has token values via token-info
    const res = await fetch(
      `https://base.blockscout.com/api/v2/addresses/${WALLETS.evm_nathan}/token-balances`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) {
      log(`  Blockscout token-balances: ${res.status} — trying alternate...`);
      // Fallback: Zerion-compatible via debank
      await checkDeBankBase();
      return;
    }
    const items = await res.json() as any[];
    if (!Array.isArray(items) || items.length === 0) {
      log("  No token balance data returned");
      await checkDeBankBase();
      return;
    }

    let totalUsd = 0;
    const withValue: any[] = [];

    for (const item of items) {
      const token = item.token ?? {};
      const decimals = parseInt(token.decimals ?? "18");
      const rawBalance = BigInt(item.value ?? "0");
      const balance = Number(rawBalance) / Math.pow(10, decimals);
      const priceUsd = parseFloat(token.exchange_rate ?? "0");
      const usdValue = balance * priceUsd;
      if (usdValue > 0.01 || balance > 0) {
        withValue.push({ symbol: token.symbol ?? "???", balance, priceUsd, usdValue, name: token.name });
        totalUsd += usdValue;
      }
    }

    withValue.sort((a, b) => b.usdValue - a.usdValue);
    log(`  BASE WALLET — ${withValue.length} tokens with value:`);
    for (const t of withValue) {
      const usd = t.usdValue > 0.01 ? `  ($${t.usdValue.toFixed(2)})` : "";
      log(`  ${t.usdValue >= 1 ? "💰" : "  "} ${t.symbol}: ${t.balance.toLocaleString()}${usd}`);
    }
    if (totalUsd > 0) {
      log(`\n  ★ TOTAL BASE VALUE: $${totalUsd.toFixed(2)}`);
    }
  } catch (e: any) {
    log(`  Base wallet error: ${e.message}`);
  }
}

async function checkDeBankBase(): Promise<void> {
  try {
    const res = await fetch(
      `https://api.debank.com/token/balance_list?user_addr=${WALLETS.evm_nathan.toLowerCase()}&chain=base`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const tokens = data?.data ?? [];
      const sorted = tokens.filter((t: any) => (t.amount ?? 0) * (t.price ?? 0) > 0.01)
        .sort((a: any, b: any) => (b.amount * b.price) - (a.amount * a.price));
      if (sorted.length > 0) {
        let total = 0;
        for (const t of sorted) {
          const val = t.amount * t.price;
          total += val;
          log(`  ${val >= 1 ? "💰" : "  "} ${t.symbol}: ${t.amount.toLocaleString()} ($${val.toFixed(2)})`);
        }
        log(`\n  ★ TOTAL BASE VALUE: $${total.toFixed(2)}`);
      }
    }
  } catch {}
}

// ─── 2. FGBU Protocol History — what did Nathan use? ─────

async function scanProtocolHistory(): Promise<void> {
  log("Scanning FGBU transaction history for protocol interactions...");
  try {
    // Get last 100 transactions
    const res = await solRpc("getSignaturesForAddress", [
      WALLETS.solana_nathan,
      { limit: 100 }
    ]);
    const sigs = res.result ?? [];
    log(`  Found ${sigs.length} recent transactions`);

    // Get the programs interacted with from a sample of txs
    const programHits: Record<string, number> = {};
    const sample = sigs.slice(0, 20);

    for (const sig of sample) {
      try {
        const txRes = await solRpc("getTransaction", [
          sig.signature,
          { encoding: "json", maxSupportedTransactionVersion: 0 }
        ]);
        const tx = txRes.result;
        if (!tx) continue;
        const accounts = tx.transaction?.message?.accountKeys ?? [];
        for (const acct of accounts) {
          const addr = typeof acct === "string" ? acct : acct.pubkey;
          if (addr && addr !== WALLETS.solana_nathan) {
            programHits[addr] = (programHits[addr] ?? 0) + 1;
          }
        }
      } catch {}
    }

    // Known protocol addresses
    const KNOWN_PROTOCOLS: Record<string, string> = {
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4":  "Jupiter",
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc":   "Orca Whirlpool",
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8":  "Raydium AMM",
      "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK":  "Raydium CLMM",
      "MFv2hWf31Z9kbCa1snEPdcgp168SqViTJWIaqBVAWMv":   "Marginfi",
      "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo":   "Solend",
      "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1":  "Orca",
      "7WypCIH2iBj9TVvDGBMFemLCGhJMFmSUBhLSvAtXN5m4":  "Drift",
      "TSWAPaqyCSx2KABk68Shruf4rp7CxcAi9von1D4zGRP":    "Tensor",
      "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1":  "Raydium IDO",
      "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny":  "Sanctum",
    };

    const found: string[] = [];
    for (const [addr, name] of Object.entries(KNOWN_PROTOCOLS)) {
      if (programHits[addr]) {
        found.push(name);
        log(`  ✓ Used protocol: ${name} (${programHits[addr]}x)`);
      }
    }

    if (found.length === 0) {
      log("  No major known protocols detected in sample");
    } else {
      log(`\n  → Check these for unclaimed rewards: ${found.join(", ")}`);
    }
  } catch (e: any) {
    log(`  Protocol history failed: ${e.message}`);
  }
}

// ─── 3. More Solana Airdrop Checkers ─────────────────────

async function checkMarginfi(): Promise<void> {
  log("Checking Marginfi MRGN points/airdrop...");
  try {
    const res = await fetch(
      `https://points.marginfi.com/api/points?wallet=${WALLETS.solana_nathan}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const pts = data?.total_points ?? data?.points ?? 0;
      if (pts > 0) {
        log(`  🎯 MARGINFI POINTS: ${pts.toLocaleString()} — eligible for MRGN airdrop`);
      } else {
        log(`  Marginfi: No points (${JSON.stringify(data).slice(0, 80)})`);
      }
    } else {
      log(`  Marginfi: ${res.status}`);
    }
  } catch {
    log("  Marginfi: unreachable");
  }
}

async function checkSanctum(): Promise<void> {
  log("Checking Sanctum/INF airdrop...");
  try {
    const res = await fetch(
      `https://sanctuary.sanctum.so/api/allocation?wallet=${WALLETS.solana_nathan}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const amount = data?.amount ?? data?.allocation ?? 0;
      if (amount > 0) {
        log(`  🎯 SANCTUM ELIGIBLE! Amount: ${amount}`);
        log(`     → https://sanctuary.sanctum.so`);
      } else {
        log(`  Sanctum: Not eligible`);
      }
    } else {
      log(`  Sanctum: ${res.status}`);
    }
  } catch {
    log("  Sanctum: unreachable");
  }
}

async function checkTensor(): Promise<void> {
  log("Checking Tensor TNSR staking rewards...");
  try {
    const res = await fetch(
      `https://api.tensor.trade/api/v1/user/${WALLETS.solana_nathan}/rewards`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const rewards = data?.rewards ?? data?.claimable ?? 0;
      if (rewards > 0) {
        log(`  🎯 TENSOR REWARDS: ${rewards} TNSR claimable`);
        log(`     → https://www.tensor.trade`);
      } else {
        log(`  Tensor: No claimable rewards`);
      }
    } else {
      log(`  Tensor: ${res.status}`);
    }
  } catch {
    log("  Tensor: unreachable");
  }
}

async function checkPyth(): Promise<void> {
  log("Checking Pyth Network PYTH airdrop (multiple rounds)...");
  try {
    const res = await fetch(
      `https://claim.pyth.network/api/allocation/${WALLETS.solana_nathan}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const amount = data?.amount ?? data?.allocation ?? 0;
      if (amount > 0) {
        log(`  🎯 PYTH ELIGIBLE! ${amount} PYTH unclaimed`);
        log(`     → https://claim.pyth.network`);
      } else {
        log(`  Pyth: Not eligible or already claimed`);
      }
    } else {
      log(`  Pyth: ${res.status}`);
    }
  } catch {
    log("  Pyth: unreachable");
  }
}

async function checkRaydiumFarming(): Promise<void> {
  log("Checking Raydium farming rewards...");
  try {
    const res = await fetch(
      `https://api.raydium.io/v2/main/farm/user-info?wallet=${WALLETS.solana_nathan}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      const farms = data?.data ?? [];
      const withRewards = farms.filter((f: any) => parseFloat(f.pendingReward ?? "0") > 0);
      if (withRewards.length > 0) {
        log(`  🎯 RAYDIUM: ${withRewards.length} farms with pending rewards!`);
        for (const f of withRewards) {
          log(`     Farm: ${f.farmId?.slice(0,12)}... — ${f.pendingReward} pending`);
        }
        log(`     → https://raydium.io/farms`);
      } else {
        log(`  Raydium: No pending farming rewards`);
      }
    } else {
      log(`  Raydium: ${res.status}`);
    }
  } catch {
    log("  Raydium: unreachable");
  }
}

// ─── 4. Superteam — fixed endpoint ───────────────────────

async function checkSuperteamFixed(): Promise<void> {
  log("Superteam open bounties (corrected endpoint)...");
  try {
    const res = await fetch(
      "https://earn.superteam.fun/api/listings/?open=true&take=20",
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
    );
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        const listings = data?.bounties ?? data?.data ?? data?.listings ?? [];
        if (listings.length > 0) {
          log(`  Found ${listings.length} listings:`);
          for (const b of listings.slice(0, 8)) {
            const reward = b.rewardAmount ?? b.usdValue ?? b.totalRewardAmount ?? "?";
            const title = (b.title ?? b.name ?? "?").slice(0, 55);
            const slug = b.slug ?? b.id ?? "";
            log(`  💰 $${reward} USDC — ${title}`);
            if (slug) log(`     → https://earn.superteam.fun/listings/${slug}`);
          }
        } else {
          log(`  Superteam: No listings in response keys: ${Object.keys(data).join(", ")}`);
        }
      } catch {
        // Not JSON — try to extract numbers
        const matches = text.match(/"rewardAmount":(\d+)/g);
        if (matches) {
          log(`  Saw ${matches.length} bounty rewards in HTML: ${matches.slice(0, 5).join(", ")}`);
        } else {
          log(`  Superteam: Non-JSON response (${text.slice(0, 100)})`);
        }
      }
    } else {
      log(`  Superteam: ${res.status}`);
    }
  } catch (e: any) {
    log(`  Superteam: ${e.message}`);
  }
}

// ─── 5. Pump.fun — alternative feed ──────────────────────

async function scanPumpFunAlt(): Promise<void> {
  log("Pump.fun — alternative feeds...");

  // Try the king of the hill endpoint (trending)
  try {
    const res = await fetch(
      "https://frontend-api.pump.fun/coins/king-of-the-hill?includeNsfw=false",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (res.ok) {
      const king = await res.json() as any;
      if (king?.mint) {
        const mc = king.usd_market_cap ?? 0;
        const age = ((Date.now() - (king.created_timestamp ?? 0)) / 60_000).toFixed(1);
        log(`  👑 King of the Hill: ${king.symbol} | $${mc.toLocaleString()} MC | ${age}m old`);
        log(`     → pump.fun/${king.mint}`);
      }
    }
  } catch {}

  // Try graduating tokens (already past bonding curve — safer)
  try {
    const res = await fetch(
      "https://frontend-api.pump.fun/coins?offset=0&limit=10&sort=market_cap&order=DESC&includeNsfw=false",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (res.ok) {
      const coins = await res.json() as any[];
      const graduating = coins.filter((c: any) => {
        const mc = c.usd_market_cap ?? 0;
        return mc > 50_000 && mc < 800_000 && !c.raydium_pool;
      });
      if (graduating.length > 0) {
        log(`  🚀 Coins approaching graduation (about to hit Raydium):`);
        for (const c of graduating.slice(0, 4)) {
          const mc = (c.usd_market_cap ?? 0).toLocaleString();
          const progress = c.virtual_sol_reserves
            ? ((Number(c.virtual_sol_reserves) / 85000000000) * 100).toFixed(0)
            : "?";
          log(`  • ${c.symbol} | $${mc} MC | ${progress}% bonding curve`);
          log(`    → pump.fun/${c.mint}`);
        }
      }
    }
  } catch {}
}

// ─── 6. Check SOL staking rewards ────────────────────────

async function checkStakingRewards(): Promise<void> {
  log("Checking for staking accounts under FGBU...");
  try {
    const res = await solRpc("getStakeActivation", [WALLETS.solana_nathan]);
    if (res.result) {
      log(`  Stake state: ${JSON.stringify(res.result)}`);
    }

    // Also check for stake accounts owned by this wallet
    const accts = await solRpc("getProgramAccounts", [
      "Stake11111111111111111111111111111111111111112",
      {
        filters: [{ memcmp: { offset: 44, bytes: WALLETS.solana_nathan } }],
        encoding: "base64",
      }
    ]);
    const stakeAccts = accts.result ?? [];
    if (stakeAccts.length > 0) {
      log(`  🎯 Found ${stakeAccts.length} staking accounts! Potential unclaimed SOL.`);
    } else {
      log(`  No active staking accounts found`);
    }
  } catch {
    log("  Staking check: failed");
  }
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(`  ╔${H}╗`);
  console.log(`  ║  HUSTLE ENGINE v2 — Deeper sweep, more targets       ║`);
  console.log(`  ╚${H}╝`);
  console.log();

  banner("STEP 1: Full Base Wallet Valuation");
  await fullBaseWallet();

  banner("STEP 2: Protocol Usage History (FGBU)");
  await scanProtocolHistory();

  banner("STEP 3: Solana Airdrop Programs");
  await checkMarginfi();
  await checkSanctum();
  await checkTensor();
  await checkPyth();
  await checkRaydiumFarming();

  banner("STEP 4: Staking Rewards");
  await checkStakingRewards();

  banner("STEP 5: Superteam Bounties");
  await checkSuperteamFixed();

  banner("STEP 6: Pump.fun Live Scan");
  await scanPumpFunAlt();

  console.log();
  console.log(`  ╔${H}╗`);
  console.log(`  ║  DONE — Any 🎯 lines above = real money available    ║`);
  console.log(`  ╚${H}╝`);
  console.log();
}

main().catch(console.error);
