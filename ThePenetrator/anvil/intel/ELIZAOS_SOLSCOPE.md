# ElizaOS / SolScope Agent — Full Extraction
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** Docker image `9e1dead2815e` (solscope), container filesystem extraction
**Classification:** PROJECT ARCHIVE — Nosana bounty submission, deadline April 14 2026

---

## 1. Image Identity

| Field | Value |
|-------|-------|
| Image ID | `9e1dead2815e` |
| Tags | `solscope:latest`, `thetroll888/solscope:latest`, `ghcr.io/thetroll88/solscope:latest` |
| Older Build | `03a4f081410a` (same env structure, different code state) |
| Size | ~2.3 GB |
| Base | Node 23.11.1 (Debian bookworm) |
| Runtime | Bun + pnpm |
| Build Tools | python3, make, g++ (native module compilation) |
| Entrypoint | `docker-entrypoint.sh` |
| CMD | `pnpm start` |
| Workdir | `/app` |
| Port | 3000 |
| Healthcheck | Built-in |
| Image SHA | **VAULTED** → `ELIZAOS_DOCKER_IMAGE_SHA.sec` |

---

## 2. Project Metadata

| Field | Value |
|-------|-------|
| Name | `nosana-eliza-agent` |
| Version | 0.1.0 |
| Author | Nathaniel Crigger |
| Framework | ElizaOS v2 (`@elizaos/core`) |
| Plugins | `@elizaos/plugin-anthropic`, `@elizaos/plugin-bootstrap`, `@elizaos/plugin-openai` |
| GitHub Repo | `TheTroll88/agent-challenge` |
| Git Branch | `elizaos-challenge` |
| Bounty | Nosana SuperTeam — $3,000 USDC prize (top 10) |
| Deadline | **April 14, 2026** |
| Submission | Full text in SUBMISSION.md |

---

## 3. Character Definition

| Field | Value |
|-------|-------|
| Name | SolScope |
| Tagline | "Bloomberg Terminal of Solana" |
| Model Provider | openai (routed to Nosana GPU) |
| Model | Qwen3.5-27B-AWQ-4bit |
| Bio | Solana market intel + wallet analysis + network health |
| Topics | Solana, DeFi, NFTs, token analysis, wallet tracking, network health, Jupiter, Raydium, Marinade, Tensor |

### Style Rules (from character config)
- Lead with data, not opinions
- Always cite sources
- Use real numbers, not approximations
- Format for readability
- Never give financial advice
- Be direct and concise

---

## 4. Plugin Actions (6 Solana tools)

| # | Action | Description | API Source |
|---|--------|-------------|-----------|
| 1 | `WALLET_BALANCE` | Get SOL + SPL token balances for any wallet | Solana RPC (mainnet-beta) |
| 2 | `TOKEN_PRICE` | Get token price via Jupiter Pricing API | `https://api.jup.ag/price/v2` |
| 3 | `TRANSACTION_LOOKUP` | Look up transaction details by signature | Solana RPC |
| 4 | `NETWORK_HEALTH` | Get cluster health, TPS, epoch info | Solana RPC |
| 5 | `TOP_TOKENS` | Get top tokens by volume from Jupiter | Jupiter Stats API |
| 6 | `NOSANA_STATUS` | Check Nosana network/node status | Nosana API |

### Implementation Details
- All RPC calls have retry logic (3 retries, 2s delays)
- Connection timeout: 30 seconds
- Commitment level: "confirmed"
- Error handling: graceful degradation with user-facing messages
- Author tag: `@author Nathaniel Crigger`
- File: `/app/src/index.ts` (22KB TypeScript)

---

## 5. Nosana Job Definition

| Field | Value |
|-------|-------|
| Endpoint | `https://6vq2bcq...v2x.node.k8s.prd.nos.ci/v1` |
| Model | `Qwen3.5-27B-AWQ-4bit` |
| OPENAI_API_KEY | `nosana` (placeholder — Nosana provides inference) |
| OPENAI_BASE_URL | Same as endpoint |
| SOLANA_RPC_URL | `https://api.mainnet-beta.solana.com` |
| Image | `ghcr.io/thetroll88/solscope:latest` |
| GPU | Nosana GPU cluster |

---

## 6. Continuity State (from container)

### Process Snapshot
| Field | Value |
|-------|-------|
| Agent | SolScope |
| Branch | elizaos-challenge |
| Phase | Build & Test |
| Build Status | Docker image built and pushed |
| Docker Push | `thetroll888/solscope:latest` + `ghcr.io/thetroll88/solscope:latest` |

### Progress Checklist (from state.md)
- [x] Character definition
- [x] Plugin implementation (6 actions)
- [x] Docker build
- [x] Docker push (Docker Hub + GHCR)
- [x] Nosana job definition
- [x] Submission document
- [ ] Live demo verification
- [ ] Final submission to SuperTeam

---

## 7. File Inventory (from container /app/)

| Path | Type | Size | Notes |
|------|------|------|-------|
| `package.json` | Config | ~1KB | Dependencies + metadata |
| `SUBMISSION.md` | Doc | ~3KB | Full SuperTeam submission text |
| `.build-state.md` | Doc | ~2KB | Build continuity anchor |
| `characters/agent.character.json` | Config | ~5KB | Full SolScope character |
| `src/index.ts` | Source | 22KB | Main plugin — 6 Solana actions |
| `.continuity/state.json` | State | ~2KB | Process snapshot + inventory |
| `.continuity/state.md` | State | ~1KB | Git state + progress |
| `.continuity/daemon.ps1` | Script | 8.6KB | Continuity daemon |
| `.continuity/daemon.log` | Log | 62KB | Daemon execution log |
| `nos_job_def/nosana_eliza_job_definition.json` | Config | ~1KB | Nosana GPU job spec |
| `.eliza/` | Data | dirs | ElizaOS runtime data |
| `assets/` | Static | — | Project assets |
| `data/` | Data | — | Runtime data directory |
| `node_modules/` | Deps | Large | NPM dependencies |
| `.env` | — | **NOT PRESENT** | Properly excluded from Docker build |

---

## 8. Security Notes

| Check | Result |
|-------|--------|
| `.env` baked into image? | **NO** — properly dockerignored |
| API keys in image? | **NO** — uses env vars at runtime |
| Nosana endpoint key | `nosana` (placeholder, not a real secret) |
| Solana RPC | Public mainnet-beta endpoint (no auth) |
| Image signed? | No — standard Docker Hub push |

---

*Cross-reference: DOCKER_INVENTORY.md Section 3 Items #6-9 (solscope images)*
*Cross-reference: MASTER_CREDENTIAL_INVENTORY.md Item #51 (Nosana endpoint)*
*Cross-reference: GITHUB_REPOS.md Item #5 (agent-challenge repo)*
