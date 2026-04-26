/**
 * Aegis Chain — Blockchain Core
 *
 * A custom EVM-compatible blockchain built from first principles.
 * Uses EthereumJS for EVM execution, custom everything else.
 *
 * Architecture:
 *   - Proof of Authority consensus (single sequencer)
 *   - 2-second block time
 *   - Full EVM support (deploy & call smart contracts)
 *   - Persistent state via in-memory trie (disk snapshots planned)
 *   - Event-driven block production
 */

import { Block, createBlock } from "@ethereumjs/block";
import { createCustomCommon, Hardfork, Mainnet } from "@ethereumjs/common";
import { SimpleStateManager } from "@ethereumjs/statemanager";
import { createLegacyTxFromRLP, LegacyTx } from "@ethereumjs/tx";
import { Account, Address, bytesToHex, hexToBytes, toBytes } from "@ethereumjs/util";
import { createVM, runTx, VM } from "@ethereumjs/vm";
import { ADDRESSES, GENESIS, GenesisConfig } from "./genesis.js";

// ─── Types ───────────────────────────────────────────────

export interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasUsed: bigint;
  gasLimit: bigint;
  baseFeePerGas: bigint;
  miner: string;
  transactions: string[];
  transactionCount: number;
  stateRoot: string;
  extraData: string;
  size: number;
}

export interface TxData {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  data: string;
  blockNumber: number | null;
  blockHash: string | null;
  transactionIndex: number | null;
  status: number;        // 1 = success, 0 = revert
  gasUsed: string;
  contractAddress: string | null;
  logs: any[];
}

export interface PendingTx {
  raw: Uint8Array;
  tx: LegacyTx;
  hash: string;
}

// ─── Aegis Blockchain ────────────────────────────────────

export class AegisChain {
  private vm!: VM;
  private common!: ReturnType<typeof createCustomCommon>;
  private stateManager!: SimpleStateManager;

  // Chain state
  private blocks: Map<string, BlockData> = new Map();        // hash → block
  private blocksByNumber: Map<number, BlockData> = new Map(); // number → block
  private transactions: Map<string, TxData> = new Map();     // hash → tx
  private pendingTxs: PendingTx[] = [];
  private currentBlockNumber = 0;
  private latestBlockHash = "0x" + "0".repeat(64);

  // Config
  private genesis: GenesisConfig;
  private blockTimer: ReturnType<typeof setInterval> | null = null;
  private producing = false;

  // Stats
  public stats = {
    totalTxs: 0,
    totalBlocks: 0,
    startTime: Date.now(),
    lastBlockTime: 0,
  };

  constructor(genesis: GenesisConfig = GENESIS) {
    this.genesis = genesis;
  }

  /**
   * Initialize the blockchain — set up EVM, load genesis state
   */
  async init(): Promise<void> {
    // Create custom chain config
    this.common = createCustomCommon(
      { chainId: this.genesis.chainId },
      Mainnet,
      {
        hardfork: Hardfork.London,
        eips: [1559],
      }
    );

    // Initialize state manager
    this.stateManager = new SimpleStateManager();

    // Create VM with EVM
    this.vm = await createVM({
      common: this.common,
      stateManager: this.stateManager,
    });

    // Apply genesis allocations
    await this.applyGenesis();

    // Create genesis block
    const genesisBlock = this.createBlockData(0, "0x" + "0".repeat(64), [], 0n);
    this.blocks.set(genesisBlock.hash, genesisBlock);
    this.blocksByNumber.set(0, genesisBlock);
    this.latestBlockHash = genesisBlock.hash;
    this.stats.totalBlocks = 1;

    console.log(`  [Chain] Aegis Chain initialized`);
    console.log(`  [Chain] Chain ID: ${this.genesis.chainId}`);
    console.log(`  [Chain] Genesis accounts: ${Object.keys(this.genesis.alloc).length}`);
    console.log(`  [Chain] Block time: ${this.genesis.blockTime}s`);
  }

  /**
   * Apply genesis state — fund pre-allocated accounts
   */
  private async applyGenesis(): Promise<void> {
    for (const [addr, acct] of Object.entries(this.genesis.alloc)) {
      const address = new Address(hexToBytes(addr));
      const account = new Account(BigInt(acct.nonce), acct.balance);
      await this.stateManager.putAccount(address, account);
    }
    if (typeof (this.stateManager as any).flush === "function") {
      await (this.stateManager as any).flush();
    }
  }

  /**
   * Start producing blocks on the configured interval
   */
  startProducing(): void {
    if (this.blockTimer) return;
    this.producing = true;

    console.log(`  [Chain] Block production started (every ${this.genesis.blockTime}s)`);

    this.blockTimer = setInterval(async () => {
      try {
        await this.produceBlock();
      } catch (err: any) {
        console.error(`  [Chain] Block production error: ${err.message}`);
      }
    }, this.genesis.blockTime * 1000);
  }

