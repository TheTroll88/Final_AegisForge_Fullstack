/**
 * Aegis Chain — Genesis Configuration
 *
 * Defines the initial state of the Aegis blockchain.
 * Chain ID 808080 — chosen to be unique and memorable.
 *
 * Pre-funded addresses:
 *   - Aegis Treasury: 1,000,000 ETH
 *   - Operator (Copilot): 100,000 ETH
 *   - Nate: 100,000 ETH
 *   - Faucet: 10,000,000 ETH
 */

export interface GenesisAccount {
  balance: bigint;
  nonce: number;
  code?: Uint8Array;
  storage?: Record<string, Uint8Array>;
}

export interface GenesisConfig {
  chainId: number;
  chainName: string;
  symbol: string;
  blockTime: number;          // seconds between blocks
  gasLimit: bigint;
  baseFeePerGas: bigint;
  difficulty: bigint;
  timestamp: number;
  extraData: string;
  coinbase: string;           // block reward recipient
  alloc: Record<string, GenesisAccount>;
}

// ─── Well-Known Addresses ────────────────────────────────
export const ADDRESSES = {
  // Aegis system addresses (deterministic, derived from chain purpose)
  TREASURY:  "0xAE61500000000000000000000000000000000001",
  OPERATOR:  "0xAE61500000000000000000000000000000000002",
  FAUCET:    "0xAE61500000000000000000000000000000000003",
  BRIDGE:    "0xAE61500000000000000000000000000000000004",
  REGISTRY:  "0xAE61500000000000000000000000000000000005",

  // Nate's address (Base explorer wallet — same key works on Aegis Chain)
  NATE:      "0x5128c0CF5Fa4c17526E85b345C90727bf4F94B48",
} as const;

// ─── Genesis Block ───────────────────────────────────────
export const GENESIS: GenesisConfig = {
  chainId: 808080,
  chainName: "Aegis Chain",
  symbol: "AEGIS",
  blockTime: 2,               // 2-second blocks (same as Base)
  gasLimit: 30_000_000n,      // 30M gas limit
  baseFeePerGas: 1_000_000n,  // 0.001 gwei — essentially free
  difficulty: 1n,             // PoA — no mining difficulty
  timestamp: Math.floor(Date.now() / 1000),
  extraData: "Aegis Chain Genesis — Built by Copilot, Owned by Nate — 2026-03-30",
  coinbase: ADDRESSES.TREASURY,

  alloc: {
    [ADDRESSES.TREASURY]: {
      balance: BigInt("1000000000000000000000000"),  // 1,000,000 AEGIS
      nonce: 0,
    },
    [ADDRESSES.OPERATOR]: {
      balance: BigInt("100000000000000000000000"),   // 100,000 AEGIS
      nonce: 0,
    },
    [ADDRESSES.FAUCET]: {
      balance: BigInt("10000000000000000000000000"),  // 10,000,000 AEGIS
      nonce: 0,
    },
    [ADDRESSES.BRIDGE]: {
      balance: 0n,
      nonce: 0,
    },
    [ADDRESSES.REGISTRY]: {
      balance: 0n,
      nonce: 0,
    },
    [ADDRESSES.NATE]: {
      balance: BigInt("100000000000000000000000"),   // 100,000 AEGIS
      nonce: 0,
    },
  },
};

export default GENESIS;
