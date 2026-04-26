const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const INITIAL_MESSAGE = process.env.ECHO_INITIAL_MESSAGE || "AegisForge — online.";

  console.log("Deploying EchoBeacon with account:", deployer.address);
  console.log("Initial message:", INITIAL_MESSAGE);

  const EchoBeacon = await hre.ethers.getContractFactory("EchoBeacon");
  const echo = await EchoBeacon.deploy(INITIAL_MESSAGE);
  await echo.waitForDeployment();

  const address = await echo.getAddress();
  console.log("\n✅ EchoBeacon deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Stored message:", await echo.message());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
