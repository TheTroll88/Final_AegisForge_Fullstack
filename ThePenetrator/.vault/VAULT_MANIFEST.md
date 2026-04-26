# ThePenetrator DPAPI Vault Manifest

> All secrets encrypted with Windows DPAPI (CurrentUser scope).
> Only Nate's Windows account on this machine can decrypt.
> Created by Foreman 2.0 sweep — 2026-04-12
> Updated with full inventory — 2026-04-12

## Sealed Secrets (47 total)

### Round 1 — Dot-folder Sweep (7 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `VENICE_ADMIN_KEY.sec` | `.continue/config.yaml` (3 model entries) | Venice AI admin API key | 2026-04-12 |
| `OPENROUTER_KEY.sec` | `.continue/config.yaml` (tabAutocomplete) | OpenRouter API key (`sk-or-v1-...`) | 2026-04-12 |
| `CODEX_OPENAI_KEY.sec` | `.codex/auth.json` | OpenAI project key for Codex (`sk-proj-...`) | 2026-04-12 |
| `CU_OPENAI_KEY.sec` | `Classified_Underdog/config.py` (comment) | OpenAI project key for CU ops | 2026-04-12 |
| `CU_EXPLORER_JWT.sec` | `Classified_Underdog/config.py` (comment) | Solana Explorer API JWT | 2026-04-12 |
| `PROXY_API_KEY.sec` | `openclaw/.env` | OpenClaw gateway token | 2026-04-12 |
| `SOLANA_DEV_WALLET.sec` | `turbin3-prereqs/ts/dev-wallet.json` | Solana 64-byte dev keypair | 2026-04-12 |

### Round 2 — D:\CRITICAL_BACKUP (7 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `GITHUB_PAT_AEGISFORGE.sec` | D:\CRITICAL_BACKUP | GitHub PAT for AegisForge | 2026-04-12 |
| `PHASEPORT_METAMASK_PRIVKEY.sec` | D:\CRITICAL_BACKUP | PhasePort MetaMask private key | 2026-04-12 |
| `PHASEPORT_ALCHEMY_BASE_KEY.sec` | D:\CRITICAL_BACKUP | PhasePort Alchemy Base RPC key | 2026-04-12 |
| `PHASEPORT_BASESCAN_KEY.sec` | D:\CRITICAL_BACKUP | PhasePort Basescan API key | 2026-04-12 |
| `KRATOS_OPENROUTER_KEY.sec` | D:\CRITICAL_BACKUP | Kratos OpenRouter API key | 2026-04-12 |
| `BANKR_API_KEY.sec` | D:\CRITICAL_BACKUP | Bankr platform API key | 2026-04-12 |
| `OPENAI_PERSONAL_VAULT_KEY.sec` | D:\CRITICAL_BACKUP | OpenAI personal/vault key | 2026-04-12 |

### Round 3 — D:\SecureVault (12 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `ETHERSCAN_API_KEY.sec` | D:\SecureVault | Etherscan API key | 2026-04-12 |
| `WHALE_PG_PASSWORD.sec` | D:\SecureVault | WhaleDB PostgreSQL password | 2026-04-12 |
| `EVM_PRIVKEY_CHATGPT_MAY5.sec` | D:\SecureVault | EVM private key (ChatGPT May 5) | 2026-04-12 |
| `EVM_PRIVKEY_CHATGPT_FRUST1.sec` | D:\SecureVault | EVM private key (ChatGPT frust series 1) | 2026-04-12 |
| `EVM_PRIVKEY_CHATGPT_FRUST2.sec` | D:\SecureVault | EVM private key (ChatGPT frust series 2) | 2026-04-12 |
| `EVM_PRIVKEY_CHATGPT_WARPCAST.sec` | D:\SecureVault | EVM private key (ChatGPT Warpcast) | 2026-04-12 |
| `EVM_PRIVKEY_COPILOT_1.sec` | D:\SecureVault | EVM private key (Copilot gen 1) | 2026-04-12 |
| `EVM_PRIVKEY_COPILOT_2.sec` | D:\SecureVault | EVM private key (Copilot gen 2) | 2026-04-12 |
| `EVM_PRIVKEY_COPILOT_3.sec` | D:\SecureVault | EVM private key (Copilot gen 3) | 2026-04-12 |
| `EVM_PRIVKEY_COPILOT_4.sec` | D:\SecureVault | EVM private key (Copilot gen 4) | 2026-04-12 |
| `EVM_PRIVKEY_COPILOT_5.sec` | D:\SecureVault | EVM private key (Copilot gen 5) | 2026-04-12 |
| `OPENAI_REFRESH_TOKEN.sec` | D:\SecureVault | OpenAI refresh token | 2026-04-12 |

### Round 4 — Seeds & Passwords (4 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `SEED_PHRASE_BRAVO.sec` | User-provided | Wallet seed phrase (Bravo) | 2026-04-12 |
| `SEED_PHRASE_FRAME.sec` | User-provided | Wallet seed phrase (Frame) | 2026-04-12 |
| `KEEPASS_MASTER_PASSWORD.sec` | User-provided | KeePassXC master password | 2026-04-12 |
| `KEEPASS_EXTRA_PASSWORD.sec` | User-provided | KeePassXC extra/recovery password | 2026-04-12 |

