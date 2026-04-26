# asig-contracts

Solidity contracts for the **AegisSignal (ASIG)** ecosystem, deployed on [Base](https://base.org).

---

## Contracts

| Contract             | File              | Description                                                                             |
|----------------------|-------------------|-----------------------------------------------------------------------------------------|
| `AegisSignal`        | `AegisSignal.sol` | ERC-20 token — 1,000,000 ASIG, 18 decimals, no mint/burn post-deploy                    |
| `EchoBeacon`         | `EchoBeacon.sol`  | On-chain string store; emits diff events on each update                                 |
| `MetaSignalRegistry` | `MetaSignal.sol`  | Append-only signal log — stores sender, message, timestamp structs                      |
| `Watcher`            | `Watcher.sol`     | Permissioned proxy over `MetaSignalRegistry`; role-gated writes with ownership transfer |

---

## Project Structure

```#
asig-contracts/
├── contracts/
│   ├── AegisSignal.sol
│   ├── EchoBeacon.sol
│   ├── MetaSignal.sol
│   └── Watcher.sol
├── scripts/
│   ├── deploy-asig.js
│   ├── deploy-echo.js
│   ├── deploy-registry.js
│   ├── deploy-watcher.js
│   └── deploy-all.js          ← deploys all four in one shot
├── test/
│   ├── AegisSignal.test.js
│   ├── EchoBeacon.test.js
│   ├── MetaSignal.test.js
│   └── Watcher.test.js
├── artifacts/
│   └── build-info/            ← original Hardhat compiler artifacts (source of truth)
├── hardhat.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
```

**Required `.env` values for mainnet/testnet deploys:**

| Key                    | Description                                                                         |
|------------------------|-------------------------------------------------------------------------------------|
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet private key                                                         |
| `BASE_RPC_URL`         | Base mainnet RPC endpoint                                                           |
| `BASESCAN_API_KEY`     | From [basescan.org/myaccount](https://basescan.org/myaccount) — needed for `verify` |

---

## Usage

```bash
# Compile
npm run compile

# Run all tests (local Hardhat network)
npm test

# Run tests with gas report
npm run test:gas

# Coverage report
npm run coverage

# Deploy individual contracts (uses .env network by default → localhost)
npm run deploy:asig
npm run deploy:echo
npm run deploy:registry
npm run deploy:watcher

# Deploy all to Base Sepolia testnet
npm run deploy:all:testnet

# Deploy all to Base mainnet
npm run deploy:all:mainnet

# Verify on Basescan (after mainnet deploy)
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

---

## Networks

| Network      | Chain ID | Explorer                                             |
|--------------|----------|------------------------------------------------------|
| Base Mainnet | 8453     | [basescan.org](https://basescan.org)                 |
| Base Sepolia | 84532    | [sepolia.basescan.org](https://sepolia.basescan.org) |

---

## Token — ASIG

| Field        | Value                                    |
|--------------|------------------------------------------|
| Name         | Aegis Signal                             |
| Symbol       | ASIG                                     |
| Decimals     | 18                                       |
| Total Supply | 1,000,000                                |
| Standard     | ERC-20                                   |
| Network      | Base                                     |
| Website      | [aegissignal.io](https://aegissignal.io) |

---

## License

MIT
