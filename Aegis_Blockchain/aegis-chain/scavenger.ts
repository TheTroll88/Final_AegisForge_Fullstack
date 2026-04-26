/**
 * Crypto Scavenger
 *
 * Continuously hunts free crypto from faucets, testnets, and passive sources.
 * Deposits anything found to Nathan's target wallet.
 *
 * Runs on a schedule — hits sources at optimal times (e.g., midnight UTC resets).
 * Uses Foreman's browser for human-like claim automation.
 *
 * Target: 7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY (Solana)
 *         0x30Cbd5ffb18B38cC77Cca71B609259547cB3be5B (Base/EVM)
 *
 * Usage: npx tsx scavenger.ts
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOL_WALLET = "7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY";
const BASE_WALLET = "0x30Cbd5ffb18B38cC77Cca71B609259547cB3be5B";
const STATE_FILE = join(__dirname, "scavenger_state.json");

// ─── State Management ────────────────────────────────────────────────────────

interface ScavengerState {
  lastRun: Record<string, number>; // source id → last claim timestamp
  totalClaimed: Record<string, string>; // source id → running total
  log: string[];
}

function loadState(): ScavengerState {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch {}
  }
  return { lastRun: {}, totalClaimed: {}, log: [] };
}

function saveState(s: ScavengerState) {
  s.log = s.log.slice(-200); // keep last 200 entries
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function logEntry(s: ScavengerState, msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  s.log.push(line);
}

// ─── Faucet Sources ──────────────────────────────────────────────────────────

interface Source {
  id: string;
  name: string;
  chain: "solana-devnet" | "solana-testnet" | "base-sepolia" | "eth-sepolia" | "eth-holesky";
  cooldownHours: number; // how long to wait between claims
  claim: (state: ScavengerState) => Promise<string | null>; // returns amount string or null
}

// Direct RPC airdrop — fastest when not rate limited
async function rpcAirdrop(endpoint: string, wallet: string, lamports: number): Promise<string | null> {
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [wallet, lamports] }),
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json() as any;
    if (d.result && typeof d.result === "string") return `${lamports / 1e9} SOL`;
    if (d.error?.code === 429) return null; // rate limited — skip silently
    if (d.error) throw new Error(d.error.message);
    return null;
  } catch (e: any) {
    if (e.message?.includes("429") || e.message?.includes("rate")) return null;
    throw e;
  }
}

// EVM faucet via JSON-RPC (Sepolia / Holesky)
async function evmRpcAirdrop(endpoint: string, wallet: string, wei: bigint): Promise<string | null> {
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tenderly_addBalance", params: [[wallet], `0x${wei.toString(16)}`] }),
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json() as any;
    if (!d.error) return `${Number(wei) / 1e18} ETH`;
    return null;
  } catch { return null; }
}

// Browser-based claim (human-like, for sites with captcha/auth checks)
async function browserClaim(url: string, fillSteps: Array<{ selector: string; value?: string; action: "fill" | "click" | "wait" }>, successSelector: string): Promise<string | null> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  try {
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    for (const step of fillSteps) {
      if (step.action === "wait") {
        await page.waitForTimeout(step.value ? parseInt(step.value) : 1000);
      } else if (step.action === "fill" && step.value) {
        const el = await page.waitForSelector(step.selector, { timeout: 8000 }).catch(() => null);
        if (el) await el.fill(step.value);
      } else if (step.action === "click") {
        const el = await page.waitForSelector(step.selector, { timeout: 8000 }).catch(() => null);
        if (el) await el.click();
      }
    }

    await page.waitForTimeout(5000);
    const success = await page.$(successSelector).catch(() => null);
    if (success) {
      const txt = await success.textContent().catch(() => "claimed");
      return txt?.trim() || "claimed";
    }
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Source Definitions ──────────────────────────────────────────────────────

const SOURCES: Source[] = [
  // Solana devnet — primary RPC (resets midnight UTC)
  {
    id: "sol-devnet-rpc",
    name: "Solana Devnet RPC",
    chain: "solana-devnet",
    cooldownHours: 24,
    async claim() {
      return rpcAirdrop("https://api.devnet.solana.com", SOL_WALLET, 2_000_000_000);
    },
  },

  // Solana testnet — separate from devnet, own rate limit
  {
    id: "sol-testnet-rpc",
    name: "Solana Testnet RPC",
    chain: "solana-testnet",
    cooldownHours: 24,
    async claim() {
      return rpcAirdrop("https://api.testnet.solana.com", SOL_WALLET, 2_000_000_000);
    },
  },

  // Triangle platform faucet — often works without captcha for small amounts
  {
    id: "sol-triangle-devnet",
    name: "Triangle Platform Devnet",
    chain: "solana-devnet",
    cooldownHours: 8,
    async claim() {
      try {
        const r = await fetch("https://faucet.triangleplatform.com/solana/devnet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: SOL_WALLET }),
          signal: AbortSignal.timeout(15_000),
        });
        const d = await r.json() as any;
        if (r.ok && (d.success || d.signature || d.txHash)) return "1 SOL (Triangle devnet)";
        if (d.error) console.log(`    Triangle: ${d.error}`);
        return null;
      } catch { return null; }
    },
  },

  // togatech faucet (rotates devnet + testnet)
  {
    id: "sol-togatech-devnet",
    name: "Togatech Devnet",
    chain: "solana-devnet",
    cooldownHours: 8,
    async claim() {
      try {
        const r = await fetch("https://solfaucet.togatech.org/api/devnet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: SOL_WALLET }),
          signal: AbortSignal.timeout(15_000),
        });
        const d = await r.json() as any;
        if (r.ok && (d.success || d.signature)) return "0.5 SOL (togatech devnet)";
        return null;
      } catch { return null; }
    },
  },

  // Google Cloud Web3 faucet — no auth required, 0.25 ETH/day Holesky or Sepolia
  {
    id: "eth-google-holesky",
    name: "Google Web3 Faucet (Holesky)",
    chain: "eth-holesky",
    cooldownHours: 24,
    async claim() {
      try {
        const r = await fetch("https://cloud.google.com/application/web3/faucet/ethereum/holesky", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: BASE_WALLET }),
          signal: AbortSignal.timeout(15_000),
        });
        if (r.ok) {
          const d = await r.json() as any;
          if (d.transactionHash || d.success) return `0.25 ETH Holesky (tx: ${(d.transactionHash ?? '').slice(0, 12)})`;
        }
        return null;
      } catch { return null; }
    },
  },
];

// ─── Balance Check ────────────────────────────────────────────────────────────

async function checkSolBalance(wallet: string, endpoint: string): Promise<number> {
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [wallet] }),
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json() as any;
    return (d.result?.value ?? 0) / 1e9;
  } catch { return -1; }
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function runScavenger() {
  const state = loadState();
  const now = Date.now();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║       CRYPTO SCAVENGER ONLINE        ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Target SOL: ${SOL_WALLET.slice(0, 8)}...`);
  console.log(`Target EVM: ${BASE_WALLET.slice(0, 10)}...`);

  // Check current balances
  const devnetBal = await checkSolBalance(SOL_WALLET, "https://api.devnet.solana.com");
  const testnetBal = await checkSolBalance(SOL_WALLET, "https://api.testnet.solana.com");
  console.log(`\nDevnet balance:  ${devnetBal >= 0 ? devnetBal.toFixed(4) + " SOL" : "unreachable"}`);
  console.log(`Testnet balance: ${testnetBal >= 0 ? testnetBal.toFixed(4) + " SOL" : "unreachable"}`);

  let claimed = 0;
  let skipped = 0;

  for (const source of SOURCES) {
    const lastRun = state.lastRun[source.id] ?? 0;
    const hoursSince = (now - lastRun) / (1000 * 60 * 60);

    if (hoursSince < source.cooldownHours) {
      const nextRun = new Date(lastRun + source.cooldownHours * 3600 * 1000);
      console.log(`  [SKIP] ${source.name} — next eligible: ${nextRun.toLocaleTimeString()}`);
      skipped++;
      continue;
    }

    console.log(`  [TRY]  ${source.name}...`);
    try {
      const result = await source.claim(state);
      if (result) {
        logEntry(state, `CLAIMED ${result} from ${source.name}`);
        state.lastRun[source.id] = now;
        state.totalClaimed[source.id] = result;
        claimed++;
      } else {
        logEntry(state, `MISS: ${source.name} — unavailable or rate limited`);
        // Still mark it so we don't hammer it — retry after 1 hour
        state.lastRun[source.id] = now - (source.cooldownHours - 1) * 3600 * 1000;
      }
    } catch (e: any) {
      logEntry(state, `ERROR: ${source.name} — ${e.message?.slice(0, 80)}`);
    }

    // Polite delay between sources
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n  Summary: ${claimed} claimed, ${skipped} skipped (cooldown)`);

  // Also trigger GitHub Actions for a cloud-IP attempt
  await triggerCloudAirdrop();

  // Next optimal run: midnight UTC
  const msToMidnight = (() => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return midnight.getTime() - now.getTime();
  })();
  const hoursToMidnight = (msToMidnight / (1000 * 60 * 60)).toFixed(1);
  console.log(`  Next optimal run: midnight UTC (${hoursToMidnight}h from now)`);

  saveState(state);
}

// ─── GitHub Actions Cloud Airdrop ─────────────────────────────────────────────

async function triggerCloudAirdrop(): Promise<void> {
  // Fires the sol-faucet-runner workflow from a GitHub Actions cloud IP
  // (different external IP → separate rate limit bucket)
  const GH_TOKEN = process.env.GH_AIRDROP_TOKEN ?? "";  // set GH_AIRDROP_TOKEN env var
  try {
    const r = await fetch("https://api.github.com/repos/TheTroll88/sol-faucet-runner/actions/workflows/airdrop.yml/dispatches", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GH_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 204) {
      console.log("  [GitHub Actions] Cloud airdrop triggered (fresh IP)");
    } else {
      console.log(`  [GitHub Actions] Trigger returned ${r.status}`);
    }
  } catch (e: any) {
    console.log(`  [GitHub Actions] Failed: ${e.message}`);
  }
}

// ─── Continuous Mode ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const continuous = args.includes("--continuous");

if (continuous) {
  // Run at midnight UTC daily + once on start
  async function loop() {
    await runScavenger();
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const wait = midnight.getTime() - Date.now();
    console.log(`\n  Sleeping ${(wait / 3600000).toFixed(1)}h until midnight UTC reset...`);
    setTimeout(loop, wait);
  }
  loop();
} else {
  runScavenger().catch(console.error);
}
