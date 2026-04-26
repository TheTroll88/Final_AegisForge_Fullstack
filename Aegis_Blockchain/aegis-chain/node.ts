/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║                    AEGIS CHAIN v1.0.0                     ║
 * ║                                                           ║
 * ║   A custom EVM-compatible blockchain built from scratch   ║
 * ║   by an AI in a VS Code session. No fork, no template.   ║
 * ║                                                           ║
 * ║   Chain ID:  808080                                       ║
 * ║   Symbol:    AEGIS                                        ║
 * ║   RPC:       http://localhost:8545                        ║
 * ║   Consensus: Proof of Authority                           ║
 * ║   EVM:       Full Ethereum Virtual Machine                ║
 * ║                                                           ║
 * ║   Built by Copilot — Owned by Nathaniel Crigger           ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

import { ethers } from "ethers";
import { AegisChain } from "./src/chain.js";
import { ADDRESSES, GENESIS } from "./src/genesis.js";
import { createRpcServer } from "./src/rpc.js";

const PORT = 8545;

async function main() {
  console.log();
  console.log("  ╔═══════════════════════════════════════════════╗");
  console.log("  ║             AEGIS CHAIN v1.0.0                ║");
  console.log("  ║     Custom EVM Blockchain — Chain 808080      ║");
  console.log("  ╚═══════════════════════════════════════════════╝");
  console.log();

  // Initialize blockchain
  const chain = new AegisChain(GENESIS);
  await chain.init();
  console.log();

  // Show genesis balances
  console.log("  Genesis Allocations:");
  console.log("  " + "─".repeat(55));
  for (const [name, addr] of Object.entries(ADDRESSES)) {
    const bal = await chain.getBalance(addr);
    const eth = ethers.formatEther(bal);
    if (bal > 0n) {
      console.log(`  ${name.padEnd(12)} ${parseFloat(eth).toLocaleString()} AEGIS`);
    }
  }
  console.log();

  // Start RPC server
  const app = createRpcServer(chain, PORT);
  const server = app.listen(PORT, () => {
    console.log(`  JSON-RPC:  http://localhost:${PORT}`);
    console.log(`  Explorer:  http://localhost:${PORT}/`);
    console.log(`  Chain ID:  808080 (0xC5450)`);
    console.log();
  });

  // Start block production
  chain.startProducing();

  console.log("  ─────────────────────────────────────────────────");
  console.log("  MetaMask Setup:");
  console.log(`    Network Name:  Aegis Chain`);
  console.log(`    RPC URL:       http://localhost:${PORT}`);
  console.log(`    Chain ID:      808080`);
  console.log(`    Symbol:        AEGIS`);
  console.log("  ─────────────────────────────────────────────────");
  console.log();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n  [Chain] Shutting down...");
    chain.stopProducing();
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
