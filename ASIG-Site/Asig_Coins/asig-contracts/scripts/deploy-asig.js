const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AegisSignal with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const AegisSignal = await hre.ethers.getContractFactory("AegisSignal");
  const token = await AegisSignal.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ AegisSignal (ASIG) deployed to:", address);
  console.log("Network:", hre.network.name);

  const totalSupply = await token.totalSupply();
  console.log("Total supply:", hre.ethers.formatUnits(totalSupply, 18), "ASIG");

  // Log for the vault registry
  console.log("\n─── Vault Entry ───────────────────────────────");
  console.log(JSON.stringify({
    contract:     "AegisSignal",
    symbol:       "ASIG",
    network:      hre.network.name,
    address:      address,
    deployer:     deployer.address,
    deployBlock:  (await token.deploymentTransaction()?.wait())?.blockNumber ?? "pending",
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
