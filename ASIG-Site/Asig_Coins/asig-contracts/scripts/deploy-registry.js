const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying MetaSignalRegistry with account:", deployer.address);

  const MetaSignalRegistry = await hre.ethers.getContractFactory("MetaSignalRegistry");
  const registry = await MetaSignalRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ MetaSignalRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
