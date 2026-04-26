#!/usr/bin/env pwsh
# AEGIS VAULT SEALER — DPAPI encrypted credential store
# Encrypts all secrets with Windows DPAPI (CurrentUser scope)
# Only THIS Windows user on THIS machine can decrypt
# Usage: .\seal_vault.ps1

param(
    [string]$VaultPath = "D:\DataVault\Vault\aegis_vault.enc"
)

Add-Type -AssemblyName System.Security

# ── Collect all credentials ──
$secrets = @{}

# Venice AI
$secrets["VENICE_LOGOS"]       = Read-Host -Prompt "Venice key (Logos)" -AsSecureString | ConvertFrom-SecureString
$secrets["VENICE_VIXEN"]       = Read-Host -Prompt "Venice key (Vixen)" -AsSecureString | ConvertFrom-SecureString
$secrets["VENICE_INFERENCE"]   = Read-Host -Prompt "Venice Inference key" -AsSecureString | ConvertFrom-SecureString
$secrets["VENICE_EXTRA"]       = Read-Host -Prompt "Venice extra key" -AsSecureString | ConvertFrom-SecureString

# Gateway
$secrets["GATEWAY_KEY"]        = Read-Host -Prompt "Gateway key (vck_...)" -AsSecureString | ConvertFrom-SecureString

# OpenAI
$secrets["OPENAI_KEY"]         = Read-Host -Prompt "OpenAI key (sk-proj-...)" -AsSecureString | ConvertFrom-SecureString

# Groq
$secrets["GROQ_KEY"]           = Read-Host -Prompt "Groq key (gsk_...)" -AsSecureString | ConvertFrom-SecureString

# OpenRouter
$secrets["OPENROUTER_KEY"]     = Read-Host -Prompt "OpenRouter key (sk-or-...)" -AsSecureString | ConvertFrom-SecureString

# GitHub PAT
$secrets["GITHUB_PAT"]        = Read-Host -Prompt "GitHub PAT" -AsSecureString | ConvertFrom-SecureString

# Hugging Face
$secrets["HUGGINGFACE_TOKEN"]  = Read-Host -Prompt "Hugging Face token" -AsSecureString | ConvertFrom-SecureString

# Rarible
$secrets["RARIBLE_MAIN"]      = Read-Host -Prompt "Rarible Main key" -AsSecureString | ConvertFrom-SecureString
$secrets["RARIBLE_TESTNET"]   = Read-Host -Prompt "Rarible Testnet key" -AsSecureString | ConvertFrom-SecureString

# Telegram
$secrets["TELEGRAM_API_ID"]    = Read-Host -Prompt "Telegram API ID" -AsSecureString | ConvertFrom-SecureString
$secrets["TELEGRAM_API_HASH"]  = Read-Host -Prompt "Telegram API Hash" -AsSecureString | ConvertFrom-SecureString

# LLM/Unknown
$secrets["LLMNX_KEY"]         = Read-Host -Prompt "LLMNX key" -AsSecureString | ConvertFrom-SecureString
$secrets["MYSTERY_KEY"]       = Read-Host -Prompt "Mystery key (gwoQ...)" -AsSecureString | ConvertFrom-SecureString

# ── Serialize and encrypt ──
$json = $secrets | ConvertTo-Json -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$encrypted = [System.Security.Cryptography.ProtectedData]::Protect(
    $bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[System.IO.File]::WriteAllBytes($VaultPath, $encrypted)

Write-Host ""
Write-Host "VAULT SEALED: $VaultPath" -ForegroundColor Green
Write-Host "Encrypted bytes: $($encrypted.Length)" -ForegroundColor Cyan
Write-Host "Protection: DPAPI CurrentUser (only your Windows account can unseal)" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Wallets/seed phrases are NOT stored here. Those go in KeePassXC only." -ForegroundColor Yellow
