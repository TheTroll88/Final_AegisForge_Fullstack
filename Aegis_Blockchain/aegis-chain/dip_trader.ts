/**
 * Dip Trader
 *
 * Detects local price lows (dips) and highs (peaks) on Solana tokens.
 * Strategy: buy near the bottom of a dip, sell near the top of the next peak.
 *
 * Detection uses:
 *   - Rolling window RSI (oversold = potential dip, overbought = potential peak)
 *   - Local min/max from OHLCV candles (price below N-candle low = dip zone)
 *   - % drop from recent high threshold before entering
 *   - Volume spike confirmation (dip with high volume = stronger signal)
 *
 * Data source: Birdeye free API (no key required for basic OHLCV)
 * Execution:   Jupiter swap API (Solana) — market orders at signal confirmation
 *
 * Usage:
 *   npx tsx dip_trader.ts                          -- run signal loop
 *   npx tsx dip_trader.ts --token <MINT>           -- override token
 *   npx tsx dip_trader.ts --dry                    -- print signals, no swaps
 *   npx tsx dip_trader.ts --backtest <MINT>        -- backtest on 7d history
 */

import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  // Which token to watch (default SOL)
  tokenMint: process.argv.includes("--token")
    ? process.argv[process.argv.indexOf("--token") + 1]
    : "So11111111111111111111111111111111111111112", // Wrapped SOL

  // Our Solana wallet (the one with funds to trade)
  walletAddress: "7wVcBsMbCRL7WHegGbxgkXJaN9GkkRDhABj5BaPaa7NY",

  // Strategy parameters
  dipDropPct: 4,          // % drop from recent high to call it a "dip" (e.g., 4%)
  recoverPct: 0.5,        // % bounce from dip low before entering (confirms reversal)
  takeProfitPct: 6,       // % above entry to take profit
  stopLossPct: 2.5,       // % below entry to cut losses
  rsiOversold: 42,        // RSI below this = oversold / dip zone (relaxed from 32 — 37-42 is practically oversold for swing trading)
  rsiOverbought: 68,      // RSI above this = overbought / peak zone
  rsiPeriod: 14,          // RSI lookback period
  windowCandles: 20,      // rolling window for local min/max detection
  volumeSpikeMultiplier: 1.4, // volume must be this * avg to confirm dip

  // Candle resolution
  resolution: process.argv.includes("--backtest") ? "4h" : "15m",  // backtest=4h for 7d history, live=15m
  candleLimit: process.argv.includes("--backtest") ? 42 : 100,  // 42 × 4h ≈ 7 days

  // Loop interval (ms) — how often to re-check signal
  checkIntervalMs: 60_000, // every 1 minute

  // Dry run mode — print signals but never execute swaps
  dryRun: process.argv.includes("--dry") || process.argv.includes("--backtest"),

  backtest: process.argv.includes("--backtest"),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candle {
  timestamp: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Signal {
  type: "BUY" | "SELL" | "HOLD";
  price: number;
  reason: string;
  rsi: number;
  dipDropPct: number;    // how far it dropped from recent high
  volumeSpike: boolean;
}

interface Position {
  entryPrice: number;
  entryTime: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}

// ─── Price Feed ───────────────────────────────────────────────────────────────
// Primary:  Birdeye OHLCV (requires API key via BIRDEYE_API_KEY env var)
// Fallback: DexScreener candles (free, no key, limited resolution)
// Fallback2: CoinGecko OHLC (free, no key, 1h+ resolution only)

const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY ?? "";

async function fetchCandles(mint: string, resolution: string, limit: number): Promise<Candle[]> {
  // Try Birdeye first if API key is available
  if (BIRDEYE_KEY) {
    try {
      return await fetchBirdeyeCandles(mint, resolution, limit);
    } catch (e: any) {
      console.warn(`Birdeye failed (${e.message}) — falling back to DexScreener`);
    }
  }

  // Fall back to DexScreener
  return await fetchDexScreenerCandles(mint, resolution, limit);
}

async function fetchBirdeyeCandles(mint: string, resolution: string, limit: number): Promise<Candle[]> {
  const resMap: Record<string, number> = {
    "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400,
  };
  const resSeconds = resMap[resolution] ?? 900;
  const now = Math.floor(Date.now() / 1000);
  const from = now - resSeconds * limit;

  const url = `https://public-api.birdeye.so/defi/ohlcv?address=${mint}&type=${resolution}&time_from=${from}&time_to=${now}`;
  const resp = await fetch(url, {
    headers: { "Accept": "application/json", "X-Chain": "solana", "X-API-KEY": BIRDEYE_KEY },
    signal: AbortSignal.timeout(12_000),
  });

  if (!resp.ok) throw new Error(`Birdeye ${resp.status}: ${await resp.text().catch(() => "")}`);
  const data = await resp.json() as any;
  const items: any[] = data?.data?.items ?? [];
  if (items.length === 0) throw new Error("Birdeye returned 0 candles");

  return items.map((c: any) => ({
    timestamp: c.unixTime,
    open: Number(c.o), high: Number(c.h), low: Number(c.l), close: Number(c.c), volume: Number(c.v),
  })).sort((a, b) => a.timestamp - b.timestamp);
}

// Map known Solana mint addresses → CoinGecko coin IDs for free real candle data
const COINGECKO_ID_MAP: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "solana",          // Wrapped SOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "usd-coin",    // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "tether",       // USDT
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "msol",         // mSOL
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "lido-staked-sol", // stSOL
};

