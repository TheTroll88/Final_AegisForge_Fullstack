# Master Credential Inventory
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-13
**Purpose:** Complete inventory of every key, secret, token, wallet, and credential found across the system.
**Classification:** SENSITIVE — do not commit to public repos.

---

## 1. API Keys

### 1a. OpenAI / OpenRouter Keys
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 1 | `sk-proj-_LaKDCqn8w...6aD_kA` | `.codex/auth.json` | **LIVE** | Codex agent OpenAI project key |
| 2 | `sk-proj-54Az2Qwo75...WHn54A` | `Desktop/AegisForge/.env` + `GitHub/Desktop/AegisForge/.env` | **LIVE** | AegisForge OpenAI project key, routed via OpenRouter |
| 3 | `sk-proj-swo2J6Qpv4...uJSYA` | `Desktop/Classified_Underdog/config.py` (env var instruction) | **LIVE** | Classified_Underdog ephemeral key (CU_OPENAI_KEY) |
| 4 | `REVOKED_ROTATE_ON_OPENAI_DASHBOARD` | `AegisForge/.env` (root) + `GitHub/AegisForge/.env` | **REVOKED** | Old key, placeholder marker |

### 1b. Venice AI Keys
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 5 | `VENICE_ADMIN_KEY_QnsHH8Pd...H40tu` | `.continue/config.yaml` | **LIVE** | Venice admin key — used by 3 Continue models |
| 6 | `$VENICE_API_KEY` (env var ref) | `logos.config.json` (ThePenetrator), `.claude-code-router/config.json` | **ENV REF** | Both Logos and the router read from env var |
| 7 | `~/.venice_key` (file ref) | `logos.config.json` | **FILE REF** | Fallback key file location |

### 1c. OpenRouter Key
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 8 | `sk-or-v1-9cf1f8d7...a63a62` | `.continue/config.yaml` (tabAutocompleteModel) | **LIVE** | OpenRouter key for tab autocomplete |

### 1d. Antigravity / CLI Proxy API Keys
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 9 | `sk-zdt4hv5akbmwcy7j28ly5` | `.gemini/antigravity/bin/config.yaml` | **LIVE** | Primary Antigravity API key |
| 10 | `sk-antigravity-a477b6fb766cfc06` | same | **LIVE** | Antigravity key 2 |
| 11 | `sk-antigravity-1b19344d0340b86a` | same | **LIVE** | Antigravity key 3 |
| 12 | `sk-antigravity-2f05cc71c282fa36` | same | **LIVE** | Antigravity key 4 |
| 13 | Management secret (bcrypt hash) | same | **LIVE** | Antigravity management panel auth |

### 1e. Logos Agent Keys
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 14 | `sk-logos-local-e3f8a4b2c1d9f7e5a3b8c2d1e9f7a4b8` | `C:\Users\natha\logos\logos-credentials.json` | **LIVE** | Logos local API key (old standalone install) |
| 15 | `secret-logos-core-2026-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` | same | **LIVE** | Logos API secret |
| 16 | `$VAULT:venice_api_key` | `ThePenetrator/logos/logos.config.json` | **VAULT REF** | New Logos uses DPAPI vault |
| 17 | `$VAULT:alchemy_api_key` | same | **VAULT REF** | Alchemy RPC key via vault |

### 1f. Other API Keys
| # | Key (masked) | Location | Status | Notes |
|---|-------------|----------|--------|-------|
| 18 | `f0eb6c815aa1ee...76eea5` | `openclaw/.env` | **LIVE** | OpenClaw gateway token |
| 19 | JWT `eyJhbGci...x2Sqw` | `Classified_Underdog/config.py` (env var instruction) | **LIVE** | Solscan/explorer API token (email: nathanielcrigger66@gmail.com) |

---

## 2. OAuth / Auth Tokens

