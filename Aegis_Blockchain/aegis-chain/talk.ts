/**
 * Foreman Terminal — Interactive Chat Interface
 *
 * Talk to Foreman directly from the terminal.
 * Type commands or natural language — he responds.
 *
 * Usage: npx tsx talk.ts
 *
 * Requires: Aegis Chain running (npx tsx node.ts)
 *           or Foreman will boot in degraded mode.
 */

import * as readline from "readline";
import { Foreman } from "./src/foreman/index.js";

const AEGIS_RPC = "http://localhost:8545";
const BASE_RPC  = "https://mainnet.base.org";

// ─── Command Router ──────────────────────────────────────

interface Command {
  match: RegExp;
  description: string;
  handler: (foreman: Foreman, args: RegExpMatchArray) => Promise<string>;
}

const COMMANDS: Command[] = [
  {
    match: /^status$/i,
    description: "Show Foreman's current status",
    handler: async (f) => {
      const s = f.getStatus();
      const lines = [
        `  Running:          ${s.running ? "YES" : "NO"}`,
        `  Wallet:           ${s.wallet ?? "not loaded"}`,
        `  Brain deployed:   ${s.brainDeployed ? s.brainAddress : "no"}`,
        `  Uptime:           ${formatDuration(s.uptime)}`,
        `  Tasks completed:  ${s.tasksCompleted}`,
        `  Tasks pending:    ${s.tasksPending}`,
      ];
      return lines.join("\n");
    },
  },
  {
    match: /^balance(?:\s+(aegis|base))?(?:\s+(0x[a-fA-F0-9]+))?$/i,
    description: "Check balance — 'balance aegis', 'balance base 0x...'",
    handler: async (f, m) => {
      const chain = (m[1]?.toLowerCase() ?? "aegis") as "aegis" | "base";
      const address = m[2] ?? f.getStatus().wallet;
      if (!address) return "  No wallet loaded yet.";
      const r = await f.execute({
        type: "check_balance",
        description: `Check ${chain} balance`,
        params: { chain, address },
      });
      return r.success
        ? `  ${address.slice(0, 10)}...  →  ${r.result.formatted}`
        : `  Error: ${r.error}`;
    },
  },
  {
    match: /^bridge$/i,
    description: "Check bridge status (Aegis + Base connections)",
    handler: async (f) => {
      const r = await f.execute({
        type: "bridge_check",
        description: "Bridge connectivity check",
        params: {},
      });
      if (!r.success) return `  Bridge check failed: ${r.error}`;
      const { aegis, base } = r.result;
      return [
        `  Aegis Chain:  ${aegis.connected ? `connected (block ${aegis.block}, chain ${aegis.chainId})` : "DISCONNECTED"}`,
        `  Base Mainnet: ${base.connected ? `connected (block ${base.block.toLocaleString()}, chain ${base.chainId})` : "DISCONNECTED"}`,
      ].join("\n");
    },
  },
  {
    match: /^browse\s+(.+)$/i,
    description: "Browse a URL — 'browse https://example.com'",
    handler: async (f, m) => {
      const url = m[1].trim();
      const r = await f.execute({
        type: "browse",
        description: `Browse ${url}`,
        params: { url },
      });
      if (!r.success) return `  Browse failed: ${r.error}`;
      return [
        `  Title: ${r.result.title}`,
        `  URL:   ${r.result.url}`,
        `  Preview:`,
        `  ${r.result.text?.slice(0, 500) ?? "(empty)"}`,
      ].join("\n");
    },
  },
  {
    match: /^remember\s+(\S+)\s+(.+)$/i,
    description: "Store a memory — 'remember key some value'",
    handler: async (f, m) => {
      const key = m[1], value = m[2];
      const r = await f.execute({
        type: "store_memory",
        description: `Store memory: ${key}`,
        params: { key, value },
      });
      return r.success ? `  Stored "${key}" → "${value}"` : `  Failed: ${r.error}`;
    },
  },
  {
    match: /^recall\s+(\S+)$/i,
    description: "Recall a memory — 'recall key'",
    handler: async (f, m) => {
      const key = m[1];
      const r = await f.execute({
        type: "recall_memory",
        description: `Recall memory: ${key}`,
        params: { key },
      });
      return r.success
        ? `  ${key} → ${r.result.value ?? "(empty)"}`
        : `  Failed: ${r.error}`;
    },
  },
  {
    match: /^scan\s+(.+)$/i,
    description: "Scan a URL for airdrop eligibility — 'scan https://...'",
    handler: async (f, m) => {
      const url = m[1].trim();
      const r = await f.execute({
        type: "scan_airdrop",
        description: `Scan airdrop: ${url}`,
        params: { url },
      });
      if (!r.success) return `  Scan failed: ${r.error}`;
      return [
        `  Eligible: ${r.result.eligible ? "POSSIBLE" : "No signals"}`,
        `  Details:  ${r.result.details}`,
      ].join("\n");
    },
  },
  {
    match: /^autonomy\s+(start|stop|status)$/i,
    description: "Autonomy engine control — 'autonomy start/stop/status'",
    handler: async (f, m) => {
      const cmd = m[1].toLowerCase();
      if (cmd === "start") {
        f.startAutonomy();
        return "  Autonomy engine started. Foreman is thinking on his own.";
      } else if (cmd === "stop") {
        f.stopAutonomy();
        return "  Autonomy engine stopped. Foreman is waiting for orders.";
      } else {
        const s = f.getAutonomyStatus();
        return JSON.stringify(s, null, 2);
      }
    },
  },
  {
    match: /^help$/i,
    description: "Show available commands",
    handler: async () => {
      const lines = [
        "",
        "  ┌─────────────────────────────────────────────────────┐",
        "  │  FOREMAN TERMINAL — Available Commands               │",
        "  └─────────────────────────────────────────────────────┘",
        "",
        ...COMMANDS.map(c => `  ${c.match.source.padEnd(40)} ${c.description}`),
        "",
        "  Or just type naturally — Foreman will try to figure it out.",
        "",
      ];
      return lines.join("\n");
    },
  },
  {
    match: /^(quit|exit|bye)$/i,
    description: "Shut down Foreman and exit",
    handler: async () => "__EXIT__",
  },
];