// CoinGecko OHLC — free, no key, real market data (30m candles for 1-day range)
async function fetchCoinGeckoCandles(mint: string, resolution: string, limit: number): Promise<Candle[]> {
  const coinId = COINGECKO_ID_MAP[mint];
  if (!coinId) throw new Error(`No CoinGecko ID mapped for mint ${mint}`);

  // days=1 → 30m candles (~48), days=7 → 4h candles (~42), days=14 → 4h candles
  const resMap: Record<string, string> = {
    "1m": "1", "5m": "1", "15m": "1",
    "1h": "7", "4h": "7", "1d": "max",
  };
  const days = resMap[resolution] ?? "1";

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
  const resp = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (resp.status === 429) throw new Error("CoinGecko rate limited");
  if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);

  const raw = await resp.json() as any;
  const items: any[] = Array.isArray(raw) ? raw : [];

  if (items.length === 0) throw new Error("CoinGecko returned 0 candles");

  // CoinGecko format: [timestamp_ms, open, high, low, close]
  const candles: Candle[] = items.map((c: any) => ({
    timestamp: Math.floor(c[0] / 1000),
    open:  Number(c[1]),
    high:  Number(c[2]),
    low:   Number(c[3]),
    close: Number(c[4]),
    volume: 0, // CoinGecko OHLC doesn't include volume — volume spike detection disabled
  })).sort((a, b) => a.timestamp - b.timestamp).slice(-limit);

  console.log(`  [CoinGecko] ${candles.length} real candles for ${coinId}`);
  return candles;
}

async function fetchDexScreenerCandles(mint: string, resolution: string, limit: number): Promise<Candle[]> {
  // Step 1: try CoinGecko (free, real data, known tokens only)
  try {
    return await fetchCoinGeckoCandles(mint, resolution, limit);
  } catch (e: any) {
    console.warn(`  [CoinGecko] ${e.message} — falling back to DexScreener pair data`);
  }

  // Step 2: DexScreener pair info + synthesize
  const pairsResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    signal: AbortSignal.timeout(12_000),
  });

  if (!pairsResp.ok) throw new Error(`DexScreener pairs ${pairsResp.status}`);
  const pairsData = await pairsResp.json() as any;
  const pairs: any[] = pairsData?.pairs ?? [];

  const solanaPairs = pairs.filter((p: any) => p.chainId === "solana");
  if (solanaPairs.length === 0) throw new Error("No Solana pairs found on DexScreener");

  const topPair = solanaPairs.sort((a: any, b: any) =>
    (Number(b.liquidity?.usd) ?? 0) - (Number(a.liquidity?.usd) ?? 0)
  )[0];

  return await synthesizeCandlesFromDexScreener(topPair, resolution, limit);
}

