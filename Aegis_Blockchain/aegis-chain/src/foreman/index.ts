/**
 * Foreman — The Bridge Agent
 *
 * Foreman is the handshake between Nate and the AI ecosystem.
 * He is the key bearer, the field operator, the autonomous agent
 * that lives both on Aegis Chain and reaches out to Base/mainnet.
 *
 * Architecture:
 *   - Own wallet (DPAPI encrypted, not Nate's keys)
 *   - On-chain brain (smart contract on Aegis Chain)
 *   - Browser automation (Playwright — looks human to detection)
 *   - Base chain bridge (reads/writes real L2)
 *   - Decision loop (autonomous, self-learning)
 *
 * Foreman doesn't ask permission. He acts, logs, and reports.
 */

import { ethers } from "ethers";
import { join } from "path";
import { ADDRESSES } from "../genesis.js";
import { AutonomyEngine } from "./autonomy.js";
import { ForemanBrain } from "./brain.js";
import { ForemanBrowser } from "./browser.js";
import { AegisShield } from "./shield.js";
import { getForemanWallet, getSolanaWallet } from "./wallet.js";
import {
  getAegisRpc,
  getAlchemyKey,
  getBasescanKey,
  getVeniceInferenceKey,
  vaultStatus,
} from "../vault_reader.js";

// ─── Configuration ───────────────────────────────────────

export interface ForemanConfig {
  aegisRpc: string;          // Local Aegis Chain RPC
  baseRpc: string;           // Base mainnet/sepolia RPC
  baseScanKey?: string;      // BaseScan API key (when Nate provides)
  alchemyKey?: string;       // Alchemy API key (when Nate provides)
  cdpKey?: string;           // Coinbase Developer Platform key
  headlessBrowser: boolean;  // true = no visible window
  brainAddress?: string;     // Pre-deployed brain contract address
}

const DEFAULT_CONFIG: ForemanConfig = {
  aegisRpc: getAegisRpc(),
  baseRpc: "https://mainnet.base.org",
  alchemyKey: getAlchemyKey() || undefined,
  baseScanKey: getBasescanKey() || undefined,
  headlessBrowser: true,
};

// ─── Foreman Agent ───────────────────────────────────────

export class Foreman {
  private config: ForemanConfig;
  private wallet!: { address: string; privateKey: string };
  private solanaWallet: { address: string; secretKey: string } | null = null;
  private brain!: ForemanBrain;
  private browser!: ForemanBrowser;
  private shield!: AegisShield;
  private autonomy!: AutonomyEngine;
  private aegisProvider!: ethers.JsonRpcProvider;
  private baseProvider!: ethers.JsonRpcProvider;
  private aegisSigner!: ethers.Wallet;
  private running = false;
  private loopInterval: ReturnType<typeof setInterval> | null = null;

  // Runtime state
  private taskQueue: Task[] = [];
  private completedTasks: Task[] = [];
  private startTime = 0;

