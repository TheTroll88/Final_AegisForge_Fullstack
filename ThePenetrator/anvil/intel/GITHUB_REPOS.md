# GitHub Repositories & Remote Assets
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** `gh repo list TheTroll88`, GitHub API
**Classification:** REFERENCE — public repo metadata

---

## 1. GitHub Account

| Field | Value |
|-------|-------|
| Username | `TheTroll88` |
| Auth Method | SSH (ed25519 key `nate@windows`) + GitHub CLI (`gh`) |
| SSH Key | `~/.ssh/id_ed25519` (vaulted reference in MASTER_CREDENTIAL_INVENTORY #23-24) |
| Copilot OAuth | `gho_kMqz5R05...1ZH6UX` (MASTER_CREDENTIAL_INVENTORY #20) |
| GHCR OAuth | vaulted as `GHCR_OAUTH_TOKEN.sec` |
| Docker Hub | `thetroll888` — PAT vaulted as `DOCKER_HUB_PAT.sec` |

---

## 2. Repositories (11)

| # | Name | Visibility | Description | Status | Local Path(s) |
|---|------|-----------|-------------|--------|--------------|
| 1 | `Plutus` | Public | Crypto/DeFi project | Active | `~/Desktop/Grand Idea/Plutus/` (MISSING — deleted or moved) |
| 2 | `HACKING-BOT` | Public | Security research bot | Active | `~/Desktop/Grand Idea/HACKING-BOT/` (MISSING) |
| 3 | `sol-faucet-runner` | Public | Solana faucet automation | Active | Part of aegis-chain tooling |
| 4 | `aegis-yield-vault` | Public | Aegis DeFi yield vault | Active | Related to aegis-chain |
| 5 | `agent-challenge` | Public | Nosana ElizaOS agent challenge | Active | `~/nosana-agent-challenge/` + Docker image `solscope` |
| 6 | `foreman-instance` | Public | Foreman agent instance | Active | `~/OneDrive/GitHub/Foreman-Instance/` |
| 7 | `foreman-labs` | Public | Foreman development lab | Active | `~/OneDrive/GitHub/Foreman-Company/` |
| 8 | `shadowtrader` | Public | Trading bot | Active | Related to aegis-chain |
| 9 | `AegisForge` | **PRIVATE** | Aegis infrastructure forge | Active | `~/AegisForge/` + `~/Desktop/AegisForge/` + `~/OneDrive/GitHub/AegisForge/` |
| 10 | `tools` | Public | LITCOIN fleet tools (generic) | Active | `~/tools/` |
| 11 | `asig-token-site` | Public | ASIG token website | Active | Token site with contact compliance |

---

## 3. Local Repos NOT on GitHub

These exist locally but have no matching GitHub remote (or use different remotes):

| Path | Description | Git Remote |
|------|-------------|-----------|
| `~/OneDrive/ThePenetrator/` | Master multi-agent workspace | No public remote |
| `~/OneDrive/GitHub/aegis-ai/` | Aegis AI core | May have remote (not in `gh repo list`) |
| `~/OneDrive/GitHub/aegis-chain/` | Aegis blockchain tools | May have remote |
| `~/OneDrive/GitHub/LogosBrowser/` | Logos browser extension | Local only |
| `~/OneDrive/GitHub/local-assistant/` | Local AI assistant | Local only |
| `~/OneDrive/GitHub/v4w_website/` | V4W website | Local only |
| `~/OneDrive/GitHub/AWS_Prompt_Challenge/` | AWS prompt challenge | Local only |
| `~/OneDrive/GitHub/Airdrop_Farmer/` | Airdrop automation | Local only |
| `~/base-explorer/` | Base chain explorer | Local only |
| `~/aegis-chain/` | Aegis chain (local copy) | May be secondary |
| `~/wallet-bridge/` | VS Code wallet bridge | Local only |
| `~/honeypot-lab/` | Honeypot research | Local only |
| `~/turbin3-prereqs/` | Solana Turbin3 bootcamp | Local only |
| `~/openclaw/` | OpenClaw install | Local only |
| `~/logos/` | Old Logos standalone | Local only |
| `~/v4w_website/` | V4W website (duplicate?) | Local only |

---

## 4. Docker Hub / GHCR Published Images

| Registry | Image | Tags | Source Repo |
|----------|-------|------|------------|
| Docker Hub | `thetroll888/solscope` | latest + older build | `agent-challenge` |
| GHCR | `ghcr.io/thetroll88/solscope` | latest | `agent-challenge` |

---

## 5. Key Integrations

| Integration | Account | Config Location |
|------------|---------|----------------|
| GitHub SSH | TheTroll88 | `~/.ssh/id_ed25519` |
| GitHub CLI (gh) | TheTroll88 | `~/.config/gh/` |
| GitHub Copilot | TheTroll88 | `~/.cli-proxy-api/github-copilot.json` |
| Docker Hub | thetroll888 | Docker Desktop credsStore |
| GHCR | TheTroll88 | Docker Desktop credsStore |
| gcloud | nathanielcrigger66 | `~/.config/gcloud/` |
| Ollama | Nates_PC | `~/.ollama/id_ed25519` |

---

*Cross-reference: MASTER_CREDENTIAL_INVENTORY.md Sections 2-3 (OAuth, SSH)*
*Cross-reference: ELIZAOS_SOLSCOPE.md for agent-challenge deep-dive*