async function synthesizeCandlesFromDexScreener(pair: any, resolution: string, limit: number): Promise<Candle[]> {
  // Use the pair's priceChange data + current price to synthesize a rough price series
  // Not ideal but enough for signal testing when real candles are unavailable
  const price = Number(pair.priceUsd ?? 0);
  if (price === 0) throw new Error("Cannot synthesize candles: priceUsd is 0");

  const resMap: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
  const resSeconds = resMap[resolution] ?? 900;
  const now = Math.floor(Date.now() / 1000);

  // Use priceChange.h24 to estimate volatility
  const pctChange24h = Number(pair.priceChange?.h24 ?? 0);
  const volatilityPerCandle = Math.abs(pctChange24h / 100) / (86400 / resSeconds) * 2;

  const candles: Candle[] = [];
  let runningPrice = price * (1 + pctChange24h / 100); // start from 24h ago price

  for (let i = 0; i < limit; i++) {
    const delta = (Math.random() - 0.49) * volatilityPerCandle; // slight upward drift
    const open  = runningPrice;
    const close = runningPrice * (1 + delta);
    const hv    = Math.abs(delta) * 0.5;
    candles.push({
      timestamp: now - resSeconds * (limit - i),
      open,
      high:  Math.max(open, close) * (1 + hv),
      low:   Math.min(open, close) * (1 - hv),
      close,
      volume: Number(pair.volume?.h24 ?? 100000) / (86400 / resSeconds) * (0.5 + Math.random()),
    });
    runningPrice = close;
  }

  console.warn("  [WARN] Using synthesized candle data — install BIRDEYE_API_KEY for real data");
  return candles;
}

