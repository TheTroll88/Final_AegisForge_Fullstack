/**
 * Foreman — Autonomy Engine
 *
 * The loop that makes Foreman a real agent, not a chatbot.
 * Poll → Score → Decide → Execute → Log → Repeat.
 *
 * Patterns borrowed from working crypto agent implementations:
 *   - Interval-based polling (5-30s configurable)
 *   - Confidence-scored signal system (0-1)
 *   - Priority queue for task execution
 *   - Concurrency limits (max 3 parallel)
 *   - State persistence (local JSON, on-chain when brain is deployed)
 *   - Cooldown tracking to avoid duplicate work
 *   - Heartbeat logging so we know he's alive
 *
 * Task generators:
 *   - Chain monitor: track block production, gas, pending txs
 *   - Balance watcher: alert on low funds, auto-request faucet
 *   - Airdrop scanner: check known faucet/airdrop endpoints
 *   - Base chain observer: watch for interesting on-chain events
 *   - Self-maintenance: health checks, cleanup, state persistence
 */

import { ethers } from "ethers";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from 'node:path'; '@ethereumjs/blockchain';

// ─── Types ───────────────────────────────────────────────

export interface Signal {
  id: string;
  source: string;           // which generator created this
  type: SignalType;
  confidence: number;       // 0-1
  priority: number;         // higher = more urgent
  description: string;
  params: Record<string, any>;
  createdAt: number;
  expiresAt: number;        // signal becomes stale after this
}

export type SignalType =
  | "faucet_claim"
  | "balance_low"
  | "chain_health"
  | "airdrop_detected"
  | "base_event"
  | "self_maintenance"
  | "opportunity"
  | "meme_coin_signal"
  | "alert";

export interface ExecutionResult {
  signalId: string;
  success: boolean;
  result: any;
  error?: string;
  duration: number;
  gasUsed?: string;
}

export interface AutonomyState {
  startedAt: number;
  cycleCount: number;
  signalsProcessed: number;
  signalsSkipped: number;
  executionsSuccess: number;
  executionsFailed: number;
  lastCycleAt: number;
  lastSignals: Signal[];
  cooldowns: Record<string, number>;  // signalType:key → expiry timestamp
}

export interface AutonomyConfig {
  pollIntervalMs: number;      // main loop frequency (default 10s)
  maxConcurrent: number;       // max parallel executions (default 3)
  minConfidence: number;       // minimum signal confidence to act (default 0.5)
  cooldownMs: number;          // default cooldown per signal type (default 60s)
  dryRun: boolean;             // log but don't execute (default false)
  stateDir: string;            // where to persist state
  quietHoursUTC?: [number, number]; // [startHour, endHour] skip execution
}

const DEFAULT_CONFIG: AutonomyConfig = {
  pollIntervalMs: 10_000,    // 10 seconds
  maxConcurrent: 3,
  minConfidence: 0.3,        // lowered — Foreman acts on more signals
  cooldownMs: 60_000,        // 1 minute default cooldown
  dryRun: false,
  stateDir: join(import.meta.url ? new URL("../../.vault/foreman", import.meta.url).pathname : __dirname, "..", "..", ".vault", "foreman"),
};

// ─── Signal Generators ───────────────────────────────────

type SignalGenerator = (ctx: GeneratorContext) => Promise<Signal[]>;

interface GeneratorContext {
  aegisProvider: ethers.JsonRpcProvider;
  baseProvider: ethers.JsonRpcProvider;
  wallet: { address: string; privateKey: string };
  state: AutonomyState;
  aegisRpc: string;
  browser?: {
    launch: () => Promise<void>;
    goto: (url: string) => Promise<string>;
    getText: () => Promise<string>;
    getTitle: () => Promise<string>;
    getUrl: () => string;
  };
  solanaWallet?: { address: string; secretKey: string };
  solanaRpc?: string;
}

/**
 * Monitor Aegis Chain health
 */
const chainHealthGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  try {
    const blockNum = await ctx.aegisProvider.getBlockNumber();
    const network = await ctx.aegisProvider.getNetwork();

    // Check if chain is producing blocks
    if (blockNum === 0) {
      signals.push({
        id: `chain_health_${now}`,
        source: "chain_monitor",
        type: "chain_health",
        confidence: 1,
        priority: 10,
        description: "Aegis Chain at block 0 — may not be producing",
        params: { blockNumber: blockNum, chainId: Number(network.chainId) },
        createdAt: now,
        expiresAt: now + 30_000,
      });
    }

    // Log chain stats (low priority, informational)
    signals.push({
      id: `chain_stats_${now}`,
      source: "chain_monitor",
      type: "chain_health",
      confidence: 0.35,
      priority: 1,
      description: `Aegis block ${blockNum}, chain ${network.chainId}`,
      params: { blockNumber: blockNum, chainId: Number(network.chainId) },
      createdAt: now,
      expiresAt: now + 30_000,
    });
  } catch (err: any) {
    signals.push({
      id: `chain_error_${now}`,
      source: "chain_monitor",
      type: "alert",
      confidence: 1.0,
      priority: 10,
      description: `Aegis Chain unreachable: ${err.message}`,
      params: { error: err.message },
      createdAt: now,
      expiresAt: now + 60_000,
    });
  }

  return signals;
};

/**
 * Watch balances — auto-request faucet if low
 */
const balanceWatcherGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  try {
    const balance = await ctx.aegisProvider.getBalance(ctx.wallet.address);
    const formatted = parseFloat(ethers.formatEther(balance));

    // If balance drops below 100 AEGIS, request faucet
    if (formatted < 100) {
      signals.push({
        id: `balance_low_aegis_${now}`,
        source: "balance_watcher",
        type: "balance_low",
        confidence: 1.0,
        priority: 8,
        description: `Low AEGIS balance: ${formatted.toFixed(2)} — requesting faucet`,
        params: { chain: "aegis", balance: formatted, address: ctx.wallet.address },
        createdAt: now,
        expiresAt: now + 120_000,
      });
    }
  } catch {}

  try {
    const baseBalance = await ctx.baseProvider.getBalance(ctx.wallet.address);
    const formatted = parseFloat(ethers.formatEther(baseBalance));

    // Just log Base balance (can't auto-fund on mainnet)
    if (formatted > 0) {
      signals.push({
        id: `balance_base_${now}`,
        source: "balance_watcher",
        type: "opportunity",
        confidence: 0.35,
        priority: 1,
        description: `Base balance: ${formatted.toFixed(6)} ETH`,
        params: { chain: "base", balance: formatted },
        createdAt: now,
        expiresAt: now + 300_000,
      });
    }
  } catch {}

  return signals;
};

/**
 * Monitor Base chain for interesting events
 */
const baseObserverGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  try {
    const blockNum = await ctx.baseProvider.getBlockNumber();
    const block = await ctx.baseProvider.getBlock(blockNum);

    if (block) {
      // Log Base activity
      signals.push({
        id: `base_block_${now}`,
        source: "base_observer",
        type: "base_event",
        confidence: 0.2,
        priority: 1,
        description: `Base block ${blockNum}: ${block.transactions.length} txs, gas used ${block.gasUsed}`,
        params: {
          blockNumber: blockNum,
          txCount: block.transactions.length,
          gasUsed: block.gasUsed.toString(),
          timestamp: block.timestamp,
        },
        createdAt: now,
        expiresAt: now + 30_000,
      });

      // Alert on gas spikes (block > 80% gas used)
      const gasRatio = Number(block.gasUsed) / Number(block.gasLimit);
      if (gasRatio > 0.8) {
        signals.push({
          id: `base_gas_spike_${now}`,
          source: "base_observer",
          type: "alert",
          confidence: 0.7,
          priority: 5,
          description: `Base gas spike: ${(gasRatio * 100).toFixed(1)}% utilization`,
          params: { gasRatio, blockNumber: blockNum },
          createdAt: now,
          expiresAt: now + 60_000,
        });
      }
    }
  } catch {}

  return signals;
};

/**
 * Self-maintenance — heartbeat, state cleanup, persistence
 */
const selfMaintenanceGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();
  const uptime = Math.floor((now - ctx.state.startedAt) / 1000);

  // Every 5 minutes, emit a heartbeat
  if (ctx.state.cycleCount % 30 === 0) { // 30 cycles * 10s = ~5min
    signals.push({
      id: `heartbeat_${now}`,
      source: "self_maintenance",
      type: "self_maintenance",
      confidence: 1.0,
      priority: 2,
      description: `Heartbeat: ${uptime}s uptime, ${ctx.state.signalsProcessed} signals, ${ctx.state.executionsSuccess} executions`,
      params: {
        uptime,
        cycles: ctx.state.cycleCount,
        signalsProcessed: ctx.state.signalsProcessed,
        executionsSuccess: ctx.state.executionsSuccess,
        executionsFailed: ctx.state.executionsFailed,
      },
      createdAt: now,
      expiresAt: now + 300_000,
    });
  }

  return signals;
};

/**
 * Airdrop/faucet scanner — finds free crypto opportunities
 */
const airdropScannerGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  // Known faucets / bounty opportunities to monitor
  const opportunities = [
    { name: "Solana Devnet Faucet", url: "https://faucet.solana.com", chain: "solana-devnet" },
    { name: "Alchemy Base Faucet", url: "https://www.alchemy.com/faucets/base-sepolia", chain: "base-sepolia" },
    { name: "Superteam Bounties", url: "https://superteam.fun/earn/", chain: "solana" },
    { name: "Superteam AI Agents", url: "https://superteam.fun/earn/agents", chain: "solana" },
    { name: "Superteam Grants", url: "https://superteam.fun/earn/grants", chain: "solana" },
    { name: "Base Grants", url: "https://paragraph.xyz/@grants.base.eth", chain: "base" },
    { name: "Nosana Compute Jobs", url: "https://app.nosana.io/jobs", chain: "solana" },
  ];

  // Emit one opportunity signal per cycle to scan
  const pick = opportunities[ctx.state.cycleCount % opportunities.length];
  signals.push({
    id: `airdrop_scan_${pick.chain}_${now}`,
    source: "airdrop_scanner",
    type: "airdrop_detected",
    confidence: 0.6,
    priority: 4,
    description: `Scan opportunity: ${pick.name} (${pick.chain})`,
    params: { name: pick.name, url: pick.url, chain: pick.chain },
    createdAt: now,
    expiresAt: now + 300_000,
  });

  return signals;
};

/**
 * Solana balance watcher — checks SOL balance every ~10 minutes
 */
const solanaBalanceGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  if (!ctx.solanaWallet || !ctx.solanaRpc) return signals;
  if (ctx.state.cycleCount % 60 !== 0) return signals; // every 60 cycles (~10 min)

  try {
    const res = await fetch(ctx.solanaRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [ctx.solanaWallet.address] }),
    });
    const data = await res.json() as any;
    const lamports = data.result?.value ?? 0;
    const sol = lamports / 1e9;

    signals.push({
      id: `solana_balance_${now}`,
      source: "solana_watcher",
      type: "opportunity",
      confidence: 0.4,
      priority: 2,
      description: `Solana wallet: ${sol.toFixed(6)} SOL`,
      params: { chain: "solana", balance: sol, lamports, address: ctx.solanaWallet.address },
      createdAt: now,
      expiresAt: now + 600_000,
    });
  } catch {}

  return signals;
};

/**
 * Pump.fun meme coin scanner — hunts for bot-pattern trades
 *
 * Nathan's edge: bots buy in synchronized clusters with round amounts.
 * Pattern signature:
 *   - Multiple buys within a 2-second window
 *   - Buy amounts near round numbers (e.g. exactly 0.1, 0.5, 1 SOL)
 *   - Liquidity above a minimum threshold (not a ghost)
 *   - Token age < 30 minutes (still in early window)
 *   - MC between $5K–$200K (pre-breakout zone)
 */
