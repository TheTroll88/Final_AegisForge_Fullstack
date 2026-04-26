/**
 * faucet_blitz.ts — every devnet faucet we can hit programmatically
 * Target: 7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY
 */

import { chromium } from "playwright-core";

const ADDR  = "7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY";
const LAMPORTS_1 = 1_000_000_000;
const UA    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";

// ─── RPC airdrop against multiple endpoints ──────────────────

const RPC_ENDPOINTS = [
  "https://api.devnet.solana.com",
  "https://rpc.ankr.com/solana_devnet",
  "https://solana-devnet-rpc.allthatnode.com",
  "https://devnet.sonic.game",                // Sonic devnet (Solana-compatible)
  "https://api.testnet.solana.com",            // testnet as fallback
];

async function rpcAirdrop(rpc: string, lamports: number): Promise<boolean> {
  try {
    const resp = await fetch(rpc, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "requestAirdrop",
        params: [ADDR, lamports],
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await resp.json() as any;
    if (data?.result) {
      console.log(`✅ RPC AIRDROP SUCCESS: ${rpc}`);
      console.log(`   tx: ${data.result}`);
      return true;
    } else {
      console.log(`❌ ${rpc}: ${data?.error?.message ?? JSON.stringify(data)}`);
      return false;
    }
  } catch (e: any) {
    console.log(`❌ ${rpc}: ${e.message}`);
    return false;
  }
}

// ─── faucet.solana.com via Playwright ───────────────────────

async function solanaDotFaucet(): Promise<boolean> {
  console.log("\n🌐 Trying faucet.solana.com via browser...");
  let browser: any;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: undefined, // use bundled
    });
    const ctx  = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();

    await page.goto("https://faucet.solana.com", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Fill wallet address
    const input = page.locator('input[placeholder*="Address"], input[type="text"], input[name="address"]').first();
    await input.fill(ADDR);

    // Select network (devnet)
    try {
      const select = page.locator('select, [role="combobox"]').first();
      await select.selectOption({ value: "devnet" }).catch(() =>
        select.selectOption({ label: "Devnet" })
      );
    } catch { /* may not have dropdown */ }

    // Select amount — try 1 SOL or 2 SOL
    try {
      const amtSelect = page.locator('select').nth(1);
      await amtSelect.selectOption({ label: "1" }).catch(() => {});
    } catch {}

    // Click confirm / request button
    const btn = page.locator('button[type="submit"], button:has-text("Confirm"), button:has-text("Request"), button:has-text("Airdrop")').first();
    await btn.click();
    await page.waitForTimeout(5000);

    const content = await page.content();
    if (content.includes("Success") || content.includes("Transaction") || content.includes("confirmed")) {
      console.log("✅ faucet.solana.com: SUCCESS");
      await browser.close();
      return true;
    }

    // Screenshot for debug
    const shot = await page.screenshot({ path: "C:\\Users\\natha\\faucet_result.png" });
    console.log("❌ faucet.solana.com: No success signal — screenshot saved");
    await browser.close();
    return false;
  } catch (e: any) {
    console.log(`❌ faucet.solana.com: ${e.message}`);
    try { await browser?.close(); } catch {}
    return false;
  }
}

// ─── Solfate faucet ──────────────────────────────────────────

async function solfateFaucet(): Promise<boolean> {
  console.log("\n🌐 Trying solfate.com faucet...");
  try {
    const resp = await fetch("https://solfate.com/api/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA, "Referer": "https://solfate.com/faucet" },
      body: JSON.stringify({ address: ADDR, network: "devnet" }),
      signal: AbortSignal.timeout(12000),
    });
    const text = await resp.text();
    if (resp.ok && (text.includes("success") || text.includes("signature"))) {
      console.log(`✅ solfate:`, text.slice(0, 200));
      return true;
    }
    console.log(`❌ solfate: ${resp.status} ${text.slice(0, 200)}`);
    return false;
  } catch (e: any) {
    console.log(`❌ solfate: ${e.message}`);
    return false;
  }
}

// ─── Helius devnet faucet (no key needed) ───────────────────

async function heliusFaucet(): Promise<boolean> {
  console.log("\n🌐 Trying Helius devnet endpoint...");
  // Helius public devnet — rate limits are per-key not per-IP on free tier
  const resp = await rpcAirdrop("https://devnet.helius-rpc.com/?api-key=", LAMPORTS_1);
  // Also try without key
  return await rpcAirdrop("https://devnet.helius-rpc.com", LAMPORTS_1);
}

// ─── Check current balance ───────────────────────────────────

async function checkBalance(): Promise<number> {
  try {
    const resp = await fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [ADDR] }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await resp.json() as any;
    return (data?.result?.value ?? 0) / 1e9;
  } catch { return -1; }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const start = await checkBalance();
  console.log(`\nTarget: ${ADDR}`);
  console.log(`Current balance: ${start} SOL`);
  console.log("\n═══════════════════════════════════════");
  console.log("  FAUCET BLITZ — ALL CHANNELS\n");

  // Round 1: RPC airdrops in parallel (different amounts)
  console.log("⚡ Round 1: RPC airdrops across all endpoints...");
  const rpcResults = await Promise.allSettled(
    RPC_ENDPOINTS.flatMap(rpc => [
      rpcAirdrop(rpc, LAMPORTS_1),         // 1 SOL
      rpcAirdrop(rpc, LAMPORTS_1 * 2),     // 2 SOL
    ])
  );
  const rpcHits = rpcResults.filter(r => r.status === "fulfilled" && r.value).length;
  console.log(`\nRPC round done: ${rpcHits} hits\n`);

  // Round 2: Browser faucets
  await solanaDotFaucet();
  await solfateFaucet();

  // Final balance check
  await new Promise(r => setTimeout(r, 3000));
  const end = await checkBalance();
  const gained = end - Math.max(start, 0);

  console.log("\n═══════════════════════════════════════");
  console.log(`  RESULT: ${end} SOL (gained ${gained >= 0 ? "+" : ""}${gained.toFixed(4)} SOL)`);
  if (end > 0) {
    console.log("  ✅ FUNDED — ready for vault initialization");
  } else {
    console.log("  ⚠️  Still 0 — devnet faucets fully rate-limited this IP today");
    console.log("  Next try: midnight UTC reset, or use testnet instead");
  }
}

main().catch(console.error);
