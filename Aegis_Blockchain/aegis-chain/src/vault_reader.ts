/**
 * vault_reader.ts — AegisForge Master Vault Reader
 *
 * Single source of truth for all API keys, RPC endpoints, and credentials.
 * Reads from: Final_AegisForge_Fullstack/Vault/
 *
 * Format parsed:
 *   [Label Name]           ← section header (may have # comment after ])
 *   KEY_VALUE              ← simple single-line value
 *
 *   [Complex Section]
 *   Key: value             ← structured multi-line values
 *
 * Zero external dependencies — Node.js built-ins only.
 * All reads are synchronous and cached on first access.
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// ─── Vault Resolution ──────────────────────────────────────────────────────────

function findVaultDir(): string {
  if (process.env.VAULT_DIR && existsSync(process.env.VAULT_DIR)) {
    return process.env.VAULT_DIR;
  }

  // Known absolute location
  const known = "C:\\Users\\natha\\OneDrive\\Desktop\\Final_AegisForge_Fullstack\\Vault";
  if (existsSync(known)) return known;

  // Relative: src/ → aegis-chain/ → Aegis_Blockchain/ → Final_AegisForge_Fullstack/ → Vault/
  const rel = resolve(
    typeof __dirname !== "undefined" ? __dirname : new URL(".", import.meta.url).pathname,
    "..", "..", "..", "Vault"
  );
  if (existsSync(rel)) return rel;

  throw new Error(
    `[vault_reader] Vault not found. Set VAULT_DIR env var.\n  Tried: ${known}\n  Tried: ${rel}`
  );
}

// ─── Parser ────────────────────────────────────────────────────────────────────

// Each label maps to an array of its content lines
type VaultRaw = Record<string, string[]>;

function parseVaultFile(filePath: string): VaultRaw {
  if (!existsSync(filePath)) return {};

  const map: VaultRaw = {};
  let label = "";

  for (const rawLine of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();

    // Skip blank lines and comments; blank line also resets current label
    if (!line) { label = ""; continue; }
    if (line.startsWith("#")) continue;

    // Label line — may have trailing comment: [Label] # comment
    const labelMatch = line.match(/^\[([^\]]+)\]/);
    if (labelMatch) {
      label = labelMatch[1].trim();
      map[label] = [];
      continue;
    }

    if (label) {
      map[label].push(line);
    }
  }

  return map;
}

/** Extract simple first-line value for a label */
function pick(raw: VaultRaw, ...labels: string[]): string {
  for (const l of labels) {
    const lines = raw[l];
    if (lines && lines.length > 0) {
      // If the line is "Key: Value" format, return everything after the colon
      const colonIdx = lines[0].indexOf(":");
      if (colonIdx > 0 && colonIdx < 20) {
        return lines[0].slice(colonIdx + 1).trim();
      }
      return lines[0];
    }
  }
  return "";
}

/** Extract a named field (e.g. "Endpoint: ...") from a multi-line section */
function pickField(raw: VaultRaw, label: string, field: string): string {
  const lines = raw[label] || [];
  const prefix = field.toLowerCase() + ":";
  for (const line of lines) {
    if (line.toLowerCase().startsWith(prefix)) {
      return line.slice(field.length + 1).trim();
    }
  }
  return "";
}

// ─── Cached State ──────────────────────────────────────────────────────────────

let _vaultDir: string | null = null;
let _apiKeys: VaultRaw | null = null;
let _rpcKeys: VaultRaw | null = null;

function vaultDir(): string {
  if (!_vaultDir) _vaultDir = findVaultDir();
  return _vaultDir;
}

function api(): VaultRaw {
  if (!_apiKeys) _apiKeys = parseVaultFile(join(vaultDir(), "Api_keys.txt"));
  return _apiKeys;
}

function rpc(): VaultRaw {
  if (!_rpcKeys) _rpcKeys = parseVaultFile(join(vaultDir(), "RPC_Keys.txt"));
  return _rpcKeys;
}

// ─── Public Accessors ──────────────────────────────────────────────────────────

/** Venice Inference key (used by router + miners) */
export function getVeniceInferenceKey(): string {
  return pick(api(), "Venice - Inference");
}

/** Venice Admin key by name (Logos, Vixen, etc.) */
export function getVeniceAdminKey(name = "Logos"): string {
  return pick(api(), `Venice - ${name}`);
}

/** Active OpenAI project key */
export function getOpenAIKey(): string {
  return pick(
    api(),
    "OpenAI - New Project Key (2026-04-21)",
    "OpenAI - Service Account Key (2026-04-21)",
    "OpenAI - Primary (clipboard)",
    "OpenAI - Personal Vault"
  );
}

/** OpenRouter key */
export function getOpenRouterKey(): string {
  return pick(
    api(),
    "OpenRouter - Primary (conversation audit)",
    "OpenRouter - Secondary (clipboard)"
  );
}

/** Groq key */
export function getGroqKey(): string {
  return pick(api(), "Groq");
}

/** GitHub Personal Access Token */
export function getGitHubToken(): string {
  return pick(api(), "GitHub PAT");
}

/** Alchemy API key */
export function getAlchemyKey(): string {
  return pick(api(), "Alchemy") || pick(rpc(), "Alchemy");
}

/** Basescan API key */
export function getBasescanKey(): string {
  return pick(api(), "Basescan") || pick(rpc(), "Basescan");
}

/** Etherscan API key */
export function getEtherscanKey(): string {
  return pick(api(), "Etherscan") || pick(rpc(), "Etherscan");
}

/** Aegis Chain RPC endpoint */
export function getAegisRpc(): string {
  return process.env.AEGIS_RPC
    || pickField(rpc(), "Aegis Chain RPC", "Endpoint")
    || "http://localhost:8545";
}

/** MongoDB Atlas connection string */
export function getMongoUri(): string {
  return pickField(api(), "Atlas Cluster - Connection String (2026-04-20 16:49)", "URI");
}

/** Rarible API key */
export function getRaribleKey(): string {
  return pick(api(), "Rarible - Main");
}

/** Anthropic org ID */
export function getAnthropicOrgId(): string {
  return pick(api(), "Anthropic - Claude Opus Org ID (2026-04-21)");
}

/** Summary of what the vault has loaded — for boot logs */
export function vaultStatus(): Record<string, boolean> {
  return {
    venice_inference: !!getVeniceInferenceKey(),
    openai:           !!getOpenAIKey(),
    openrouter:       !!getOpenRouterKey(),
    groq:             !!getGroqKey(),
    github:           !!getGitHubToken(),
    alchemy:          !!getAlchemyKey(),
    basescan:         !!getBasescanKey(),
    etherscan:        !!getEtherscanKey(),
    mongo:            !!getMongoUri(),
  };
}