| # | Token (masked) | Location | Status | Notes |
|---|---------------|----------|--------|-------|
| 20 | `gho_kMqz5R05...1ZH6UX` | `.cli-proxy-api/github-copilot.json` | **LIVE** | GitHub Copilot OAuth for Antigravity proxy, user: TheTroll88 |

---

## 3. SSH / Ed25519 Keys

| # | Public Key (masked) | Location | Status | Notes |
|---|-------------------|----------|--------|-------|
| 21 | `ssh-ed25519 ...q0ke` | `~/.ollama/id_ed25519.pub` | **LIVE** | Ollama identity key, registered as "Nates_PC" on ollama.com |
| 22 | (private key, 387 bytes) | `~/.ollama/id_ed25519` | **LIVE** | Ollama private key — SENSITIVE |
| 23 | `ssh-ed25519 ...nyMq nate@windows` | `~/.ssh/id_ed25519.pub` | **LIVE** | GitHub SSH key (TheTroll88 repos) |
| 24 | (private key, 399 bytes) | `~/.ssh/id_ed25519` | **LIVE** | GitHub SSH private key — SENSITIVE |
| 25 | Fingerprint: `SHA256:zF+wGWd...Z+PYY` | `ThePenetrator/logos/logos.config.json` | **REF** | Same key #23, referenced in Logos config |

---

## 4. Telegram Credentials

| # | Field | Value | Location | Notes |
|---|-------|-------|----------|-------|
| 26 | api_id | `33459100` | `.logos/telegram/config.json` | Telegram app "Logos" |
| 27 | api_hash | `1b1460a8b9da...c9859` | same | Telegram app secret |

---

## 5. Crypto Wallets

### 5a. EVM Wallets
| # | Address | Location | Status | Notes |
|---|---------|----------|--------|-------|
| 28 | `0x36A9D523d70AE8b47898bc9B148B929370C3693F` | `ThePenetrator/logos/logos.config.json` | **PRIMARY** | Nate's primary EVM wallet (ETH/Base/Polygon/Arb/Opt/Zora). Private key in `$VAULT:evm_private_key` |
| 29 | `0x5128c0CF5Fa4c17526E85b345C90727bf4F94B48` | `base-explorer/.vault/address.txt` | **ACTIVE** | Base explorer wallet. Private key DPAPI-encrypted in `wallet.enc` |

