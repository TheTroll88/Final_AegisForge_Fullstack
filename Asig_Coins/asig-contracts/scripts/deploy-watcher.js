const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Watcher with account:", deployer.address);

  const Watcher = await hre.ethers.getContractFactory("Watcher");
  const watcher = await Watcher.deploy();
  await watcher.waitForDeployment();

  const address         = await watcher.getAddress();
  const registryAddress = await watcher.registry();

  console.log("\n✅ Watcher deployed to:", address);
  console.log("   ↳ Internal MetaSignalRegistry at:", registryAddress);
  console.log("Network:", hre.network.name);
  console.log("Watcher role held by:", deployer.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