// Single latest price fallback (Jupiter)
async function fetchLatestPrice(mint: string): Promise<number> {
  const r = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`, {
    signal: AbortSignal.timeout(8_000),
  });
  const d = await r.json() as any;
  return Number(d?.data?.[mint]?.price ?? 0);
}

// ─── Indicators ───────────────────────────────────────────────────────────────

function calcRSI(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 50; // neutral if not enough data

  const closes = candles.map(c => c.close);
  let gains = 0, losses = 0;

  // Initial average
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses += Math.abs(delta);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function rollingMax(candles: Candle[], window: number): number {
  const slice = candles.slice(-window);
  return Math.max(...slice.map(c => c.high));
}

function rollingMin(candles: Candle[], window: number): number {
  const slice = candles.slice(-window);
  return Math.min(...slice.map(c => c.low));
}

function avgVolume(candles: Candle[], window: number): number {
  const slice = candles.slice(-window);
  return slice.reduce((s, c) => s + c.volume, 0) / slice.length;
}

// ─── Signal Engine ────────────────────────────────────────────────────────────

function analyzeCandles(candles: Candle[]): Signal {
  const latest = candles[candles.length - 1];
  const price  = latest.close;
  const rsi    = calcRSI(candles, CONFIG.rsiPeriod);

  const recentHigh = rollingMax(candles.slice(0, -1), CONFIG.windowCandles);
  const recentLow  = rollingMin(candles.slice(0, -1), CONFIG.windowCandles);
  const avgVol     = avgVolume(candles.slice(0, -1), CONFIG.windowCandles);
  const volumeSpike = latest.volume > avgVol * CONFIG.volumeSpikeMultiplier;

  const dropFromHigh = recentHigh > 0 ? ((recentHigh - price) / recentHigh) * 100 : 0;
  const bounceFromLow = recentLow > 0 ? ((price - recentLow) / recentLow) * 100 : 0;

  // ── BUY conditions ──
  //  1. Price dropped CONFIG.dipDropPct% from recent high (in the dip)
  //  2. Price has bounced CONFIG.recoverPct% from the recent local low (confirmed reversal)
  //  3. RSI in oversold zone
  //  Optional: volume spike confirms heavy selling = capitulation bottom
  const inDipZone   = dropFromHigh >= CONFIG.dipDropPct;
  const reversalConf = bounceFromLow >= CONFIG.recoverPct;
  const rsiOversold  = rsi <= CONFIG.rsiOversold;

  if (inDipZone && reversalConf && rsiOversold) {
    return {
      type: "BUY",
      price,
      reason: `Dip confirmed: -${dropFromHigh.toFixed(1)}% from high, +${bounceFromLow.toFixed(1)}% bounce, RSI ${rsi.toFixed(0)}${volumeSpike ? ", vol spike ✓" : ""}`,
      rsi,
      dipDropPct: dropFromHigh,
      volumeSpike,
    };
  }

  // ── SELL conditions ──
  //  1. RSI in overbought zone
  //  2. Price is near/above the rolling window high (potential top)
  const nearWindowHigh = price >= recentHigh * 0.97;
  const rsiOverbought  = rsi >= CONFIG.rsiOverbought;

  if (rsiOverbought && nearWindowHigh) {
    return {
      type: "SELL",
      price,
      reason: `Peak detected: RSI ${rsi.toFixed(0)}, price within 3% of ${CONFIG.windowCandles}-candle high $${recentHigh.toFixed(4)}`,
      rsi,
      dipDropPct: dropFromHigh,
      volumeSpike,
    };
  }

  return {
    type: "HOLD",
    price,
    reason: `Watching — drop ${dropFromHigh.toFixed(1)}%, RSI ${rsi.toFixed(0)}, bounce ${bounceFromLow.toFixed(1)}%`,
    rsi,
    dipDropPct: dropFromHigh,
    volumeSpike,
  };
}

// ─── Position Manager ─────────────────────────────────────────────────────────

let position: Position | null = null;

function shouldExitPosition(price: number): "TAKE_PROFIT" | "STOP_LOSS" | null {
  if (!position) return null;
  if (price >= position.takeProfitPrice) return "TAKE_PROFIT";
  if (price <= position.stopLossPrice)   return "STOP_LOSS";
  return null;
}

function enterPosition(price: number) {
  position = {
    entryPrice:      price,
    entryTime:       Date.now(),
    takeProfitPrice: price * (1 + CONFIG.takeProfitPct / 100),
    stopLossPrice:   price * (1 - CONFIG.stopLossPct / 100),
  };
  console.log(`\n✅  ENTER LONG @ $${price.toFixed(4)}`);
  console.log(`    Take profit: $${position.takeProfitPrice.toFixed(4)} (+${CONFIG.takeProfitPct}%)`);
  console.log(`    Stop loss:   $${position.stopLossPrice.toFixed(4)} (-${CONFIG.stopLossPct}%)`);
}

function exitPosition(price: number, reason: "TAKE_PROFIT" | "STOP_LOSS" | "SIGNAL_SELL") {
  if (!position) return;
  const pnlPct = ((price - position.entryPrice) / position.entryPrice) * 100;
  const held = ((Date.now() - position.entryTime) / 60_000).toFixed(0);
  console.log(`\n🔴  EXIT @ $${price.toFixed(4)} — ${reason}`);
  console.log(`    Entry: $${position.entryPrice.toFixed(4)} | P&L: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% | Held: ${held}m`);
  position = null;
}

// ─── Jupiter Swap (stub — fill with your preferred approach) ──────────────────

async function executeSwap(side: "buy" | "sell", reason: string): Promise<boolean> {
  if (CONFIG.dryRun) {
    console.log(`    [DRY RUN] Would execute ${side.toUpperCase()} — ${reason}`);
    return true;
  }

  // Real swap via Jupiter: quote → swap → sign → send
  // Requires private key in env (DO NOT hardcode)
  const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.warn("⚠️  SOLANA_PRIVATE_KEY not set — skipping real swap");
    return false;
  }

  console.log(`🔄  Executing ${side} via Jupiter...`);
  // Stub: actual Jupiter integration goes here
  // When ready, call: await jupiterSwap(side, CONFIG.tokenMint, amount, PRIVATE_KEY)
  console.log("    [STUB] Jupiter swap not yet wired — set SOLANA_PRIVATE_KEY and implement jupiterSwap()");
  return false;
}

// ─── Backtest ─────────────────────────────────────────────────────────────────

async function runBacktest(mint: string) {
  console.log(`\n📊 BACKTEST — ${mint} (${CONFIG.resolution} candles, last ${CONFIG.candleLimit})`);
  console.log("─".repeat(60));

  let candles: Candle[];
  try {
    candles = await fetchCandles(mint, CONFIG.resolution, CONFIG.candleLimit);
  } catch (e: any) {
    console.error("Failed to fetch candles:", e.message);
    return;
  }

  console.log(`Got ${candles.length} candles | ${new Date(candles[0].timestamp * 1000).toISOString()} → ${new Date(candles[candles.length - 1].timestamp * 1000).toISOString()}`);

  const LOOKBACK = Math.max(CONFIG.rsiPeriod + 5, CONFIG.windowCandles + 2);
  let trades: { entry: number; exit: number; pnlPct: number; bars: number }[] = [];
  let fakePos: Position | null = null;

  for (let i = LOOKBACK; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const signal = analyzeCandles(slice);
    const price  = signal.price;

    // Check stop/TP first
    if (fakePos) {
      let exitReason: string | null = null;
      if (price >= fakePos.takeProfitPrice) exitReason = "TAKE_PROFIT";
      else if (price <= fakePos.stopLossPrice) exitReason = "STOP_LOSS";
      else if (signal.type === "SELL") exitReason = "SIGNAL_SELL";

      if (exitReason) {
        const pnlPct = ((price - fakePos.entryPrice) / fakePos.entryPrice) * 100;
        const bars = i - trades.length; // rough bar count
        trades.push({ entry: fakePos.entryPrice, exit: price, pnlPct, bars: i });
        const icon = pnlPct >= 0 ? "✅" : "❌";
        console.log(`  ${icon} SELL @ $${price.toFixed(4)} | ${exitReason} | P&L: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`);
        fakePos = null;
      }
    }

    if (!fakePos && signal.type === "BUY") {
      fakePos = {
        entryPrice:      price,
        entryTime:       candles[i].timestamp * 1000,
        takeProfitPrice: price * (1 + CONFIG.takeProfitPct / 100),
        stopLossPrice:   price * (1 - CONFIG.stopLossPct / 100),
      };
      console.log(`  📈 BUY  @ $${price.toFixed(4)} | ${signal.reason}`);
    }
  }

  // If still holding when data ends — mark as "would still be open" with unrealized P&L
  if (fakePos) {
    const lastPrice = candles[candles.length - 1].close;
    const unrealizedPct = ((lastPrice - fakePos.entryPrice) / fakePos.entryPrice) * 100;
    const icon = unrealizedPct >= 0 ? "📭" : "📉";
    console.log(`  ${icon} OPEN @ $${lastPrice.toFixed(4)} (entry $${fakePos.entryPrice.toFixed(4)}) | unrealized P&L: ${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}% [data ended]`);
    trades.push({ entry: fakePos.entryPrice, exit: lastPrice, pnlPct: unrealizedPct, bars: candles.length });
  }

  // Summary
  const wins   = trades.filter(t => t.pnlPct > 0).length;
  const losses = trades.filter(t => t.pnlPct <= 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnlPct, 0);
  const avgPnl   = trades.length ? totalPnl / trades.length : 0;
  console.log("\n─".repeat(60));
  console.log(`Trades: ${trades.length} | Wins: ${wins} | Losses: ${losses} | Win rate: ${trades.length ? ((wins / trades.length) * 100).toFixed(0) : 0}%`);
  console.log(`Total P&L: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}% | Avg per trade: ${avgPnl >= 0 ? "+" : ""}${avgPnl.toFixed(2)}%`);
}

// ─── Live Signal Loop ─────────────────────────────────────────────────────────

async function runLive() {
  const mint = CONFIG.tokenMint;
  console.log(`\n🎯 Dip Trader — ${mint}`);
  console.log(`   Strategy: buy dips ≥${CONFIG.dipDropPct}% drop, sell at +${CONFIG.takeProfitPct}% or RSI${CONFIG.rsiOverbought}+`);
  console.log(`   Stop loss: -${CONFIG.stopLossPct}% | RSI period: ${CONFIG.rsiPeriod} | Candle: ${CONFIG.resolution}`);
  if (CONFIG.dryRun) console.log("   [DRY RUN — no real swaps]");
  console.log("─".repeat(60));

  while (true) {
    const now = new Date().toISOString().slice(0, 19);
    let candles: Candle[];

    try {
      candles = await fetchCandles(mint, CONFIG.resolution, CONFIG.candleLimit);
    } catch (e: any) {
      console.log(`[${now}] Price feed error: ${e.message} — retrying in 30s`);
      await sleep(30_000);
      continue;
    }

    const signal = analyzeCandles(candles);
    const price  = signal.price;

    // Check existing position for TP/SL
    if (position) {
      const exitType = shouldExitPosition(price);
      if (exitType) {
        exitPosition(price, exitType);
        await executeSwap("sell", exitType);
      } else {
        const unrealized = ((price - position.entryPrice) / position.entryPrice) * 100;
        console.log(`[${now}] HOLD — $${price.toFixed(4)} | P&L: ${unrealized >= 0 ? "+" : ""}${unrealized.toFixed(2)}% | RSI ${signal.rsi.toFixed(0)}`);
      }
    } else {
      // Look for entry
      const icon = signal.type === "BUY" ? "🟢" : signal.type === "SELL" ? "🔴" : "⬜";
      console.log(`[${now}] ${icon} ${signal.type} — $${price.toFixed(4)} | ${signal.reason}`);

      if (signal.type === "BUY") {
        const ok = await executeSwap("buy", signal.reason);
        if (ok) enterPosition(price);
      }
    }

    // If a sell signal fires without an open position, just log it
    if (!position && signal.type === "SELL") {
      // No position to sell — skip
    }

    await sleep(CONFIG.checkIntervalMs);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  if (CONFIG.backtest) {
    await runBacktest(CONFIG.tokenMint);
  } else {
    await runLive();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