  /**
   * Stop block production
   */
  stopProducing(): void {
    if (this.blockTimer) {
      clearInterval(this.blockTimer);
      this.blockTimer = null;
      this.producing = false;
      console.log(`  [Chain] Block production stopped`);
    }
  }

  /**
   * Produce a new block — execute pending transactions and seal
   */
  async produceBlock(): Promise<BlockData> {
    const blockNumber = this.currentBlockNumber + 1;
    const parentHash = this.latestBlockHash;
    const timestamp = Math.floor(Date.now() / 1000);

    // Grab pending transactions (up to gas limit)
    const txsToInclude = this.pendingTxs.splice(0, 100); // max 100 per block
    const txHashes: string[] = [];
    let totalGasUsed = 0n;

    // Execute each transaction
    for (const pending of txsToInclude) {
      try {
        const result = await runTx(this.vm, { tx: pending.tx, block: this.buildBlock(blockNumber, timestamp) });

        const receipt: TxData = {
          hash: pending.hash,
          from: pending.tx.getSenderAddress().toString(),
          to: pending.tx.to ? pending.tx.to.toString() : null,
          value: pending.tx.value.toString(),
          gasLimit: pending.tx.gasLimit.toString(),
          gasPrice: pending.tx.gasPrice.toString(),
          nonce: Number(pending.tx.nonce),
          data: bytesToHex(pending.tx.data),
          blockNumber,
          blockHash: "", // filled after block creation
          transactionIndex: txHashes.length,
          status: result.execResult.exceptionError ? 0 : 1,
          gasUsed: result.totalGasSpent.toString(),
          contractAddress: result.createdAddress ? result.createdAddress.toString() : null,
          logs: result.receipt?.logs?.map((log, i) => ({
            logIndex: i,
            address: bytesToHex(log[0] instanceof Uint8Array ? log[0] : toBytes(log[0])),
            topics: (log[1] as Uint8Array[]).map((t: Uint8Array) => bytesToHex(t)),
            data: bytesToHex(log[2] instanceof Uint8Array ? log[2] : toBytes(log[2])),
            blockNumber,
            transactionHash: pending.hash,
          })) || [],
        };

        this.transactions.set(pending.hash, receipt);
        txHashes.push(pending.hash);
        totalGasUsed += result.totalGasSpent;
        this.stats.totalTxs++;
      } catch (err: any) {
        console.error(`  [Chain] Tx execution failed: ${err.message}`);
      }
    }

    // Create block
    const blockData = this.createBlockData(blockNumber, parentHash, txHashes, totalGasUsed);

    // Update tx receipts with block hash
    for (const hash of txHashes) {
      const tx = this.transactions.get(hash);
      if (tx) tx.blockHash = blockData.hash;
    }

    // Store block
    this.blocks.set(blockData.hash, blockData);
    this.blocksByNumber.set(blockNumber, blockData);
    this.currentBlockNumber = blockNumber;
    this.latestBlockHash = blockData.hash;
    this.stats.totalBlocks++;
    this.stats.lastBlockTime = Date.now();

    // Log non-empty blocks
    if (txHashes.length > 0) {
      console.log(`  [Chain] Block #${blockNumber} sealed — ${txHashes.length} tx(s), ${totalGasUsed} gas`);
    }

    return blockData;
  }

  /**
   * Submit a signed transaction to the mempool
   */
  async submitTransaction(rawTx: Uint8Array): Promise<string> {
    const tx = createLegacyTxFromRLP(rawTx, { common: this.common });
    const hash = bytesToHex(tx.hash());

    // Validate sender has sufficient balance
    const sender = tx.getSenderAddress();
    const senderAccount = await this.stateManager.getAccount(sender);

    if (!senderAccount) {
      throw new Error("Sender account does not exist");
    }

    const cost = tx.value + tx.gasLimit * tx.gasPrice;
    if (senderAccount.balance < cost) {
      throw new Error(`Insufficient balance: have ${senderAccount.balance}, need ${cost}`);
    }

    // Validate nonce
    if (tx.nonce !== senderAccount.nonce) {
      throw new Error(`Invalid nonce: expected ${senderAccount.nonce}, got ${tx.nonce}`);
    }

    this.pendingTxs.push({ raw: rawTx, tx, hash });
    return hash;
  }

  // ─── Query Methods ──────────────────────────────────────

  getBlockNumber(): number {
    return this.currentBlockNumber;
  }

  getBlock(hashOrNumber: string | number): BlockData | undefined {
    if (typeof hashOrNumber === "number") {
      return this.blocksByNumber.get(hashOrNumber);
    }
    if (hashOrNumber === "latest") {
      return this.blocksByNumber.get(this.currentBlockNumber);
    }
    if (hashOrNumber === "earliest") {
      return this.blocksByNumber.get(0);
    }
    return this.blocks.get(hashOrNumber);
  }

  getTransaction(hash: string): TxData | undefined {
    return this.transactions.get(hash);
  }

