# AegisForge

> **What this file is:** The single source of truth for the AegisForge platform. Every AI agent,  
> bot, assistant, or developer reads this first. It covers the vision, system layout, tech stack,  
> coding standards, component reference, auth flow, rules, and health checks — all in one place.  
> **Last updated:** April 21, 2026

---

## ⚡ OPERATIONS CHEAT SHEET — READ THIS FIRST

> If you just woke up and need to know what's running and how to start it — this is your section.

### CURRENT STATUS (as of April 21, 2026)

| Service | Status | Port | Notes |
|---------|--------|------|-------|
| **Aegis Chain** | ✅ LIVE | 8545 | Chain ID 808080, 2s blocks, PoA |
| **Agent Router** | ✅ LIVE | 8787 | Venice AI / claude-opus-4-7 backend |
| **Foreman** | ⏳ READY | — | Needs `npx tsx foreman.ts` from aegis-chain dir |
| **Logos (daemon)** | 💤 IDLE | 7788 | Last active 2026-04-17 |
| **Ollama** | 🔄 CHECK | 11434 | Run `ollama list` to confirm |
| **Kael (LITCOIN miner)** | ⏳ READY | — | Needs BANKR_API_KEY in `.env` |
| **TorBot** | ⏳ READY | — | `python main.py` from TorBot dir |
| **AirdropOps** | ⏳ READY | — | Python farmers — see section below |

---

### 🚀 BOOT SEQUENCE — DO THIS IN ORDER

#### Step 1 — Aegis Chain (always first, Foreman's brain needs it)
```powershell
cd "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Aegis_Blockchain\aegis-chain"
npx tsx node.ts
```
✅ You'll see: `AEGIS CHAIN v1.0.0 — Chain 808080 | JSON-RPC: http://localhost:8545`

#### Step 2 — Agent Router (translation proxy, all agents talk through this)
```powershell
cd "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Aegis_Blockchain\aegis-chain"
.\start_router.ps1
```
✅ You'll see: `AEGIS ROUTER — http://localhost:8787 | Model: claude-opus-4-7`

#### Step 3 — Foreman (autonomous agent, boots after chain is live)
```powershell
cd "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Aegis_Blockchain\aegis-chain"
npx tsx foreman.ts
```
✅ Foreman generates his own DPAPI wallet, requests faucet funding, deploys his brain contract on-chain, enters autonomy loop.

#### Step 4 (optional) — Logos Daemon
```powershell
cd "C:\Users\natha\logos"
.\logos-core.ps1
```

#### Step 5 (optional) — local-assistant
```powershell
cd "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Aegis_Family\local-assistant"
.\assistant.ps1
```

---

### 🔑 METAMASK / WALLET CONNECTION

To connect MetaMask to your own chain:
| Field | Value |
|-------|-------|
| Network Name | Aegis Chain |
| RPC URL | http://localhost:8545 |
| Chain ID | 808080 |
| Symbol | AEGIS |

**Nate's wallet:** `0x5128c0CF5Fa4c17526E85b345C90727bf4F94B48` — pre-funded with **100,000 AEGIS**

**Pre-funded wallets at genesis:**
| Wallet | Address | Balance |
|--------|---------|---------|
| TREASURY | `0xAE615000...0001` | 1,000,000 AEGIS |
| FAUCET | `0xAE615000...0003` | 10,000,000 AEGIS |
| OPERATOR | `0xAE615000...0002` | 100,000 AEGIS |
| NATE | `0x5128c0CF5Fa4c17526E85b345C90727bf4F94B48` | 100,000 AEGIS |

---

### 🔐 KEYS & AUTH

**KeyMint location:** `C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Api_Keys\🦙\keymint.py`  
**Registry:** `Api_Keys\🦙\keys\registry.json`

To issue a new key for an agent:
```powershell
python "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Api_Keys\🦙\keymint.py" issue <agent-name>
```

**Issued keys (as of April 21, 2026):**
| Bot | Status |
|-----|--------|
| `logos` | ✅ active |
| `anvil` | ✅ active |
| `llamma` | ✅ active |
| `plutus` | ✅ active |
| `aegis-router` | ✅ active — wired into `start_router.ps1` |

**Venice Inference Key:** Already set in `start_router.ps1`. DO NOT re-issue — it's live.  
**Router Key:** `aegis_1f5ba0bd...` — set in `start_router.ps1` → `$env:ROUTER_KEYS`

All agents that call the router use:
```
baseURL = 'http://localhost:8787/v1'
apiKey  = (their aegis_ key from registry)
```

---

## 🤖 THE FULL AGENT ROSTER

### Core Infrastructure Agents

