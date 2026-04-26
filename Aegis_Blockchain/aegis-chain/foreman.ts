/**
 * Foreman Boot Script
 *
 * Starts Foreman as a standalone process connected to Aegis Chain.
 * Run alongside node.ts (chain must be running first).
 *
 * Usage: npx tsx foreman.ts
 */

import { Foreman } from "./src/foreman/index.js";

const AEGIS_RPC = "http://localhost:8545";
const BASE_RPC = "https://mainnet.base.org";

async function main() {
  const foreman = new Foreman({
    aegisRpc: AEGIS_RPC,
    baseRpc: BASE_RPC,
    headlessBrowser: true,
  });

  await foreman.boot();

  // Request faucet funding via Aegis RPC
  const wallet = foreman.getStatus().wallet;
  if (wallet) {
    try {
      const res = await fetch(`${AEGIS_RPC}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet }),
      });
      const data = await res.json();
      if (data.success) {
        console.log(`  [Foreman] Funded: ${data.formatted}`);
      }
    } catch (e: any) {
      console.log(`  [Foreman] Faucet request failed: ${e.message}`);
    }
  }

  // Run bridge status check
  const status = await foreman.execute({
    type: "bridge_check",
    description: "Initial bridge connectivity check",
    params: {},
  });

  if (status.success) {
    const [ aegis, base ] = status.result;

    const aegisStatus = aegis.connected
      ? "connected (block " + aegis.block.toLocaleString() + ")" 
      : "disconnected";
    
    const baseStatus = base.connected
      ? "connected (block " + base.block.toLocaleString() + ")"
      : "disconnected";
  console.log(`  [Foreman] Aegis: ${aegisStatus} `);
  console.log(`  [Foreman] Base:  ${baseStatus} `);

  console.log();
  console.log("  [Foreman] I'm online. Watching both chains. Running autonomous recon.");
  console.log("  [Foreman] I'll log anything worth your attention. You don't have to ask.");
  console.log();

  // Start autonomous operation
  foreman.startAutonomy();

  // Run initial recon — browse a few live opportunities and report back
  setTimeout(async () => {
    console.log("  [Foreman] Starting initial recon sweep...");

    // Run deeper recon sweep
    const reconTasks = [
      {
        type: "browse" as const,
        description: "Recon: Superteam earn listings",
        params: { url: "https://earn.superteam.fun/" },
      },
      {
        type: "browse" as const,
        description: "Recon: Ranger hackathon listing",
        params: { url: "https://superteam.fun/earn/listing/ranger-build-a-bear-hackathon-main-track" },
      },
      {
        type: "browse" as const,
        description: "Recon: AI-eligible bounties on Superteam",
        params: { url: "https://superteam.fun/earn/agents" },
      },
      {
        type: "browse" as const,
        description: "Recon: DeFiLlama Solana yields",
        params: { url: "https://defillama.com/yields?chain=Solana&token=USDC" },
      },
    ];

    for (const task of reconTasks) {
      try {
        const result = await foreman.execute(task);
        if (result.success && result.result?.title) {
          console.log(`  [Foreman] Recon ✓ "${result.result.title}" — ${result.result.url}`);
        }
      } catch (e: any) {
        // Browser may not be wired — log quietly
        console.log(`  [Foreman] Recon deferred (browser not launched): ${task.description}`);
      }
    }
  }, 5000);

  // Keep alive
  process.on("SIGINT", async () => {
    foreman.stopAutonomy();
    await foreman.shutdown();
    process.exit(0);
  });

  // Detailed status report every 5 minutes
  let lastCycles = 0;
  setInterval(() => {
    const a = foreman.getAutonomyStatus();
    if (a.cycles !== lastCycles && a.cycles % 30 === 0) {
      lastCycles = a.cycles;
      const uptimeMin = Math.floor(a.uptime / 60);
      const uptimeSec = a.uptime % 60;
      console.log();
      console.log("  ┌─── Foreman Status ───────────────────────┐");
      console.log(`  │  Uptime:     ${uptimeMin}m ${uptimeSec}s`);
      console.log(`  │  Cycles:     ${a.cycles}`);
      console.log(`  │  Signals:    ${a.signalsProcessed} processed, ${a.signalsSkipped} skipped`);
      console.log(`  │  Executions: ${a.executionsSuccess} success, ${a.executionsFailed} failed`);
      console.log("  └──────────────────────────────────────────┘");
      console.log();
    }
  }, 10_000);
}

main().catch((err) => {
  console.error("  [Foreman] Fatal:", err.message);
  process.exit(1);
}); 
}