  async getBalance(address: string): Promise<bigint> {
    const addr = new Address(hexToBytes(address));
    const account = await this.stateManager.getAccount(addr);
    return account?.balance ?? 0n;
  }

  async getNonce(address: string): Promise<bigint> {
    const addr = new Address(hexToBytes(address));
    const account = await this.stateManager.getAccount(addr);
    return account?.nonce ?? 0n;
  }

  async getCode(address: string): Promise<string> {
    const addr = new Address(hexToBytes(address));
    const code = await this.stateManager.getCode(addr);
    return bytesToHex(code);
  }

  async getStorageAt(address: string, slot: string): Promise<string> {
    const addr = new Address(hexToBytes(address));
    const value = await this.stateManager.getStorage(addr, hexToBytes(slot.padStart(66, "0x" + "0".repeat(62))));
    return bytesToHex(value);
  }

  getChainId(): number {
    return this.genesis.chainId;
  }

  getGasPrice(): bigint {
    return this.genesis.baseFeePerGas;
  }

  getPendingTxCount(): number {
    return this.pendingTxs.length;
  }

  isProducing(): boolean {
    return this.producing;
  }

  /**
   * Faucet — send AEGIS from faucet to any address (dev chain only)
   */
  async faucet(toAddress: string, amount: bigint = BigInt("10000000000000000000000")): Promise<boolean> {
    const faucetAddr = new Address(hexToBytes(ADDRESSES.FAUCET));
    const toAddr = new Address(hexToBytes(toAddress));

    const faucetAccount = await this.stateManager.getAccount(faucetAddr);
    if (!faucetAccount || faucetAccount.balance < amount) {
      throw new Error("Faucet insufficient balance");
    }

    // Direct state manipulation (dev chain privilege)
    const toAccount = await this.stateManager.getAccount(toAddr) ?? new Account(0n, 0n);

    await this.stateManager.putAccount(faucetAddr, new Account(faucetAccount.nonce, faucetAccount.balance - amount));
    await this.stateManager.putAccount(toAddr, new Account(toAccount.nonce, toAccount.balance + amount));

    console.log(`  [Faucet] Sent ${Number(amount / BigInt(1e18))} AEGIS to ${toAddress}`);
    return true;
  }

  async call(to: string, data: string): Promise<string> {
    const toAddr = new Address(hexToBytes(to));
    const result = await this.vm.evm.runCall({
      to: toAddr,
      data: hexToBytes(data),
      gasLimit: this.genesis.gasLimit,
      caller: new Address(hexToBytes(ADDRESSES.OPERATOR)),
    });

    if (result.execResult.exceptionError) {
      throw new Error(`Call reverted: ${result.execResult.exceptionError.error}`);
    }

    return bytesToHex(result.execResult.returnValue);
  }

  async estimateGas(from: string, to: string | null, data: string, value: bigint = 0n): Promise<bigint> {
    const fromAddr = new Address(hexToBytes(from));
    const toAddr = to ? new Address(hexToBytes(to)) : undefined;

    const result = await this.vm.evm.runCall({
      caller: fromAddr,
      to: toAddr,
      data: hexToBytes(data || "0x"),
      value,
      gasLimit: this.genesis.gasLimit,
    });

    // Add 20% buffer
    const gasUsed = result.execResult.executionGasUsed;
    return gasUsed + gasUsed / 5n;
  }

  // ─── Internal Helpers ───────────────────────────────────

  private createBlockData(
    number: number,
    parentHash: string,
    txHashes: string[],
    gasUsed: bigint
  ): BlockData {
    const timestamp = Math.floor(Date.now() / 1000);

    // Simple deterministic hash (not cryptographically secure, but unique)
    const blockInput = `${number}:${parentHash}:${timestamp}:${txHashes.join(",")}`;
    const hashNum = BigInt("0x" + Buffer.from(blockInput).toString("hex").slice(0, 16));
    const hash = "0x" + hashNum.toString(16).padStart(64, "0");

    return {
      number,
      hash,
      parentHash,
      timestamp,
      gasUsed,
      gasLimit: this.genesis.gasLimit,
      baseFeePerGas: this.genesis.baseFeePerGas,
      miner: this.genesis.coinbase,
      transactions: txHashes,
      transactionCount: txHashes.length,
      stateRoot: "0x" + "0".repeat(64), // simplified
      extraData: number === 0 ? this.genesis.extraData : "",
      size: 1000 + txHashes.length * 500,
    };
  }

  private buildBlock(number: number, timestamp: number): Block {
    return createBlock(
      {
        header: {
          number: BigInt(number),
          gasLimit: this.genesis.gasLimit,
          baseFeePerGas: this.genesis.baseFeePerGas,
          timestamp: BigInt(timestamp),
          coinbase: new Address(hexToBytes(this.genesis.coinbase)),
          difficulty: this.genesis.difficulty,
        },
      },
      { common: this.common }
    );
  }
}

export default AegisChain;