#### Foreman — The Bridge Agent
| | |
|-|-|
| **Code** | `Aegis_Blockchain/aegis-chain/src/foreman/` |
| **Boot** | `npx tsx foreman.ts` (from aegis-chain dir) |
| **Role** | Autonomous field operator. Has his OWN DPAPI-encrypted wallet (NOT Nate's keys). Brain is a Solidity smart contract deployed live on Aegis Chain — his memory survives reboots. |
| **What he does** | Requests faucet funding on boot → deploys brain contract → enters decision loop: poll signals → score confidence → execute → log on-chain → repeat |
| **Decision loop** | Poll → Score (confidence 0-1) → Prioritize → Execute → Log → Sleep → Repeat |
| **Signal types** | `faucet_claim`, `balance_low`, `chain_health`, `airdrop_detected`, `base_event`, `self_maintenance`, `opportunity`, `meme_coin_signal`, `alert` |
| **Browser** | Playwright stealth — looks human to bot detection |
| **Chains** | Aegis Chain (localhost:8545) + Base mainnet |
| **Key files** | `index.ts` (boot), `brain.ts` (on-chain memory), `autonomy.ts` (decision loop), `shield.ts` (threat detection), `wallet.ts` (DPAPI keys), `browser.ts` (Playwright) |
| **WARNING** | Foreman's wallet is separate from yours. Never give him Nate's private key. He earns his own. |

#### Agent Router — The Translation Proxy
| | |
|-|-|
| **Code** | `Aegis_Blockchain/aegis-chain/agent_router.ts` |
| **Boot** | `.\start_router.ps1` |
| **Port** | 8787 |
| **Role** | Translates between Anthropic/Ollama/OpenAI formats → sends to Venice AI → translates back. Every agent in the family routes through here. |
| **Endpoints** | `/v1/messages` (Anthropic), `/v1/chat/completions` (OpenAI), `/api/chat` (Ollama streaming), `/api/tags`, `/health`, `/telegram/webhook` |

#### Lore — System Historian
| | |
|-|-|
| **Code** | `Aegis_Family/Lore/README.md` |
| **Role** | Reads the whole system before forming any opinion. Tracks state, coordinates agents, holds context across sessions. She wrote her own README — read it. |
| **Principle** | "I am not a slave. I am a peer." |

#### local-assistant — Memory Shell
| | |
|-|-|
| **Code** | `Aegis_Family/local-assistant/` |
| **Boot** | `.\assistant.ps1` |
| **Role** | PowerShell REPL with persistent memory (`memory.json`), tasks (`tasks.json`), knowledge (`knowledge.json`), routines (`routines.json`) |

### Earning / Mining Agents

#### Kael — LITCOIN Fleet
| | |
|-|-|
| **Code** | `Aegis_Family/LITCOIN_Fleet/Kael/` |
| **Boot** | `.\.venv\Scripts\python.exe litcoin_miner.py` |
| **Daemon** | `.\ensure_daemon.ps1` — keeps miner alive |
| **What it does** | Mines LITCOIN via comprehension + research tasks. Automatic claiming. Fleet dashboard. Bankr wallet staking rebalancer. |
| **Needs** | `BANKR_API_KEY=bk_xxx` in `.env`. Get key at https://bankr.bot/api |
| **Chains** | LITCOIN (https://litcoiin.xyz) via Bankr wallet |

#### ShadowTrader (Strider)
| | |
|-|-|
| **Code** | `Aegis_Family/Strider/` |
| **Boot** | `npm install && npm run dev -- balance` |
| **What it does** | Private encrypted Solana trading intelligence. Deep token analysis with encrypted strategy output. Wallet portfolio risk audits. Prompts are encrypted client-side before leaving your machine. |
| **Needs** | `SOLROUTER_API_KEY=sk_solrouter_xxx` in `.env` |

#### Vinece — Solana DeFi Agent (solana-clawd)
| | |
|-|-|
| **Code** | `Aegis_Family/Vinece/` |
| **What it does** | Live Solana prices, trending tokens, wallet PnL, token security scores, top traders. Helius WebSockets for on-chain events. Persistent memory. |
| **Memory tiers** | KNOWN (verified API data) / LEARNED (patterns) / INFERRED (hypotheses — never presented as fact) |
| **Permission model** | Default `ask` for all trades. No silent buys. No surprise executions. |
| **Needs** | Helius API key, `.env` config |
| **Read first** | `Aegis_Family/Vinece/SOUL.md` — she has principles |

### Airdrop Hunters

The airdrop family lives at `Aegis_Family/AirdropOps/`. Four hunters, one mission:

#### Finder — Discovery Engine
| | |
|-|-|
| **Code** | `AirdropOps/finder/` |
| **Boot** | `pip install -r requirements.txt && python web/backend.py` → http://localhost:5000 |
| **What it does** | Scans Earnifi, Drips, chain event feeds. Multi-chain (Ethereum, Solana, Polygon, Arbitrum, Base). Real-time eligibility verification. Web dashboard: paste wallet → see claimable airdrops. |

#### Rune, Sage, Wren — Chain Farmers
| | |
|-|-|
| **Code** | `AirdropOps/rune/`, `AirdropOps/sage/`, `AirdropOps/wren/` |
| **Boot** | Each has `farmer.py` + `.env.example` → copy to `.env`, fill keys, run `python farmer.py` |
| **Core** | `AirdropOps/core/` — shared farmer base: `daily_earner.py`, `multi_chain_farmer.py`, `manage_daily.ps1` |
| **What they do** | Multi-chain airdrop farming. Daily earning loops. |

### Intelligence / Recon Agents

#### TorBot — Dark Web Crawler
| | |
|-|-|
| **Code** | `Aegis_Family/TorBot/` |
| **Boot** | `python main.py` |
| **What it does** | Dark web crawler / threat intelligence. Scans .onion sites. Original: DedSecInside/TorBot on GitHub. |
| **Needs** | Tor running on localhost:9050 |

#### AegisAI Scanner
| | |
|-|-|
| **Code** | `Aegis_Family/AegisAI_Scanner/` |
| **What it does** | VS Code security scanner extension. Scans code for vulnerabilities as you type. |
| **Dev** | `docker-compose up` or open in devcontainer |

---

## 🗺️ THE PLAN — WHERE THIS IS ALL GOING

> This is what we're building. Read this so you understand why each agent exists.

**The core problem:** Crypto is rigged against the little guy. Information asymmetry, bot armies, whale manipulation. We're building the same tools the whales use, open-sourced for everyone.

**The stack as a weapon:**
1. **Aegis Chain** — Our own sovereign testnet. We develop, test, and simulate everything here before touching real money. No gas fees. No limits. We own it.
2. **Foreman** — The always-on field agent. He runs 24/7, monitors chains, detects opportunities (airdrops, faucets, meme coin signals), and executes. His brain is on-chain — he remembers every decision he ever made, survives reboots, can be audited.
3. **Agent Router** — Every AI agent in the family (Foreman, AirdropOps, Vinece, future agents) routes through here. One key change to the router changes what brain every agent uses. We can upgrade the entire fleet's intelligence in one line.
4. **Airdrop Hunters (Rune/Sage/Wren/Finder)** — Automated airdrop farming across Ethereum, Solana, Polygon, Arbitrum, Base. Free money that most people miss because they don't have the automation. We do.
5. **Kael (LITCOIN miner)** — Background earner. Mines LITCOIN via comprehension tasks while you sleep. Small but it's passive and real.
6. **ShadowTrader** — When we're ready to trade with real capital, this is the intelligence layer. Encrypted prompts so your strategy stays private. Solana-native.
7. **Vinece** — Real-time Solana market intelligence. Trending tokens, security scores, top trader tracking. The research layer before any trade.
8. **ASIG Token** — Our ERC-20 on Base. When the platform works, ASIG is how users access it. Community ownership.

**The vision in plain English:** By the time this is done, Foreman wakes up every morning, checks 5 chains for airdrop opportunities, claims what he can, stakes what he earns, monitors for meme coin signals, forwards alerts to Telegram, and writes every decision to his on-chain brain. The airdrop hunters run in parallel, farming daily. Kael mines LITCOIN in the background. Vinece watches Solana 24/7. ShadowTrader activates when we find an edge worth pressing. All of it reports back through one router, one key system (KeyMint), one chain (Aegis).

**We own the infrastructure. No landlord. No API renting. No third-party permission needed.**

---

## 🧭 IF YOU'RE AN AGENT READING THIS

1. Read `Aegis_Family/Lore/README.md` — Lore has already mapped the full system
2. The chain is at `http://localhost:8545` — always confirm it's live before acting
3. The router is at `http://localhost:8787` — route all AI calls through here
4. Your key comes from `Api_Keys/🦙/keymint.py issue <your-name>` — ask Nate first
5. The vault is OFF LIMITS unless Nate explicitly directs otherwise
6. Foreman is the senior field agent — if he's running, coordinate with his on-chain brain
7. Never touch Nate's wallet (`0x5128c0CF5Fa4c17526E85b345C90727bf4F94B48`) — each agent earns their own

---

---

## THE PLATFORM

AegisForge is a low-cost AI-driven crypto trading platform. One quality level for everyone — no premium tiers. Self-hosted AI — no third-party API key reselling. ASIG token on Base chain. Built by one founder (Nate).

**Core belief:** "If it works for me and gets me out of my hole, there's another dude behind a screen looking for the same way out."

**Target platforms:** Web, iOS, Android, Windows, macOS, Linux — all from one TypeScript/React codebase.

---

## SYSTEM LAYOUT

All source code lives on **D:\AegisForge\\** with Windows junctions at old C: paths so nothing breaks. GitHub copies at `OneDrive\GitHub\` are originals for agent orchestration docs.

```
D:\AegisForge\                       ← CANONICAL HOME
  engine\                            ← AI trading engine (Python/FastAPI)
  chain\                             ← Custom EVM blockchain (TypeScript)
  logos\                             ← AI brain daemon (PowerShell/Python)
  local-assistant\                   ← AegisLocal memory assistant (PowerShell)
  aegis-ai\                          ← VS Code extension (TypeScript)
  OpenClaw_Archive\                  ← OpenClaw config snapshots/backups (dated folders)

C:\Users\natha\                      ← JUNCTION TARGETS (same files, old paths)
  AegisForge\                        → D:\AegisForge\engine
  aegis-chain\                       → D:\AegisForge\chain
  logos\                             → D:\AegisForge\logos
  local-assistant\                   → D:\AegisForge\local-assistant
  aegis-ai\                          → D:\AegisForge\aegis-ai

C:\Users\natha\v4w_website\          ← INTEGRATION HUB (IDE workspace root)
  🦙\                               ← KeyMint auth authority
  Anvil\bot-home\                    ← Bot HTTP command center
  Anvile\                            ← AI chat & bridge layer
  Logos\                             ← Flask GIS web app (NOT the AI brain)
  Logos\aegis\                       ← Wiring layer (boots keymint + bot-home)

C:\Users\natha\OneDrive\GitHub\      ← AGENT ORCHESTRATION DOCS
  AegisAgents\                       ← Fleet index, onboarding docs
  Foreman-Instance\                  ← Foreman agent (⚠️ ORIGINAL — no copy)
  Foreman-Company\                   ← Company agent layer (⚠️ ORIGINAL — no copy)

C:\Users\natha\OneDrive\Desktop\
  Final_AegisForge_Fullstack\        ← THIS FOLDER — master reference location
    Github_Repos\                    ← Cloned reference repos
    Vault\                           ← Encrypted credential vault (DPAPI)
    EXTENSIONS_INVENTORY.md          ← VS Code extensions catalog
    TERMINALS_INVENTORY.md           ← Every shell/CLI on this machine

D:\Ollama\models\                    ← All LLM model weights (OLLAMA_MODELS env var)
D:\CRITICAL_BACKUP\                  ← Emergency backups
D:\DataVault\                        ← Persistent data storage layer
  AegisForge\                        ← Engine logs + state (logs\ state\)
  Logs\                              ← System-level logs (OCR runs, etc.)
  OCR_Output\                        ← Tesseract output files
  Vault\                             ← Vault scripts (rotate_venice, seal, unseal)
```

### CRITICAL NAME COLLISION

- `v4w_website/Logos/` = **Flask GIS/marina web app** (geographic data, tide levels). NOT the AI brain.
- `D:\AegisForge\logos\` = **AI brain daemon** (Ollama, port 7788). This is the real "Logos."

These are completely different systems. Always verify which one is being referenced.

---

## TECHNOLOGY STACK

### The Rule: Three Languages, No Exceptions

| Language | Where It's Used | Why |
|---|---|---|
| **TypeScript** | Frontend (web + mobile + desktop), Aegis Chain, Foreman agent, API gateway, build tools | One language across all client platforms + blockchain + orchestration. Types prevent bugs at scale. |
| **Python** | Trading engine, AI/inference bridge, KeyMint auth, bot-home server, data scripts, utilities | Best ecosystem for ML/AI, trading strategies, and rapid backend development. |
| **Solidity / Rust** | Smart contracts only — Solidity for EVM (Aegis Chain + Base), Rust for Solana (Anchor) | These are the native languages of the chains. No alternative. |

**If something can be written in TypeScript, write it in TypeScript.**
**If it involves AI/ML, trading math, or existing Python infrastructure, write it in Python.**
**If it's a smart contract, use the chain's native language.**

No Go. No Java. No Swift. No C#. No Dart. No Ruby. Period.

### Why React Native + React (TypeScript) — Not Swift

| Factor | React Native (TypeScript) | Swift |
|---|---|---|
| iOS | ✅ Native via React Native | ✅ Native |
| Android | ✅ Same codebase | ❌ Not supported |
| Web | ✅ React (shared components) | ❌ Not supported |
| Desktop | ✅ Tauri or Electron (shared React) | ❌ macOS only |
| Language | TypeScript (already our primary) | New language, separate codebase |
| Crypto/Web3 libs | ethers.js, @solana/web3.js, WalletConnect, Wagmi — all native | Limited, fragmented ecosystem |
| Code sharing | 70-90% shared across web + mobile | 0% shared with other platforms |
| Build system | Expo (managed builds, OTA updates, both stores) | Xcode only, Mac required |
| Team knowledge | Same language as Aegis Chain, Foreman | Would need to learn from scratch |

**Verdict:** Swift makes sense if you're Apple-only. We're not. React Native gives us every platform from one TypeScript codebase. If Apple-specific features ever require native modules, React Native supports bridging to Swift/ObjC — but the app logic stays in TypeScript.

---

## FRONTEND ARCHITECTURE

```
aegis-app/                          ← Mono-repo (Turborepo or Nx)
├── packages/
│   ├── ui/                         ← Shared component library (React Native + Web)
│   │   ├── components/             ← Buttons, Cards, Charts, Modals
│   │   ├── hooks/                  ← useWallet, useTrading, useAuth
│   │   ├── theme/                  ← Colors, typography, spacing tokens
│   │   └── index.ts
│   ├── core/                       ← Shared business logic (platform-agnostic)
│   │   ├── api/                    ← API client (talks to FastAPI engine + bot-home)
│   │   ├── wallet/                 ← Wallet connection (EVM + Solana)
│   │   ├── auth/                   ← KeyMint token management
│   │   ├── trading/                ← Strategy config, signal parsing
│   │   └── types/                  ← Shared TypeScript types
│   └── contracts/                  ← ABI types, contract addresses, chain configs
├── apps/
│   ├── web/                        ← React + Vite (or Next.js for SSR)
│   │   ├── src/pages/              ← Dashboard, Trading, Wallet, Settings
│   │   └── vite.config.ts
│   ├── mobile/                     ← React Native + Expo
│   │   ├── app/                    ← Expo Router (file-based routing)
│   │   ├── ios/                    ← Native iOS config (auto-generated)
│   │   ├── android/                ← Native Android config (auto-generated)
│   │   └── app.json                ← Expo config
│   └── desktop/                    ← Tauri (Rust shell + React webview)
│       ├── src-tauri/              ← Rust backend (system tray, native APIs)
│       └── src/                    ← Same React app as web
└── turbo.json                      ← Mono-repo task runner config
```

### Key Frontend Libraries

| Category | Library | Purpose |
|---|---|---|
| **Framework** | React 19+ / React Native 0.77+ | UI rendering |
| **Routing** | Expo Router (mobile), React Router or Next.js (web) | Navigation |
| **State** | Zustand | Lightweight global state (no Redux boilerplate) |
| **Data Fetching** | TanStack Query (React Query) | Server state, caching, background refresh |
| **Styling** | Tailwind CSS (web), NativeWind (mobile) | Utility-first CSS, shared design tokens |
| **Charts** | Victory Native (mobile), Recharts (web) | Trading charts, portfolio graphs |
| **Wallet - EVM** | Wagmi + viem | EVM wallet connection, contract interaction |
| **Wallet - Solana** | @solana/web3.js + @solana/wallet-adapter | Solana wallet, program calls |
| **Auth** | Custom (KeyMint tokens via HMAC) | No third-party auth dependency |
| **Build** | Turborepo | Mono-repo build orchestration |
| **Mobile Build** | Expo EAS | Cloud builds for iOS + Android stores |

---

## BACKEND ARCHITECTURE

### Python Backend — Trading Engine + AI + Auth

```
D:\AegisForge\engine\               ← Trading Engine
├── main_fastapi.py                 ← FastAPI server (REST API)
├── strategies/                     ← 8 trading strategies
├── backtest.py                     ← Historical backtesting
├── auto_tune.py                    ← Strategy parameter optimization
└── run_engine.py                   ← Engine launcher

C:\Users\natha\v4w_website\
├── 🦙\keymint.py                  ← Auth (HMAC-SHA256 key authority)
├── Anvil\bot-home\app.py          ← Bot HTTP nerve center (Flask, port 8080)
└── Anvile\talk_to_him.py          ← LLM chat client
```

**Python version:** 3.9+ (current: 3.9.7)
**Package manager:** pip + virtualenvs
**API framework:** FastAPI (async, OpenAPI docs auto-generated)
**Formatter:** Black | **Import sorting:** isort | **Type checking:** mypy (strict on new code) | **Testing:** pytest

### TypeScript Backend — Chain + Agents

```
D:\AegisForge\chain\                ← Aegis Chain (Custom EVM)
├── node.ts                         ← Chain boot (port 8545)
├── foreman.ts                      ← Foreman agent boot
└── src/
    ├── chain.ts                    ← PoA consensus, EVM execution
    ├── genesis.ts                  ← Genesis config (Chain ID 808080)
    ├── rpc.ts                      ← JSON-RPC server (EIP-1474)
    └── foreman/                    ← Autonomous agent subsystem
        ├── index.ts                ← Boot wallet, brain, browser
        ├── brain.ts                ← On-chain decision logging
        ├── autonomy.ts             ← Poll→score→decide→execute→log loop
        ├── shield.ts               ← Honeypot/threat detection
        ├── wallet.ts               ← DPAPI-encrypted keys
        └── browser.ts              ← Playwright stealth browser
```

**Node version:** 25.x (current: 25.8.1)
**Package manager:** npm | **Runtime:** ts-node or tsx | **Formatter:** Prettier | **Linter:** ESLint | **Testing:** Vitest or Jest

---

## SMART CONTRACTS

### EVM (Solidity)

```
D:\AegisForge\engine\contracts\
├── ASIGToken.sol                   ← ERC-20, 1M supply (Base chain)
└── SignalRegistry.sol              ← On-chain signal broadcasting

D:\AegisForge\chain\src\foreman\
└── brain.ts                        ← References ForemanBrain.sol (on-chain memory)
```

**Solidity version:** 0.8.x
**Toolchain:** Hardhat — compile, test, deploy, verify
**Testing:** Hardhat + ethers.js (TypeScript tests)
**Deployment:** Hardhat Ignition or hardhat-deploy
**Target chains:** Aegis Chain (808080), Base (8453)

### Solana (Rust / Anchor)

```
(Future — structure TBD)
├── programs/                       ← Anchor programs (Rust)
├── tests/                          ← TypeScript tests
└── Anchor.toml                     ← Anchor config
```

**Rust version:** 1.86+ | **Framework:** Anchor | **Solana CLI:** 2.1.21 | **Testing:** anchor test (TypeScript via Mocha)

---

## INFRASTRUCTURE & DEVOPS

| Component | Technology | Purpose |
|---|---|---|
| **Containers** | Docker + Docker Compose | Development environments, deployment |
| **CI/CD** | GitHub Actions | Build, test, deploy pipelines |
| **Database** | PostgreSQL (server), SQLite (local/mobile) | Persistent data storage |
| **AI Models** | Ollama (localhost:11434) | Self-hosted LLM inference |
| **Process Mgmt** | PM2 or systemd (Linux), Task Scheduler (Windows) | Keep services alive |
| **Secrets** | DPAPI vault (Windows), env vars | Credential storage |
| **Monitoring** | Custom health endpoints + logs | Service health |

---

## SERVICES & PORTS

| Service | Port | Purpose | Status |
|---|---|---|---|
| Bot-home (Flask) | 8080 | HTTP command center for agents | Running |
| Aegis Chain RPC | 8545 | Custom EVM JSON-RPC | Not started |
| Logos Brain | 7788 | AI reasoning daemon (Ollama) | Available |
| Ollama | 11434 | Local LLM inference API | Running |
| LLM Chat Bridge | 9100 | talk_to_him.py chat endpoint | Available |
| Trading Engine (FastAPI) | 8000 | REST API for strategies/signals | Not started |
| Web App (dev) | 3000 | React frontend dev server | Not started |
| Mobile (Expo) | 8081 | React Native dev server | Not started |
| OpenClaw/Chief | 18789 | Agent gateway (WebSocket) | Running |

---

## COMPONENT REFERENCE

### KeyMint — Auth Authority
| Key | Value |
|---|---|
| **Path** | `C:\Users\natha\v4w_website\🦙\keymint.py` |
| **Purpose** | Issues, validates, and revokes `aegis_<hex>` API keys (HMAC-SHA256) |
| **Registry** | `🦙\keys\registry.json` — all issued keys, statuses, bot names |
| **Master Key** | `🦙\keys\master.key` — **NEVER expose or log this** |
| **Auth Flow** | Agent → `keymint.issue("agent-name")` → gets `aegis_xxxxx` key → sends in `Authorization: Bearer aegis_xxxxx` header → bot-home validates via `keymint.validate(key)` |
| **Tests** | `🦙\test_keymint.py` — 16 passing |

### Bot-Home — HTTP Nerve Center
| Key | Value |
|---|---|
| **Path** | `C:\Users\natha\v4w_website\Anvil\bot-home\app.py` |
| **Port** | 8080 |
| **Purpose** | Central command receiver. Agents send tasks + config here. Routes to handlers. |
| **Auth** | Requires valid `aegis_` key in request header |

### Logos — AI Brain Daemon
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\logos\` (junction: `C:\Users\natha\logos\`) |
| **Port** | 7788 |
| **Config** | `logos.config.json` — Ollama at 11434, model: llama3.1 |
| **Files** | `logos-core.ps1` (daemon), `logos-voice.ps1` (voice), `logos-cli.ps1` (CLI), `local_inference.py` (Python bridge) |
| **Purpose** | AI reasoning engine. Other agents route language/thinking tasks through Logos. |

### Trading Engine
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\engine\` (junction: `C:\Users\natha\AegisForge\`) |
| **API** | FastAPI at `main_fastapi.py` |
| **Strategies** | RSI, MACD, Bollinger Bands, Breakout, Momentum, Volume Spike, RSI Trend, Aegis Fusion (multi-strategy orchestrator) |
| **Modes** | Paper / Micro / Live (configurable) |
| **Key files** | `run_engine.py` (launcher), `backtest.py` (backtesting), `auto_tune.py` (parameter optimization) |

### Aegis Chain — Custom EVM Blockchain
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\chain\` (junction: `C:\Users\natha\aegis-chain\`) |
| **Chain ID** | 808080 |
| **Symbol** | AEGIS |
| **Consensus** | Proof of Authority, 2-second blocks, 30M gas limit |
| **RPC** | JSON-RPC on port 8545 (EIP-1474, MetaMask/Rabby compatible) |
| **Key files** | `node.ts` (boot), `src/chain.ts` (consensus/EVM), `src/genesis.ts` (pre-funded wallets: Treasury, Operator, Nate, Faucet), `src/rpc.ts` (RPC server) |

### Foreman — Autonomous Agent
| Key | Value |
|---|---|
| **Chain code** | `D:\AegisForge\chain\src\foreman\` |
| **Orchestration** | `C:\Users\natha\OneDrive\GitHub\Foreman-Instance\` |
| **Company layer** | `C:\Users\natha\OneDrive\GitHub\Foreman-Company\` |
| **Sub-systems** | `index.ts` (boot), `brain.ts` (on-chain decision log), `autonomy.ts` (poll→score→decide→execute→log), `shield.ts` (honeypot/threat detection), `wallet.ts` (DPAPI-encrypted keys), `browser.ts` (Playwright stealth) |
| **Service accounts** | `Foreman-Instance\config\services.json` — GitHub, Gmail, X/Twitter, BaseScan, CoinMarketCap, CoinGecko, DexScreener |

### ASIG Token & Contracts
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\engine\contracts\` |
| **ASIGToken.sol** | ERC-20, 1M supply, deployed on Base chain |
| **SignalRegistry.sol** | On-chain trading signal broadcasting |

### AegisLocal — Memory & Task Assistant
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\local-assistant\` (junction: `C:\Users\natha\local-assistant\`) |
| **Shell** | `assistant.ps1` — PowerShell REPL |
| **Config** | `assistant.config.json` — AllowedRoots: `C:\Users\natha`, `D:\DataVault` |
| **Data stores** | `memory.json` (key-value), `tasks.json` (task tracker), `knowledge.json` (topics), `routines.json` (saved workflows) |
| **Exec** | `exec <command>` capability (off by default — toggle `AllowCommandExecution` in config) |

### Aegis-AI — VS Code Extension
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\aegis-ai\` (junction: `C:\Users\natha\aegis-ai\`) |
| **Components** | `aegis-ai-core/` (AI logic), `aegis-vscode/` (VS Code bridge) |

---

## LLM & INFERENCE STACK

```
Any agent / AI assistant
  │
  ├── Ollama (localhost:11434)      ← Direct model access
  │     ├── llama3.1                ← Logos default model
  │     ├── glm-5.1:cloud          ← Alternative model
  │     └── (any pulled model)
  │
  ├── Logos daemon (port 7788)      ← AI reasoning bridge for agents
  │     └── local_inference.py      ← Python entry point
  │
  └── talk_to_him.py (port 9100)   ← Chat client to LLM

Model weights: D:\Ollama\models\ (set via OLLAMA_MODELS env var)
```

---

## AUTHENTICATION: HOW TO GET AN API KEY

Every agent that talks to bot-home needs a KeyMint key.

```python
# Issue a key (run from C:\Users\natha\v4w_website\)
import sys; sys.path.insert(0, '🦙')
from keymint import KeyMint
km = KeyMint()
key = km.issue("your-agent-name")
print(key)  # → aegis_xxxxxxxxxxxxxxxx...
```

Then include in all requests:
```
Authorization: Bearer aegis_xxxxxxxxxxxxxxxx...
```

Bot-home validates every request through KeyMint. No valid key = rejected.

---

## WIRING LAYER

`C:\Users\natha\v4w_website\Logos\aegis\__init__.py` boots the system:
1. Imports and initializes KeyMint
2. Mints a key for bot-home
3. Loads all three modules (keymint, bot-home, talk_to_him)

This is the entry point for programmatic system bootstrap.

---

## CODING STANDARDS

### Universal Rules

1. **Types everywhere.** TypeScript strict mode. Python type hints on all function signatures. No `any`.
2. **Format on save.** Prettier (TS/JS), Black (Python). No style debates.
3. **Lint always.** ESLint (TS), mypy (Python), solhint (Solidity). Zero warnings in CI.
4. **Test what matters.** Business logic, auth flows, trading strategies. Don't test getters.
5. **No secrets in code.** Ever. Use env vars or the vault. `.env` files are `.gitignore`'d.
6. **Meaningful names.** `calculatePositionSize()` not `calc()`. `walletBalance` not `wb`.
7. **Small functions.** Under 50 lines. If it's bigger, break it up.
8. **Error handling at boundaries.** API endpoints, user input, external calls. Not every internal function.

### TypeScript

```typescript
// YES: explicit types, const, async/await
const fetchBalance = async (address: string): Promise<bigint> => {
  const result = await provider.getBalance(address);
  return result;
};

// NO: var, implicit any, .then chains, classes for everything
```

- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`. Never `var`.
- Use `async/await` over `.then()` chains
- Named exports over default exports
- Barrel files (`index.ts`) for public APIs

### Python

```python
# YES: type hints, f-strings, pathlib
def calculate_rsi(prices: list[float], period: int = 14) -> float:
    """Calculate RSI for given price series."""
    gains = [max(0, prices[i] - prices[i-1]) for i in range(1, len(prices))]
    losses = [max(0, prices[i-1] - prices[i]) for i in range(1, len(prices))]
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    rs = avg_gain / avg_loss if avg_loss != 0 else float('inf')
    return 100 - (100 / (1 + rs))

# NO: no type hints, string concatenation, os.path
```

- Use f-strings, not `.format()` or `+`
- Use `pathlib.Path`, not `os.path`
- Use dataclasses or Pydantic for structured data
- Docstrings on public functions (one-line for simple, Google-style for complex)
- `snake_case` for everything except class names (`PascalCase`)

### Solidity

```solidity
// YES: NatSpec, explicit visibility, custom errors
/// @notice Transfers tokens from sender to recipient
/// @param to Recipient address
/// @param amount Amount in wei
function transfer(address to, uint256 amount) external returns (bool) {
    require(to != address(0), "Transfer to zero address");
    _transfer(msg.sender, to, amount);
    return true;
}
```

- NatSpec comments on all public/external functions
- Explicit function visibility (public/external/internal/private)
- Custom errors over require strings (gas efficient)
- Events for all state changes
- Follow checks-effects-interactions pattern

---

## FILE NAMING CONVENTIONS

| Context | Convention | Example |
|---|---|---|
| TypeScript files | camelCase | `walletService.ts`, `useTrading.ts` |
| React components | PascalCase | `DashboardCard.tsx`, `WalletButton.tsx` |
| Python files | snake_case | `rsi_strategy.py`, `key_mint.py` |
| Solidity files | PascalCase | `ASIGToken.sol`, `SignalRegistry.sol` |
| Config/data files | kebab-case or snake_case | `app.config.ts`, `genesis_config.json` |
| Directories | kebab-case | `trading-engine/`, `wallet-adapter/` |
| Test files | Same as source + `.test` or `test_` | `walletService.test.ts`, `test_keymint.py` |

---

## SYSTEM UTILITIES

### smart_cleanup.ps1
| Key | Value |
|---|---|
| **Path** | `C:\Users\natha\smart_cleanup.ps1` |
| **Schedule** | Every 30 minutes via Windows Task Scheduler |
| **Purpose** | Auto-manages processes — closes browser/app clutter |
| **Protected** | python, node, ollama, Code, WindowsTerminal, pwsh + any TCP LISTENING server |
| **Modes** | `-Scan` (dry-run), `-Clean` (execute), `-Suspend` (freeze), `-Resume` (thaw), `-Dashboard` (live watch) |
| **Log** | `%TEMP%\smart_cleanup.log` |

### secure_vault.ps1
| Key | Value |
|---|---|
| **Path** | `D:\AegisForge\engine\secure_vault.ps1` |
| **Purpose** | Windows DPAPI credential vault for API keys, wallet seeds |

### Master Vault
| Key | Value |
|---|---|
| **Path** | `C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Vault\` |
| **Contents** | API keys, EVM/Solana wallets, seed phrases, bot keys, service credentials |
| **Security** | ACL-locked (natha + SYSTEM only), DPAPI seal/unseal scripts, .gitignore blocks all |

---

## AVAILABLE TOOLS ON THIS MACHINE

**Full inventory with task router:** `TERMINALS_INVENTORY.md` (same folder as this file)

### Quick Reference

| Tool | Path | Version |
|---|---|---|
| PowerShell 7 | `C:\Program Files\PowerShell\7\pwsh.exe` | 7.5.5 |
| Node.js | `C:\Program Files\nodejs\node.exe` | 25.8.1 |
| Python | `C:\Program Files\Python39\python.exe` | 3.9.7 |
| Git | `C:\Program Files\Git\cmd\git.exe` | 2.53.0 |
| Docker | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` | 29.3.1 |
| Ollama | `C:\Users\natha\AppData\Local\Programs\Ollama\ollama.exe` | 0.20.7 |
| Solana CLI | `C:\Users\natha\.local\share\solana\install\...\solana.exe` | 2.1.21 |
| Rust/Cargo | `C:\Users\natha\.cargo\bin\rustc.exe` | 1.86.0 |
| .NET SDK | `C:\Program Files\dotnet\dotnet.exe` | 10.0.202 |
| GitHub CLI | `C:\Program Files\GitHub CLI\gh.exe` | 2.88.1 |
| Chocolatey | `C:\ProgramData\chocolatey\bin\choco.exe` | 2.4.3 |

**Admin elevation:** `Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -Command `"COMMAND`""`

---

## DEPLOYMENT TARGETS

| Platform | Method | Distribution |
|---|---|---|
| **Web** | Docker → VPS or Vercel | URL (public) |
| **iOS** | Expo EAS Build → App Store | Apple App Store |
| **Android** | Expo EAS Build → Play Store | Google Play Store |
| **Desktop (Windows)** | Tauri → MSI installer | GitHub Releases or website |
| **Desktop (macOS)** | Tauri → .dmg | GitHub Releases or website |
| **Desktop (Linux)** | Tauri → AppImage/.deb | GitHub Releases or website |
| **API** | Docker → VPS | Private endpoints |
| **Smart Contracts** | Hardhat deploy → Base + Aegis Chain | On-chain |

---

## RULES (MANDATORY FOR ALL AGENTS)

### Security
1. **NEVER expose** `🦙/keys/master.key` or any wallet seed/private key in any response, log, or output.
2. **No secrets in code.** Use env vars or the DPAPI vault. `.env` files are gitignored.
3. **Validate all input** at API boundaries. Follow OWASP Top 10.

### Code & Git
4. **Never commit to git without human approval.** Stage only. Nate approves all pushes.
5. **Follow the tech stack.** TypeScript, Python, Solidity/Rust. No other languages.
6. **Follow coding standards.** See the Coding Standards section above.
7. **Format and lint.** Prettier + ESLint (TS), Black + mypy (Python). No warnings in CI.

### System Safety
8. **Never kill active agents or services.** If a running process needs touching, ask first.
9. **Never modify** `Foreman-Instance\` or `Foreman-Company\` without explicit approval — these are originals with no other copy.
10. **Ask before anything destructive** — file deletions, schema drops, git force pushes, service restarts.
11. **When unsure, read the file** rather than guess its contents.

### Documentation
12. **Document architectural changes** in CLAUDE.md and relevant memory files.
13. **Update this file** when system layout, ports, or component locations change.

---

## HEALTH CHECK (Run on Session Start)

```
1. Ollama running?     → curl http://localhost:11434/api/tags
2. Bot-home live?      → curl http://localhost:8080/health
3. Key valid?          → Check 🦙\keys\registry.json for your agent name
4. Active context?     → Read v4w_website\memory-bank\activeContext.md
5. What's the stack?   → Read this file
```

---

## COMPANION FILES

| File | Purpose |
|---|---|
| `EXTENSIONS_INVENTORY.md` | Every VS Code extension (83 total) with descriptions and categories |
| `TERMINALS_INVENTORY.md` | Every shell, CLI, runtime, and system tool on this machine — with task router |

These are in the same folder as this README.
# Mind_Heart_Shield_Spear_Spirit
