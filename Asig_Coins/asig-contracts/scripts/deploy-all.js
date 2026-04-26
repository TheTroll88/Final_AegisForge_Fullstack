/**
 * deploy-all.js — Deploy all four AegisForge contracts in sequence.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-all.js --network base-sepolia
 *   npx hardhat run scripts/deploy-all.js --network base
 *
 * Outputs a deployment summary JSON at the end for vault registry updates.
 */
const hre = require("hardhat");

async function deploy(name, ...args) {
  const Factory = await hre.ethers.getContractFactory(name);
  const instance = await Factory.deploy(...args);
  await instance.waitForDeployment();
  const address = await instance.getAddress();
  console.log(`  ✅ ${name.padEnd(22)} → ${address}`);
  return { name, address };
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log("═══════════════════════════════════════════════");
  console.log("  AegisForge Contract Suite — Full Deploy");
  console.log("═══════════════════════════════════════════════");
  console.log("  Deployer :", deployer.address);
  console.log("  Network  :", network);
  console.log("  Timestamp:", new Date().toISOString());
  console.log("───────────────────────────────────────────────\n");

  const initialMessage = process.env.ECHO_INITIAL_MESSAGE || "AegisForge — online.";

  const results = await Promise.all([
    deploy("AegisSignal"),
    deploy("EchoBeacon", initialMessage),
    deploy("MetaSignalRegistry"),
    deploy("Watcher"),
  ]);

  console.log("\n───────────────────────────────────────────────");
  console.log("  Deployment Summary (save to vault registry)");
  console.log("───────────────────────────────────────────────");

  const summary = {
    network,
    deployer:  deployer.address,
    timestamp: new Date().toISOString(),
    contracts: Object.fromEntries(results.map(({ name, address }) => [name, address])),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