### 5b. Solana Wallets
| # | Address | Location | Status | Notes |
|---|---------|----------|--------|-------|
| 30 | `4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow` | `ThePenetrator/logos/logos.config.json` | **PRIMARY** | Nate's primary Solana wallet. Private key in `$VAULT:solana_private_key` |
| 31 | (derived from dev-wallet.json) | `turbin3-prereqs/ts/dev-wallet.json` | **DEV** | Turbin3 dev wallet — 64-byte Solana keypair (plaintext JSON array) |
| 32 | (same as #31) | `turbin3-prereqs/ts/wba-wallet.json` | **DEV** | Same keypair as dev-wallet — WBA alias |
| 33 | (same as #31) | `turbin3-prereqs/ts/prereqs/dev-wallet.json` | **DEV** | Same keypair — copy in prereqs/ |
| 34 | `5DZK3tFX6z6HFUttz1ykbP5YfRPzqwPLvNZKLFzR3rxD` | `aegis-chain/moove_accounts.json` | **BURNED** | Moove account — "Invalid digest" error |

### 5c. Nosana Wallet
| # | Address | Location | Status | Notes |
|---|---------|----------|--------|-------|
| 35 | (64-byte keypair) | `nosana-agent-challenge/.foreman/wallet.json` | **CHALLENGE** | Nosana agent challenge wallet |

### 5d. Burned/Abandoned Wallets
| # | Note | Location |
|---|------|----------|
| 36 | 4 wallets burned — private keys exposed | `aegis-chain/moove_wallets.json` |

### 5e. Investigation Wallets (NOT Nate's — scammer cluster)
| # | Address | Role | Location |
|---|---------|------|----------|
| 37 | `9RAufBfjGQjDfrwxeyKmZWPADHSb8HcoqCdrmpqvCr1g` | Deployer/Bank | `Classified_Underdog/CLASSIFIED_OPERATIONAL_BRIEF.md` |
| 38 | `B7WLUiLuZaGWDqGfL8A9wm4Rz7S2MRg4zMtQkba97RDh` | Scam token | `Classified_Underdog/Hackers wallet address.txt` |
| 39 | `GkjQ1DCX9Uo8BLuY1n16mhnhJxchxKWSS9jdJuCH5j8b` | Freeze authority | same |

---

## 6. Docker / Container Credentials

| # | Credential | Location | Notes |
|---|-----------|----------|-------|
| 40 | Docker Hub token seed: `RjwsB7jz...BcA==` | `.docker/.token_seed` | Registry auth seed for docker.io |
| 41 | Docker creds store: "desktop" | `.docker/config.json` | Credentials managed by Docker Desktop (ghcr.io + docker.io) |
| 42 | Factory AI root CA cert (1780 bytes) | `.factory/certs/factory-ai-root.pem` | Factory AI TLS root certificate |
| 54 | Docker Hub PAT: `dckr_pat_f1Ie...2Lc` | Docker Desktop credsStore | **VAULTED** → `DOCKER_HUB_PAT.sec`. User: thetroll888 |
| 55 | GHCR OAuth: `gho_HxSFem...oH4t` | Docker Desktop credsStore | **VAULTED** → `GHCR_OAUTH_TOKEN.sec`. User: TheTroll88 |
| 56 | Presearch reg code: `5d1004...ea64` | `presearch-node` container env | **VAULTED** → `PRESEARCH_REGISTRATION_CODE.sec` |
| 57 | Codex sandbox offline password | `.codex/.sandbox-secrets/sandbox_users.json` | DPAPI-encrypted (ConvertTo-SecureString) |
| 58 | Codex sandbox online password | same | DPAPI-encrypted (ConvertTo-SecureString) |

---

## 7. Vault References (DPAPI-Encrypted)

| # | Vault Key | Referenced In | Notes |
|---|-----------|--------------|-------|
| 43 | `venice_api_key` | `ThePenetrator/logos/logos.config.json` | Venice API key in DPAPI vault |
| 44 | `alchemy_api_key` | same | Alchemy RPC key in DPAPI vault |
| 45 | `evm_private_key` | same | EVM wallet private key in DPAPI vault |
| 46 | `solana_private_key` | same | Solana wallet private key in DPAPI vault |
| 47 | LITCOIN wallet 2 privkey | `LITCOIN_Miner/.secure_vault/WALLET_2_PRIVKEY.sec` | DPAPI-encrypted (392 bytes) |
| 48 | LITCOIN wallet 3 privkey | `LITCOIN_Miner/.secure_vault/WALLET_3_PRIVKEY.sec` | DPAPI-encrypted (392 bytes) |
| 49 | LITCOIN wallet 4 privkey | `LITCOIN_Miner/.secure_vault/WALLET_4_PRIVKEY.sec` | DPAPI-encrypted (392 bytes) |
| 50 | Base-explorer wallet privkey | `base-explorer/.vault/wallet.enc` | DPAPI-encrypted (392 bytes) |

---

## 8. Nosana / Third-Party Inference Endpoints

| # | Endpoint | Location | Notes |
|---|---------|----------|-------|
| 51 | `https://6vq2bcq...v2x.node.k8s.prd.nos.ci/v1` | `nosana-agent-challenge/.env` | Nosana inference endpoint (Qwen3.5-27B) |

---

## 9. Solana CLI Config

| # | Setting | Value | Location |
|---|---------|-------|----------|
| 52 | json_rpc_url | `https://api.devnet.solana.com` | `.config/solana/cli/config.yml` |
| 53 | keypair_path | `dev-wallet.json` | same |

---

## 10. Project Folder Map (All Known)

| Path | Status | Owner/Purpose |
|------|--------|---------------|
| `C:\Users\natha\OneDrive\ThePenetrator\` | **ACTIVE** | Master multi-agent workspace (Anvil + Logos) |
| `C:\Users\natha\OneDrive\Desktop\Classified_Underdog\` | EXISTS | Honeypot forensics / security research |
| `C:\Users\natha\OneDrive\Desktop\bounty_cleanroom\` | EXISTS | Apple security bounty submission |
| `C:\Users\natha\OneDrive\Desktop\Aegis-Master-Folder\` | MISSING | Referenced in `.claude/projects/` — deleted or moved |
| `C:\Users\natha\OneDrive\Desktop\Grand Idea\Plutus\` | MISSING | Referenced in `.continue/config.yaml` and `.claude/projects/` |
| `C:\Users\natha\OneDrive\Desktop\Grand Idea\HACKING-BOT\` | MISSING | Referenced in `.continue/config.yaml` |
| `C:\Users\natha\OneDrive\GitHub\` | **ACTIVE** | Main GitHub repos (aegis-ai, aegis-chain, AegisForge, etc.) |
| `C:\Users\natha\logos\` | EXISTS | Old standalone Logos install (port 7788, Ollama-backed) |
| `C:\Users\natha\base-explorer\` | EXISTS | Base chain wallet generator + DPAPI vault |
| `C:\Users\natha\aegis-chain\` | EXISTS | Local copy of aegis-chain |
| `C:\Users\natha\AegisForge\` | EXISTS | AegisForge local copy (revoked key) |
| `C:\Users\natha\Desktop\AegisForge\` | EXISTS | AegisForge desktop copy (live key) |
| `C:\Users\natha\nosana-agent-challenge\` | EXISTS | Nosana ElizaOS challenge |
| `C:\Users\natha\openclaw\` | EXISTS | OpenClaw local install |
| `C:\Users\natha\turbin3-prereqs\` | EXISTS | Solana Turbin3 bootcamp prereqs |
| `C:\Users\natha\v4w_website\` | EXISTS | V4W website + TorBot |
| `C:\Users\natha\wallet-bridge\` | EXISTS | VS Code wallet bridge extension |
| `C:\Users\natha\honeypot-lab\` | EXISTS | Honeypot research lab |
| `C:\Users\natha\AWS_Prompt_Challenge\` | EXISTS | AWS prompt challenge + wallet tracking |
| `C:\Users\natha\LITCOIN_Miner\` | EXISTS | LITCOIN mining fleet (DO NOT TOUCH) |
| `C:\Users\natha\Desktop\LITCOIN-Fleet\` | EXISTS | LITCOIN fleet tools (DO NOT TOUCH) |

---

## 11. Agent Tool Configs (Not Keys, But Important)

| Tool | Config Location | Key Settings |
|------|----------------|-------------|
| Antigravity/CLI Proxy | `~/.gemini/antigravity/bin/config.yaml` | Port 9100, TLS off, routes to 8317 |
| Claude Code Router | `GitHub/.claude-code-router/config.json` | Venice provider, 12 models routed |
| Continue | `GitHub/.continue/config.yaml` | Venice admin key, OpenRouter key |
| Codex | `GitHub/.codex/auth.json` | OpenAI project key, Ollama profile |
| Factory AI | `~/.factory/settings.json` | gemma3:4b via Ollama, custom model |
| Docker MCP | `GitHub/.docker/mcp/` | Docker MCP catalog, fetch/memory/playwright |
| Solana CLI | `GitHub/.config/solana/cli/config.yml` | Devnet, dev-wallet.json keypair path |
| OpenCode | `GitHub/.config/opencode/package.json` | @opencode-ai/plugin 1.4.3 |
| Kilo | `GitHub/.config/kilo/` | Bun-based, node_modules present |

---

---

## 12. Companion Intel Files (Category Deep-Dives)

All master files live in `ThePenetrator/anvil/intel/`:

| File | Contents | Items |
|------|----------|-------|
| `DOCKER_INVENTORY.md` | All 7 containers, 29 images, 11 networks, 8 volumes, extensions, credentials, known issues | Docker infra |
| `SYSTEM_ACCOUNTS.md` | 5 local accounts + 1 orphaned profile, Codex sandbox config, security assessment | User/account audit |
| `PORT_MAP.md` | 9 active host listeners, Docker-forwarded ports, VS Code bridges, probe status | Network topology |
| `GITHUB_REPOS.md` | 11 GitHub repos (TheTroll88), 16+ local-only repos, Docker Hub/GHCR images, integrations | Code assets |
| `K8S_CLUSTER.md` | 3 kubectl contexts, kube-system pods, hub-54465 Forbidden issue, security assessment | K8s cluster |
| `ELIZAOS_SOLSCOPE.md` | Full SolScope agent extraction — source, character, 6 actions, Nosana job, continuity state | Bounty project |
| `LOGOS_KEYRING_DECRYPTED.md` | 13 Logos DPAPI keyring secrets (full values) | Logos vault |
| `LOGOS_GOOGLE_PASSWORDS_DECRYPTED.md` | 217 Google password entries (masked passwords) | Logos vault |

---

## 13. CLI Tools Inventory (30+)

| Tool | Version/Path | Auth/Config |
|------|-------------|------------|
| `ollama` | latest, PID 20508 on :11434 | `~/.ollama/id_ed25519` (registered as Nates_PC) |
| `docker` | Docker Desktop v4.67.0 | credsStore: desktop (Docker Hub + GHCR) |
| `kubectl` | via Docker Desktop | 3 contexts (docker-desktop, hub-54465, desktop-hub) |
| `node` | v25.8.1 | — |
| `python` | 3.9.7 | — |
| `pip` | bundled | — |
| `npm` | bundled with node | — |
| `npx` | bundled | — |
| `yarn` | installed | — |
| `bun` | installed | — |
| `uv` / `uvx` | installed | — |
| `git` | 2.51.1 | SSH key `~/.ssh/id_ed25519` |
| `gh` | installed | TheTroll88 auth |
| `ssh` | OpenSSH | ed25519 key |
| `code` | VS Code 1.114.0 | `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd` |
| `wsl` | WSL2 | Docker backend |
| `cargo` / `rustc` | installed | — |
| `go` | installed | — |
| `java` | installed | — |
| `dotnet` | installed | — |
| `pnpm` | installed | — |
| `curl` | installed | — |
| `gpg` | GnuPG | — |
| `solana` | installed | devnet config, dev-wallet.json keypair |
| `anchor` | installed | Solana Anchor framework |
| `playwright` | MCP + standalone | Docker image `mcp/playwright` |
| `gcloud` | installed | nathanielcrigger66@gmail.com |
| `cliproxy` | Antigravity CLI Proxy | Port 9100, config at `~/.gemini/antigravity/` |
| `Postman` | installed | Not yet inventoried |

---

## 14. Vault Manifest (47 DPAPI .sec files)

All in `ThePenetrator/.vault/` — DPAPI CurrentUser scope, only Nate's account decrypts.

### Round 1 — Dot-folder sweep
| # | File | Source |
|---|------|--------|
| 1 | `VENICE_ADMIN_KEY.sec` | `.continue/config.yaml` |
| 2 | `OPENROUTER_KEY.sec` | `.continue/config.yaml` |
| 3 | `CODEX_OPENAI_KEY.sec` | `.codex/auth.json` |
| 4 | `CU_OPENAI_KEY.sec` | `Classified_Underdog/config.py` |
| 5 | `CU_EXPLORER_JWT.sec` | `Classified_Underdog/config.py` |
| 6 | `PROXY_API_KEY.sec` | `openclaw/.env` |
| 7 | `SOLANA_DEV_WALLET.sec` | `turbin3-prereqs/ts/dev-wallet.json` |

### Round 2 — D:\CRITICAL_BACKUP
| # | File | Source |
|---|------|--------|
| 8 | `GITHUB_PAT_AEGISFORGE.sec` | CRITICAL_BACKUP |
| 9 | `PHASEPORT_METAMASK_PRIVKEY.sec` | CRITICAL_BACKUP |
| 10 | `PHASEPORT_ALCHEMY_BASE_KEY.sec` | CRITICAL_BACKUP |
| 11 | `PHASEPORT_BASESCAN_KEY.sec` | CRITICAL_BACKUP |
| 12 | `KRATOS_OPENROUTER_KEY.sec` | CRITICAL_BACKUP |
| 13 | `BANKR_API_KEY.sec` | CRITICAL_BACKUP |
| 14 | `OPENAI_PERSONAL_VAULT_KEY.sec` | CRITICAL_BACKUP |

### Round 3 — D:\SecureVault
| # | File | Source |
|---|------|--------|
| 15 | `ETHERSCAN_API_KEY.sec` | SecureVault |
| 16 | `WHALE_PG_PASSWORD.sec` | SecureVault |
| 17 | `EVM_PRIVKEY_CHATGPT_MAY5.sec` | SecureVault |
| 18 | `EVM_PRIVKEY_CHATGPT_FRUST1.sec` | SecureVault |
| 19 | `EVM_PRIVKEY_CHATGPT_FRUST2.sec` | SecureVault |
| 20 | `EVM_PRIVKEY_CHATGPT_WARPCAST.sec` | SecureVault |
| 21 | `EVM_PRIVKEY_COPILOT_1.sec` | SecureVault |
| 22 | `EVM_PRIVKEY_COPILOT_2.sec` | SecureVault |
| 23 | `EVM_PRIVKEY_COPILOT_3.sec` | SecureVault |
| 24 | `EVM_PRIVKEY_COPILOT_4.sec` | SecureVault |
| 25 | `EVM_PRIVKEY_COPILOT_5.sec` | SecureVault |
| 26 | `OPENAI_REFRESH_TOKEN.sec` | SecureVault |

### Round 4 — Seeds & Passwords
| # | File | Source |
|---|------|--------|
| 27 | `SEED_PHRASE_BRAVO.sec` | User-provided |
| 28 | `SEED_PHRASE_FRAME.sec` | User-provided |
| 29 | `KEEPASS_MASTER_PASSWORD.sec` | User-provided |
| 30 | `KEEPASS_EXTRA_PASSWORD.sec` | User-provided |

### Round 5 — Logos Keyring
| # | File | Source |
|---|------|--------|
| 31 | `LOGOS_VENICE_API_KEY.sec` | Logos DPAPI keyring |
| 32 | `LOGOS_ALCHEMY_API_KEY.sec` | Logos DPAPI keyring |
| 33 | `LOGOS_EVM_PRIVATE_KEY.sec` | Logos DPAPI keyring |
| 34 | `LOGOS_SOLANA_PRIVATE_KEY.sec` | Logos DPAPI keyring |
| 35 | `LOGOS_LOGOS_GATEWAY_KEY.sec` | Logos DPAPI keyring |
| 36 | `LOGOS_LOGOS_GATEWAY_KEY_2.sec` | Logos DPAPI keyring |
| 37 | `LOGOS_GROQ_API_KEY.sec` | Logos DPAPI keyring |
| 38 | `LOGOS_OPENROUTER_API_KEY.sec` | Logos DPAPI keyring |
| 39 | `LOGOS_GITHUB_TOKEN.sec` | Logos DPAPI keyring |
| 40 | `LOGOS_HUGGINGFACE_TOKEN.sec` | Logos DPAPI keyring |
| 41 | `LOGOS_OPENAI_API_KEY.sec` | Logos DPAPI keyring |
| 42 | `LOGOS_OPENAI_ADMIN_KEY.sec` | Logos DPAPI keyring |
| 43 | `LOGOS_TESTNET_WALLET_KEY.sec` | Logos DPAPI keyring |

### Round 6 — Docker / Container
| # | File | Source |
|---|------|--------|
| 44 | `PRESEARCH_REGISTRATION_CODE.sec` | presearch-node container env |
| 45 | `DOCKER_HUB_PAT.sec` | docker-credential-desktop |
| 46 | `GHCR_OAUTH_TOKEN.sec` | docker-credential-desktop |
| 47 | `ELIZAOS_DOCKER_IMAGE_SHA.sec` | Docker image inspect |

---

## 15. Plaintext Exposure Report (Still Active)

| # | File | What's Exposed | Risk | Recommended Fix |
|---|------|---------------|------|----------------|
| 1 | `.continue/config.yaml` | Venice admin key (×3 entries) + OpenRouter key | **HIGH** | Replace with env var refs or `$VAULT:` |
| 2 | `.codex/auth.json` | OpenAI project key | **HIGH** | Use `$OPENAI_API_KEY` env var |
| 3 | `logos/workspace/google_passwords.csv` | 11 Google passwords in FULL PLAINTEXT | **CRITICAL** | Delete file or encrypt |
| 4 | `logos/workspace/proxy_config.json` | Solana private key + Alchemy key | **HIGH** | Replace with vault refs |
| 5 | `turbin3-prereqs/ts/dev-wallet.json` (×3 copies) | Solana 64-byte keypair | **MEDIUM** | Vault or delete |
| 6 | `Classified_Underdog/config.py` | OpenAI key + JWT in comments | **MEDIUM** | Remove from comments |
| 7 | `Desktop/AegisForge/.env` | OpenAI project key | **MEDIUM** | Use vault ref |
| 8 | `openclaw/.env` | Gateway token | **LOW** | Already vaulted, remove plaintext |

---

## ACTIONS NEEDED (Updated)

### Critical
1. **Delete `logos/workspace/google_passwords.csv`** — 11 full plaintext passwords, already logged in encrypted intel
2. **Rotate exposed keys**: Items #1-3 (OpenAI project keys) — plaintext in OneDrive-synced files

### High
3. **Replace plaintext in `.continue/config.yaml`** — Venice admin key + OpenRouter key → env var refs
4. **Replace plaintext in `.codex/auth.json`** — OpenAI key → env var
5. **Clean `logos/workspace/proxy_config.json`** — Solana privkey + Alchemy key → vault refs

### Medium
6. **Vault Solana dev-wallet.json** — 3 identical copies with plaintext keypair
7. **Clean comment-embedded keys** in `Classified_Underdog/config.py`
8. **Check GitHub Copilot OAuth freshness** — Item #20

### Low
9. **Presearch node**: Update image or stop if abandoned
10. **gateway-proxy**: Investigate dead relay target (port 62133)
11. **hub-54465 K8s context**: Fix RBAC or remove stale context
12. **nThisIsATypo profile**: Investigate orphaned profile origin

### Vault Maintenance
13. **Update VAULT_MANIFEST.md** — currently documents only 7 of 47 .sec files (DONE in Section 14 above)
14. **Cross-verify all 47 .sec files decrypt successfully** — run batch decrypt test

---

*This document is the single source of truth for all credentials on this machine.*
*Companion deep-dives in: DOCKER_INVENTORY.md, SYSTEM_ACCOUNTS.md, PORT_MAP.md, GITHUB_REPOS.md, K8S_CLUSTER.md, ELIZAOS_SOLSCOPE.md*
*Updated by Anvil — 2026-04-12*