// ─── Natural Language Fallback ───────────────────────────

async function handleNatural(foreman: Foreman, input: string): Promise<string> {
  const lower = input.toLowerCase();

  // Quick intent matching
  if (lower.includes("how are you") || lower.includes("you good") || lower.includes("what's up")) {
    const s = foreman.getStatus();
    return `  I'm online. ${s.uptime}s uptime, ${s.tasksCompleted} tasks done. What do you need?`;
  }

  if (lower.includes("who are you") || lower.includes("what are you")) {
    return "  I'm Foreman. Bridge agent. Key bearer. I watch both chains and act on your behalf.";
  }

  if (lower.includes("what can you do") || lower.includes("your capabilities")) {
    return [
      "  I can:",
      "    • Check balances on Aegis Chain and Base mainnet",
      "    • Browse websites (headless Chromium, human-like)",
      "    • Store and recall memories on-chain (when brain is deployed)",
      "    • Scan URLs for airdrop eligibility",
      "    • Run autonomous recon loops",
      "    • Monitor bridge connectivity",
      "  Type 'help' for exact commands.",
    ].join("\n");
  }

  if (lower.includes("balance") || lower.includes("funds") || lower.includes("money")) {
    // Auto-check both chains
    const aegis = await foreman.execute({
      type: "check_balance",
      description: "Balance check (natural)",
      params: { chain: "aegis", address: foreman.getStatus().wallet },
    });
    const base = await foreman.execute({
      type: "check_balance",
      description: "Balance check (natural)",
      params: { chain: "base", address: foreman.getStatus().wallet },
    });
    return [
      `  Aegis: ${aegis.success ? aegis.result.formatted : "unavailable"}`,
      `  Base:  ${base.success ? base.result.formatted : "unavailable"}`,
    ].join("\n");
  }

  if (lower.includes("chain") || lower.includes("connected") || lower.includes("online")) {
    const r = await foreman.execute({
      type: "bridge_check",
      description: "Connection check (natural)",
      params: {},
    });
    if (!r.success) return "  Can't check right now.";
    const { aegis, base } = r.result;
    return [
      `  Aegis: ${aegis.connected ? "online" : "offline"}`,
      `  Base:  ${base.connected ? "online" : "offline"}`,
    ].join("\n");
  }

  return "  I don't have a handler for that yet. Type 'help' to see what I can do.";
}

// ─── Helpers ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log();
  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log("  │          FOREMAN TERMINAL v1.0.0                     │");
  console.log("  │   Talk to Foreman. Type commands or just talk.       │");
  console.log("  │   Type 'help' for commands, 'exit' to quit.         │");
  console.log("  └─────────────────────────────────────────────────────┘");
  console.log();

  // Boot Foreman
  const foreman = new Foreman({
    aegisRpc: AEGIS_RPC,
    baseRpc: BASE_RPC,
    headlessBrowser: true,
  });

  try {
    await foreman.boot();
  } catch (e: any) {
    console.log(`  [!] Boot warning: ${e.message}`);
    console.log("  [!] Foreman running in degraded mode — some features unavailable.");
    console.log();
  }

  // Request faucet funding
  try {
    const wallet = foreman.getStatus().wallet;
    if (wallet) {
      const res = await fetch(`${AEGIS_RPC}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet }),
      });
      const data = await res.json() as any;
      if (data.success) {
        console.log(`  [Foreman] Funded: ${data.formatted}`);
      }
    }
  } catch {}

  console.log();
  console.log("  Ready. Talk to me.");
  console.log();

  // Start REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "  Nate > ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Try structured commands first
    let handled = false;
    for (const cmd of COMMANDS) {
      const match = input.match(cmd.match);
      if (match) {
        try {
          const response = await cmd.handler(foreman, match);
          if (response === "__EXIT__") {
            console.log();
            console.log("  [Foreman] Shutting down. Catch you later, Nate.");
            console.log();
            await foreman.shutdown();
            rl.close();
            process.exit(0);
          }
          console.log();
          console.log(response);
          console.log();
        } catch (e: any) {
          console.log(`\n  Error: ${e.message}\n`);
        }
        handled = true;
        break;
      }
    }

    // Fall back to natural language
    if (!handled) {
      try {
        const response = await handleNatural(foreman, input);
        console.log();
        console.log(response);
        console.log();
      } catch (e: any) {
        console.log(`\n  Error: ${e.message}\n`);
      }
    }

    rl.prompt();
  });

  rl.on("close", async () => {
    await foreman.shutdown();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