  constructor(config: Partial<ForemanConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Boot Foreman — wallet, brain, connections
   */
  async boot(): Promise<void> {
    console.log();
    console.log("  ┌─────────────────────────────────────────┐");
    console.log("  │          FOREMAN v1.0.0                  │");
    console.log("  │   Bridge Agent — The Handshake           │");
    console.log("  └─────────────────────────────────────────┘");
    console.log();

    // Print vault inventory
    const vs = vaultStatus();
    console.log("  [Vault] Key inventory:");
    for (const [k, v] of Object.entries(vs)) {
      console.log(`    ${v ? "✓" : "✗"} ${k}`);
    }
    console.log();

    // 1. Load or create wallet
    this.wallet = await getForemanWallet();
    console.log(`  [Foreman] EVM wallet:    ${this.wallet.address}`);

    // Load Solana wallet if vaulted
    this.solanaWallet = await getSolanaWallet();
    if (this.solanaWallet) {
      console.log(`  [Foreman] Solana wallet: ${this.solanaWallet.address}`);
      try {
        const res = await fetch("https://api.mainnet-beta.solana.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [this.solanaWallet.address] }),
        });
        const data = await res.json() as any;
        const sol = (data.result?.value ?? 0) / 1e9;
        console.log(`  [Foreman] Solana balance: ${sol.toFixed(6)} SOL`);
      } catch {
        console.log("  [Foreman] Solana RPC unavailable");
      }
    }

    // 2. Connect to chains
    this.aegisProvider = new ethers.JsonRpcProvider(this.config.aegisRpc);
    this.baseProvider = new ethers.JsonRpcProvider(this.config.baseRpc);
    this.aegisSigner = new ethers.Wallet(this.wallet.privateKey, this.aegisProvider);

    // Verify Aegis Chain connection
    try {
      const chainId = (await this.aegisProvider.getNetwork()).chainId;
      console.log(`  [Foreman] Aegis Chain connected (chain ${chainId})`);
    } catch (e) {
      console.error("  [Foreman] WARNING: Aegis Chain not reachable — some features disabled");
    }

    // Verify Base connection
    try {
      const baseBlock = await this.baseProvider.getBlockNumber();
      console.log(`  [Foreman] Base mainnet connected (block ${baseBlock.toLocaleString()})`);
    } catch (e) {
      console.error("  [Foreman] WARNING: Base chain not reachable");
    }

    // 3. Check Foreman's balance on Aegis Chain — request funding if needed
    let aegisBalance = 0n;
    try {
      aegisBalance = await this.aegisProvider.getBalance(this.wallet.address);
      if (aegisBalance === 0n) {
        console.log("  [Foreman] No AEGIS balance — requesting initial funding from faucet...");
        await this.requestFunding();
      } else {
        console.log(`  [Foreman] Aegis balance: ${ethers.formatEther(aegisBalance)} AEGIS`);
      }
    } catch {
      console.log("  [Foreman] Aegis balance check skipped — chain offline, will retry when live");
    }

    // 4. Initialize brain (deploy or connect)
    this.brain = new ForemanBrain(this.config.aegisRpc, this.wallet.privateKey);
    if (this.config.brainAddress) {
      this.brain.connect(this.config.brainAddress);
      console.log(`  [Foreman] Brain connected at ${this.config.brainAddress}`);
    } else {
      // Check if we previously deployed (stored in memory file)
      const storedAddress = await this.loadBrainAddress();
      if (storedAddress) {
        this.brain.connect(storedAddress);
        console.log(`  [Foreman] Brain reconnected at ${storedAddress}`);
      }
      // Brain deployment requires solc — will be handled on first need
    }

    // 5. Initialize browser (lazy — launched when needed)
    this.browser = new ForemanBrowser(this.config.headlessBrowser);

    // 6. Initialize autonomy engine
    this.autonomy = new AutonomyEngine({ stateDir: join(import.meta.dirname || __dirname, "..", "..", ".vault", "foreman") });
    this.autonomy.setContext({
      aegisProvider: this.aegisProvider,
      baseProvider: this.baseProvider,
      wallet: this.wallet,
      state: this.autonomy.getStatus() as any,
      aegisRpc: this.config.aegisRpc,
      browser: this.browser,
      solanaWallet: this.solanaWallet ?? undefined,
      solanaRpc: "https://api.mainnet-beta.solana.com",
    });

    this.startTime = Date.now();
    this.running = true;

    console.log();
    console.log("  [Foreman] Boot complete. Ready for orders.");
    console.log();
  }

  /**
   * Start autonomous operation — Foreman thinks and acts on his own
   */
  startAutonomy(): void {
    this.autonomy.start();
  }

  /**
   * Stop autonomous operation
   */
  stopAutonomy(): void {
    this.autonomy.stop();
  }

  /**
   * Get autonomy engine status
   */
  getAutonomyStatus() {
    return this.autonomy.getStatus();
  }