const memeCoinScannerGenerator: SignalGenerator = async (ctx) => {
  const signals: Signal[] = [];
  const now = Date.now();

  // Only run every 3 cycles (~30s) — pump.fun API is public but don't hammer it
  if (ctx.state.cycleCount % 3 !== 0) return signals;

  try {
    // Pump.fun public API — latest coins
    const res = await fetch("https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!res.ok) return signals;
    const coins = await res.json() as any[];

    for (const coin of coins) {
      // Filter: must have a market cap and recent activity
      const mc = coin.usd_market_cap ?? 0;
      const created = coin.created_timestamp ?? 0;
      const ageMinutes = (now - created) / 60_000;

      // Only tokens in early window: 2 min – 45 min old, $5K–$500K MC
      if (ageMinutes < 2 || ageMinutes > 45) continue;
      if (mc < 5_000 || mc > 500_000) continue;

      // Fetch recent trade activity for this coin
      let tradeData: any[] = [];
      try {
        const tradeRes = await fetch(`https://frontend-api.pump.fun/trades/all?mint=${coin.mint}&limit=20&offset=0`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (tradeRes.ok) tradeData = await tradeRes.json() as any[];
      } catch { continue; }

      if (tradeData.length < 5) continue;

      // ── Pattern detection ──────────────────────────────
      const recentBuys = tradeData.filter((t: any) => t.is_buy);
      if (recentBuys.length < 4) continue;

      let patternScore = 0;
      const reasons: string[] = [];

      // 1. Synchronization: multiple buys within 2 seconds
      const timestamps = recentBuys.map((t: any) => t.timestamp).sort((a: number, b: number) => b - a);
      const windowBuys = timestamps.filter((t: number) => timestamps[0] - t < 2);
      if (windowBuys.length >= 3) {
        patternScore += 0.35;
        reasons.push(`${windowBuys.length} buys in <2s (sync cluster)`);
      }

      // 2. Round-number SOL amounts (0.05, 0.1, 0.25, 0.5, 1.0 SOL)
      const roundAmounts = recentBuys.filter((t: any) => {
        const sol = (t.sol_amount ?? 0) / 1e9;
        // Check if it's within 2% of a round number
        const rounds = [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0];
        return rounds.some((r) => Math.abs(sol - r) / r < 0.02);
      });
      if (roundAmounts.length >= 2) {
        patternScore += 0.25;
        reasons.push(`${roundAmounts.length} round-amount buys`);
      }

      // 3. Multiple unique wallets buying — not one whale
      const uniqueWallets = new Set(recentBuys.map((t: any) => t.user));
      if (uniqueWallets.size >= 5 && uniqueWallets.size <= 15) {
        patternScore += 0.2;
        reasons.push(`${uniqueWallets.size} unique wallets (fleet-sized)`);
      }

      // 4. Liquidity stable — not a rug setup
      const liquidity = coin.virtual_sol_reserves ?? 0;
      if (liquidity > 20 * 1e9) { // at least 20 SOL in the pool
        patternScore += 0.15;
        reasons.push(`${(liquidity / 1e9).toFixed(1)} SOL liquidity`);
      }

      // 5. No sells dominating (early accumulation)
      const sells = tradeData.filter((t: any) => !t.is_buy).length;
      const buyRatio = recentBuys.length / (recentBuys.length + sells);
      if (buyRatio > 0.7) {
        patternScore += 0.05;
        reasons.push(`${(buyRatio * 100).toFixed(0)}% buy pressure`);
      }

      // Only emit if we have a real signal
      if (patternScore >= 0.3) {
        signals.push({
          id: `meme_${coin.mint}_${now}`,
          source: "meme_scanner",
          type: "meme_coin_signal",
          confidence: Math.min(patternScore, 0.95),
          priority: patternScore >= 0.6 ? 9 : 6,
          description: `BOT PATTERN: ${coin.symbol ?? coin.mint.slice(0, 8)} | MC $${mc.toLocaleString()} | Age ${ageMinutes.toFixed(1)}m`,
          params: {
            mint: coin.mint,
            symbol: coin.symbol ?? "???",
            name: coin.name ?? "",
            mc,
            ageMinutes,
            patternScore,
            reasons,
            pumpUrl: `https://pump.fun/${coin.mint}`,
            liquidity: liquidity / 1e9,
            buyRatio,
          },
          createdAt: now,
          expiresAt: now + 120_000, // signal expires in 2 min — meme coins move fast
        });
      }
    }
  } catch (e: any) {
    // Pump.fun API down — silent fail, not critical
  }

  return signals;
};

// ─── Autonomy Engine ─────────────────────────────────────

export class AutonomyEngine {
  private config: AutonomyConfig;
  private state: AutonomyState;
  private generators: SignalGenerator[] = [];
  private executors: Map<SignalType, (signal: Signal, ctx: GeneratorContext) => Promise<any>> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private context!: GeneratorContext;

  // Execution tracking
  private activeExecutions = 0;

  constructor(config: Partial<AutonomyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Load or initialize state
    this.state = this.loadState() || {
      startedAt: Date.now(),
      cycleCount: 0,
      signalsProcessed: 0,
      signalsSkipped: 0,
      executionsSuccess: 0,
      executionsFailed: 0,
      lastCycleAt: 0,
      lastSignals: [],
      cooldowns: {},
    };

    // Register default generators
    this.generators = [
      chainHealthGenerator,
      balanceWatcherGenerator,
      baseObserverGenerator,
      selfMaintenanceGenerator,
      airdropScannerGenerator,
      solanaBalanceGenerator,
      memeCoinScannerGenerator,
    ];

    // Register default executors
    this.executors.set("balance_low", this.executeBalanceLow.bind(this));
    this.executors.set("chain_health", this.executeChainHealth.bind(this));
    this.executors.set("self_maintenance", this.executeSelfMaintenance.bind(this));
    this.executors.set("alert", this.executeAlert.bind(this));
    this.executors.set("airdrop_detected", this.executeAirdropClaim.bind(this));
    this.executors.set("opportunity", this.executeOpportunity.bind(this));
    this.executors.set("meme_coin_signal", this.executeMemeCoinSignal.bind(this));
  }

  /**
   * Wire up the context — called by Foreman after boot
   */
  setContext(ctx: GeneratorContext): void {
    this.context = ctx;
  }

  /**
   * ADD a custom signal generator
   */
  addGenerator(gen: SignalGenerator): void {
    this.generators.push(gen);
  }

  /**
   * ADD a custom executor for a signal type
   */
  addExecutor(type: SignalType, executor: (signal: Signal, ctx: GeneratorContext) => Promise<any>): void {
    this.executors.set(type, executor);
  }

  /**
   * START the autonomy loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.state.startedAt = Date.now();

    console.log(`  [Autonomy] Engine started — polling every ${this.config.pollIntervalMs / 1000}s`);
    console.log(`  [Autonomy] Generators: ${this.generators.length}, Min confidence: ${this.config.minConfidence}`);
    if (this.config.dryRun) {
      console.log("  [Autonomy] ⚠ DRY RUN MODE — signals scored but NOT executed");
    }

    // Run first cycle immediately
    this.cycle().catch((err) => console.error(`  [Autonomy] Cycle error: ${err.message}`));

    // Then poll on interval
    this.timer = setInterval(async () => {
      if (!this.running) return;
      try {
        await this.cycle();
      } catch (err: any) {
        console.error(`  [Autonomy] Cycle error: ${err.message}`);
      }
    }, this.config.pollIntervalMs);
  }

  /**
   * STOP the autonomy loop
   */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.saveState();
    console.log("  [Autonomy] Engine stopped. State saved.");
  }

  /**
   * One cycle of the autonomy loop:
   * 1. Gather signals from all generators
   * 2. Filter by confidence and cooldown
   * 3. Sort by priority
   * 4. Execute top signals (up to concurrency limit)
   * 5. Log results
   */
  private async cycle(): Promise<void> {
    const cycleStart = Date.now();
    this.state.cycleCount++;

    // 1. GATHER — run all generators in parallel
    const signalArrays = await Promise.allSettled(
      this.generators.map((gen) => gen(this.context))
    );

    const allSignals: Signal[] = [];
    for (const result of signalArrays) {
      if (result.status === "fulfilled") {
        allSignals.push(...result.value);
      }
    }

    // 2. FILTER — confidence threshold, cooldowns, expiry
    const now = Date.now();
    const actionableSignals = allSignals.filter((sig) => {
      // Must meet confidence threshold
      if (sig.confidence < this.config.minConfidence) {
        this.state.signalsSkipped++;
        return false;
      }

      // Must not be expired
      if (sig.expiresAt < now) return false;

      // Must not be in cooldown
      const cooldownKey = `${sig.type}:${sig.source}`;
      const cooldownExpiry = this.state.cooldowns[cooldownKey];
      if (cooldownExpiry && cooldownExpiry > now) {
        this.state.signalsSkipped++;
        return false;
      }

      return true;
    });

    // 3. SORT by priority (highest first)
    actionableSignals.sort((a, b) => b.priority - a.priority);

    // 4. EXECUTE — up to concurrency limit
    const toExecute = actionableSignals.slice(0, this.config.maxConcurrent - this.activeExecutions);

    for (const signal of toExecute) {
      this.state.signalsProcessed++;

      // Set cooldown
      const cooldownKey = `${signal.type}:${signal.source}`;
      this.state.cooldowns[cooldownKey] = now + this.config.cooldownMs;

      if (this.config.dryRun) {
        console.log(`  [Autonomy] [DRY] Would execute: ${signal.description} (confidence: ${signal.confidence})`);
        continue;
      }

      // Execute
      const executor = this.executors.get(signal.type);
      if (!executor) {
        // No executor for this signal type — just log it
        continue;
      }

      this.activeExecutions++;
      try {
        const result = await executor(signal, this.context);
        this.state.executionsSuccess++;

        // Only log actionable results
        if (signal.priority >= 5) {
          console.log(`  [Autonomy] ✓ ${signal.description}`);
        }
      } catch (err: any) {
        this.state.executionsFailed++;
        console.error(`  [Autonomy] ✗ ${signal.type}: ${err.message}`);
      } finally {
        this.activeExecutions--;
      }
    }

    // 5. Update state
    this.state.lastCycleAt = cycleStart;
    this.state.lastSignals = allSignals.slice(0, 10); // keep last 10 for status

    // Clean expired cooldowns
    for (const [key, expiry] of Object.entries(this.state.cooldowns)) {
      if (expiry < now) delete this.state.cooldowns[key];
    }

    // Persist state every 10 cycles (~100s)
    if (this.state.cycleCount % 10 === 0) {
      this.saveState();
    }
  }

  // ─── Default Executors ─────────────────────────────────

  private async executeBalanceLow(signal: Signal, ctx: GeneratorContext): Promise<any> {
    // Auto-request faucet on Aegis Chain
    if (signal.params.chain === "aegis") {
      const res = await fetch(`${ctx.aegisRpc}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: ctx.wallet.address }),
      });
      const data = await res.json() as any;
      return { funded: data.success, amount: data.formatted };
    }
    return { action: "logged", chain: signal.params.chain };
  }

  private async executeChainHealth(_signal: Signal, _ctx: GeneratorContext): Promise<any> {
    // Chain health alerts are logged, not acted on (yet)
    return { action: "monitored" };
  }

  private async executeSelfMaintenance(signal: Signal, _ctx: GeneratorContext): Promise<any> {
    // Heartbeat — persist state
    this.saveState();
    return { heartbeat: true, uptime: signal.params.uptime };
  }

  private async executeAlert(signal: Signal, _ctx: GeneratorContext): Promise<any> {
    // Alerts get logged to console prominently
    console.log(`  [Autonomy] ⚠ ALERT: ${signal.description}`);
    return { alerted: true };
  }

  private async executeAirdropClaim(signal: Signal, ctx: GeneratorContext): Promise<any> {
    console.log(`  [Foreman] 🎯 Scanning: ${signal.params.name} (${signal.params.chain})`);

    if (ctx.browser) {
      try {
        await ctx.browser.launch();
        await ctx.browser.goto(signal.params.url);
        const title = await ctx.browser.getTitle();
        const text = await ctx.browser.getText();

        const hasClaim = /claim|airdrop|reward|eligible|bounty|grant/i.test(text);
        const hasWallet = /connect.*wallet|wallet.*connect/i.test(text);
        const hasForm = /sign.*up|register|enter.*address/i.test(text);

        console.log(`  [Foreman] 📄 "${title.slice(0, 80)}"`);
        if (hasClaim) console.log(`  [Foreman] 🟢 Claim/bounty keywords found — worth checking`);
        if (hasWallet) console.log(`  [Foreman] 🔗 Wallet connect available`);
        if (hasForm) console.log(`  [Foreman] 📝 Registration form detected`);

        return { action: "browsed", title, url: signal.params.url, hasClaim, hasWallet, hasForm };
      } catch (e: any) {
        console.log(`  [Foreman] Browser scan failed: ${e.message}`);
      }
    }

    // Fallback: log for manual review
    console.log(`  [Foreman]    → ${signal.params.url}`);
    return { action: "logged", url: signal.params.url, chain: signal.params.chain };
  }

  private async executeOpportunity(signal: Signal, _ctx: GeneratorContext): Promise<any> {
    // Log all opportunities Foreman observes
    if (signal.params.balance !== undefined) {
      console.log(`  [Foreman] 💰 Balance observed: ${signal.params.balance.toFixed(6)} on ${signal.params.chain}`);
    } else {
      console.log(`  [Foreman] 💡 Opportunity: ${signal.description}`);
    }
    return { action: "observed" };
  }

  private async executeMemeCoinSignal(signal: Signal, _ctx: GeneratorContext): Promise<any> {
    const p = signal.params;
    const scoreBar = "█".repeat(Math.round(p.patternScore * 10)) + "░".repeat(10 - Math.round(p.patternScore * 10));

    console.log();
    console.log(`  ┌─── 🚨 BOT PATTERN DETECTED ──────────────────────────┐`);
    console.log(`  │  Token:   ${p.symbol} — ${p.name}`);
    console.log(`  │  MC:      $${p.mc.toLocaleString()}   Age: ${p.ageMinutes.toFixed(1)} min`);
    console.log(`  │  Score:   [${scoreBar}] ${(p.patternScore * 100).toFixed(0)}%`);
    console.log(`  │  Why:     ${p.reasons.join(" | ")}`);
    console.log(`  │  URL:     ${p.pumpUrl}`);
    console.log(`  └────────────────────────────────────────────────────────┘`);
    console.log();

    return { action: "alerted", mint: p.mint, score: p.patternScore };
  }

  // ─── State Persistence ─────────────────────────────────

  private loadState(): AutonomyState | null {
    const file = join(this.config.stateDir, "autonomy_state.json");
    try {
      if (existsSync(file)) {
        return JSON.parse(readFileSync(file, "utf-8"));
      }
    } catch {}
    return null;
  }

  private saveState(): void {
    try {
      mkdirSync(this.config.stateDir, { recursive: true });
      const file = join(this.config.stateDir, "autonomy_state.json");
      writeFileSync(file, JSON.stringify(this.state, null, 2));
    } catch {}
  }

  // ─── Status ────────────────────────────────────────────

  getStatus() {
    const uptime = this.state.startedAt ? Math.floor((Date.now() - this.state.startedAt) / 1000) : 0;
    return {
      running: this.running,
      uptime,
      cycles: this.state.cycleCount,
      signalsProcessed: this.state.signalsProcessed,
      signalsSkipped: this.state.signalsSkipped,
      executionsSuccess: this.state.executionsSuccess,
      executionsFailed: this.state.executionsFailed,
      activeExecutions: this.activeExecutions,
      generators: this.generators.length,
      executors: this.executors.size,
      lastCycle: this.state.lastCycleAt
        ? `${Math.floor((Date.now() - this.state.lastCycleAt) / 1000)}s ago`
        : "never",
    };
  }
}
