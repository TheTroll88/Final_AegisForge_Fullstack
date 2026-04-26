require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { DEPLOYER_PRIVATE_KEY, BASE_RPC_URL, BASESCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },

  defaultNetwork: "hardhat",

  networks: {
    hardhat: {},

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    base: {
      url: BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },

    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: {
      base:         BASESCAN_API_KEY || "",
      "base-sepolia": BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL:     "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL:     "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