### Round 5 — Logos DPAPI Keyring (13 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `LOGOS_VENICE_API_KEY.sec` | Logos keyring | Venice API key (Logos agent) | 2026-04-12 |
| `LOGOS_ALCHEMY_API_KEY.sec` | Logos keyring | Alchemy RPC key (Logos agent) | 2026-04-12 |
| `LOGOS_EVM_PRIVATE_KEY.sec` | Logos keyring | EVM wallet key (Logos agent) | 2026-04-12 |
| `LOGOS_SOLANA_PRIVATE_KEY.sec` | Logos keyring | Solana wallet key (Logos agent) | 2026-04-12 |
| `LOGOS_LOGOS_GATEWAY_KEY.sec` | Logos keyring | Logos gateway key 1 | 2026-04-12 |
| `LOGOS_LOGOS_GATEWAY_KEY_2.sec` | Logos keyring | Logos gateway key 2 | 2026-04-12 |
| `LOGOS_GROQ_API_KEY.sec` | Logos keyring | Groq API key (Logos agent) | 2026-04-12 |
| `LOGOS_OPENROUTER_API_KEY.sec` | Logos keyring | OpenRouter key (Logos agent) | 2026-04-12 |
| `LOGOS_GITHUB_TOKEN.sec` | Logos keyring | GitHub token (Logos agent) | 2026-04-12 |
| `LOGOS_HUGGINGFACE_TOKEN.sec` | Logos keyring | HuggingFace token (Logos agent) | 2026-04-12 |
| `LOGOS_OPENAI_API_KEY.sec` | Logos keyring | OpenAI API key (Logos agent) | 2026-04-12 |
| `LOGOS_OPENAI_ADMIN_KEY.sec` | Logos keyring | OpenAI admin key (Logos agent) | 2026-04-12 |
| `LOGOS_TESTNET_WALLET_KEY.sec` | Logos keyring | Testnet wallet key (Logos agent) | 2026-04-12 |

### Round 6 — Docker / Container (4 files)
| File | Source | Description | Sealed |
|------|--------|-------------|--------|
| `PRESEARCH_REGISTRATION_CODE.sec` | presearch-node container env | Presearch node registration code | 2026-04-12 |
| `DOCKER_HUB_PAT.sec` | docker-credential-desktop | Docker Hub PAT (user: thetroll888) | 2026-04-12 |
| `GHCR_OAUTH_TOKEN.sec` | docker-credential-desktop | GHCR OAuth (user: TheTroll88) | 2026-04-12 |
| `ELIZAOS_DOCKER_IMAGE_SHA.sec` | Docker image inspect | ElizaOS SolScope image SHA | 2026-04-12 |

## Exposure Status

| Source File | Status | Action Needed |
|-------------|--------|---------------|
| `.continue/config.yaml` | **STILL EXPOSED** | Replace plaintext keys with env vars |
| `.codex/auth.json` | **STILL EXPOSED** | Replace with `$OPENAI_API_KEY` env var |
| `Classified_Underdog/config.py` | **STILL EXPOSED** | Keys in comments — remove |
| `logos/workspace/google_passwords.csv` | **CRITICAL** | 11 full plaintext passwords — delete |
| `logos/workspace/proxy_config.json` | **STILL EXPOSED** | Solana privkey + Alchemy key — replace with vault refs |
| `turbin3-prereqs/ts/dev-wallet.json` (×3) | **STILL EXPOSED** | Plaintext Solana keypair — vault or delete |
| `Desktop/AegisForge/.env` | **STILL EXPOSED** | OpenAI project key — use vault ref |
| `openclaw/.env` | **STILL EXPOSED** | Gateway token — remove plaintext |

## Other Vault Locations (NOT in this folder)

| Vault | Path | Files | Owner |
|-------|------|-------|-------|
| LITCOIN Miner | `D:\DataVault\Vault\` | 16 .sec files | LITCOIN Fleet (DO NOT TOUCH) |
| LITCOIN Secure | `C:\Users\natha\LITCOIN_Miner\.secure_vault\` | 3 wallet privkeys | LITCOIN Fleet (DO NOT TOUCH) |
| base-explorer | `C:\Users\natha\base-explorer\.vault\` | `wallet.enc` + `address.txt` | Base chain explorer |
| Codex sandbox | `C:\Users\natha\.codex\.sandbox-secrets\` | `sandbox_users.json` (v5, DPAPI) | OpenAI Codex CLI |

## Decryption

```powershell
# Read a single secret:
$encrypted = Get-Content "C:\Users\natha\OneDrive\ThePenetrator\.vault\VENICE_ADMIN_KEY.sec"
$secure = ConvertTo-SecureString $encrypted
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)
# $plain now holds the decrypted value
```

## Notes

- AegisForge `.env` OpenAI key already revoked (`REVOKED_ROTATE_ON_DASHBOARD`) — not vaulted
- Logos config (`logos.config.json`) already uses `$VAULT:` references — no exposure
- LITCOIN Miner vault at `D:\DataVault\Vault\` is separate, has its own secrets — DO NOT TOUCH
- Source files NOT modified during this sweep (read-only per Foreman 2.0 rules)
- Full intel breakdown in `ThePenetrator/anvil/intel/` — see MASTER_CREDENTIAL_INVENTORY.md
- Total unique secrets across all vaults: 47 (this folder) + 16 (LITCOIN) + 3 (LITCOIN secure) + 1 (base-explorer) + 2 (Codex sandbox) = **69 encrypted secrets**
