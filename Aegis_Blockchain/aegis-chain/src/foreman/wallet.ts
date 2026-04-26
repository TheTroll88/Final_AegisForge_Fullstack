/**
 * Foreman — Wallet Management
 *
 * Generates and manages Foreman's own wallet.
 * DPAPI encrypted on Windows — only this machine can decrypt.
 * Foreman's keys are HIS, not Nate's and not Copilot's.
 */

import { ethers } from "ethers";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const VAULT_DIR = join(import.meta.dirname || __dirname, "..", "..", ".vault", "foreman");

export interface ForemanWallet {
  address: string;
  privateKey: string;
}

/**
 * Get or create Foreman's wallet.
 * Creates a new random wallet if none exists, encrypts with DPAPI.
 */
export async function getForemanWallet(): Promise<ForemanWallet> {
  const addressFile = join(VAULT_DIR, "address.txt");
  const keyFile = join(VAULT_DIR, "key.enc");

  if (existsSync(addressFile) && existsSync(keyFile)) {
    const address = readFileSync(addressFile, "utf-8").trim();
    const privateKey = await decryptKey(keyFile);
    return { address, privateKey };
  }

  // Generate fresh wallet
  const wallet = ethers.Wallet.createRandom();
  console.log(`  [Foreman] New wallet generated: ${wallet.address}`);

  // Store encrypted
  mkdirSync(VAULT_DIR, { recursive: true });
  writeFileSync(addressFile, wallet.address);
  await encryptKey(wallet.privateKey, keyFile);

  return { address: wallet.address, privateKey: wallet.privateKey };
}

export interface SolanaWallet {
  address: string;
  secretKey: string; // base58-encoded 64-byte keypair
}

/**
 * Load the vaulted Solana wallet (DPAPI encrypted).
 * Returns null if no Solana vault exists yet.
 */
export async function getSolanaWallet(): Promise<SolanaWallet | null> {
  const solanaVaultDir = join(VAULT_DIR, "..", "solana");
  const addressFile = join(solanaVaultDir, "address.txt");
  const keyFile = join(solanaVaultDir, "key.enc");

  if (!existsSync(addressFile) || !existsSync(keyFile)) return null;

  const address = readFileSync(addressFile, "utf-8").trim();
  const secretKey = await decryptKey(keyFile);
  return { address, secretKey };
}

async function encryptKey(key: string, outPath: string): Promise<void> {
  // Use DPAPI via PowerShell for Windows-native encryption
  const { execSync } = await import("child_process");
  const b64 = Buffer.from(key).toString("base64");
  const ps = `
    Add-Type -AssemblyName System.Security;
    $bytes = [System.Convert]::FromBase64String('${b64}');
    $enc = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, 'CurrentUser');
    [System.IO.File]::WriteAllBytes('${outPath.replace(/\\/g, "\\\\")}', $enc);
  `;
  execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
}

async function decryptKey(keyFile: string): Promise<string> {
  const { execSync } = await import("child_process");
  const ps = `
    Add-Type -AssemblyName System.Security;
    $enc = [System.IO.File]::ReadAllBytes('${keyFile.replace(/\\/g, "\\\\")}');
    $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($enc, $null, 'CurrentUser');
    [System.Text.Encoding]::UTF8.GetString($dec);
  `;
  const result = execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, { encoding: "utf-8" });
  return result.trim();
}