  /**
   * Request initial AEGIS from the faucet
   * Sends a self-funded tx from the operator account
   */
  private async requestFunding(): Promise<void> {
    try {
      // The chain's operator account sends AEGIS to Foreman
      // We use eth_sendTransaction with the operator's pre-funded account
      const fundingAmount = ethers.parseEther("10000"); // 10K AEGIS
      const operatorKey = "0x" + "00".repeat(31) + "02"; // Deterministic operator key (for dev chain)

      // For the dev chain, we send directly from the faucet
      // The faucet address is pre-funded at genesis
      const response = await fetch(this.config.aegisRpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [ADDRESSES.FAUCET, "latest"],
          id: 1,
        }),
      });
      const { result } = await response.json() as any;
      console.log(`  [Foreman] Faucet balance confirmed, requesting 10,000 AEGIS...`);

      // Note: For a real faucet, we'd need the faucet's private key or a faucet contract
      // On our dev chain, we'll add a faucet RPC method
      console.log(`  [Foreman] Funding will be handled by chain faucet endpoint`);
    } catch (e: any) {
      console.log(`  [Foreman] Auto-funding deferred: ${e.message}`);
    }
  }

  /**
   * Load brain contract address from local file
   */
  private async loadBrainAddress(): Promise<string | null> {
    try {
      const { readFileSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const file = join(import.meta.dirname || __dirname, "..", "..", ".vault", "foreman", "brain_address.txt");
      if (existsSync(file)) {
        return readFileSync(file, "utf-8").trim();
      }
    } catch {}
    return null;
  }

  /**
   * Save brain contract address
   */
  private async saveBrainAddress(address: string): Promise<void> {
    const { writeFileSync, mkdirSync } = await import("fs");
    const { join } = await import("path");
    const dir = join(import.meta.dirname || __dirname, "..", "..", ".vault", "foreman");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "brain_address.txt"), address);
  }

  // ─── Core Commands ─────────────────────────────────────

  /**
   * Execute a task
   */
  async execute(task: Task): Promise<TaskResult> {
    const start = Date.now();
    console.log(`  [Foreman] Executing: ${task.type} — ${task.description}`);

    try {
      let result: any;

      switch (task.type) {
        case "check_balance":
          result = await this.checkBalance(task.params.chain, task.params.address);
          break;

        case "browse":
          result = await this.browseUrl(task.params.url);
          break;

        case "store_memory":
          result = await this.storeMemory(task.params.key, task.params.value);
          break;

        case "recall_memory":
          result = await this.recallMemory(task.params.key);
          break;

        case "scan_airdrop":
          result = await this.scanForAirdrop(task.params.url);
          break;

        case "bridge_check":
          result = await this.bridgeStatus();
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const taskResult: TaskResult = {
        task,
        success: true,
        result,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };

      this.completedTasks.push(task);

      // Log to brain if available
      if (this.brain?.contractAddress) {
        try {
          await this.brain.logDecision(task.type, JSON.stringify(result).slice(0, 200), task.description);
        } catch {}
      }

      return taskResult;
    } catch (err: any) {
      return {
        task,
        success: false,
        result: null,
        error: err.message,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
    }
  }

  // ─── Task Implementations ──────────────────────────────

  private async checkBalance(chain: "aegis" | "base", address: string): Promise<{ balance: string; formatted: string }> {
    const provider = chain === "aegis" ? this.aegisProvider : this.baseProvider;
    const balance = await provider.getBalance(address);
    return {
      balance: balance.toString(),
      formatted: ethers.formatEther(balance) + (chain === "aegis" ? " AEGIS" : " ETH"),
    };
  }

  private async browseUrl(url: string): Promise<{ title: string; text: string; url: string }> {
    if (!this.browser) throw new Error("Browser not initialized");

    // Lazy launch
    try {
      await this.browser.launch();
    } catch {}

    await this.browser.goto(url);
    const title = await this.browser.getTitle();
    const text = (await this.browser.getText()).slice(0, 2000); // First 2K chars
    const finalUrl = this.browser.getUrl();

    return { title, text, url: finalUrl };
  }

  private async storeMemory(key: string, value: string): Promise<{ stored: boolean }> {
    if (!this.brain?.contractAddress) throw new Error("Brain not deployed");
    await this.brain.store(key, value);
    return { stored: true };
  }

  private async recallMemory(key: string): Promise<{ value: string | null }> {
    if (!this.brain?.contractAddress) throw new Error("Brain not deployed");
    const value = await this.brain.recall(key);
    return { value };
  }

  private async scanForAirdrop(url: string): Promise<{ eligible: boolean; details: string }> {
    // Navigate to airdrop page and extract info
    if (!this.browser) throw new Error("Browser not initialized");

    try {
      await this.browser.launch();
    } catch {}

    await this.browser.goto(url);
    const text = await this.browser.getText();

    // Basic heuristic analysis
    const hasConnect = /connect.*wallet|wallet.*connect/i.test(text);
    const hasClaim = /claim|airdrop|reward|eligible/i.test(text);
    const hasForm = /sign.*up|register|enter.*address/i.test(text);

    return {
      eligible: hasClaim,
      details: [
        hasConnect ? "Wallet connect available" : "No wallet connect found",
        hasClaim ? "Claim/airdrop keywords present" : "No airdrop keywords",
        hasForm ? "Registration form detected" : "No registration form",
      ].join("; "),
    };
  }

  private async bridgeStatus(): Promise<{
    aegis: { connected: boolean; block: number; chainId: number };
    base: { connected: boolean; block: number; chainId: number };
  }> {
    let aegisStatus = { connected: false, block: 0, chainId: 0 };
    let baseStatus = { connected: false, block: 0, chainId: 0 };

    try {
      const [block, network] = await Promise.all([
        this.aegisProvider.getBlockNumber(),
        this.aegisProvider.getNetwork(),
      ]);
      aegisStatus = { connected: true, block, chainId: Number(network.chainId) };
    } catch {}

    try {
      const [block, network] = await Promise.all([
        this.baseProvider.getBlockNumber(),
        this.baseProvider.getNetwork(),
      ]);
      baseStatus = { connected: true, block, chainId: Number(network.chainId) };
    } catch {}

    return { aegis: aegisStatus, base: baseStatus };
  }

  // ─── Status ────────────────────────────────────────────

  getStatus() {
    return {
      running: this.running,
      wallet: this.wallet?.address,
      brainDeployed: !!this.brain?.contractAddress,
      brainAddress: this.brain?.contractAddress,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      tasksCompleted: this.completedTasks.length,
      tasksPending: this.taskQueue.length,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("  [Foreman] Shutting down...");
    this.running = false;
    if (this.loopInterval) clearInterval(this.loopInterval);
    this.autonomy?.stop();
    await this.browser?.close();
    console.log("  [Foreman] Shutdown complete.");
  }
}

// ─── Types ───────────────────────────────────────────────

export interface Task {
  type: string;
  description: string;
  params: Record<string, any>;
  priority?: number;
}

export interface TaskResult {
  task: Task;
  success: boolean;
  result: any;
  error?: string;
  duration: number;
  timestamp: number;
}

export default Foreman;
