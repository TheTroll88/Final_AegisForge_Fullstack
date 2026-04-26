# AegisForge — Technology Stack & Coding Standards

> **Authority:** This is the single source of truth for what languages, frameworks, and patterns  
> AegisForge uses. All agents, developers, and AI assistants must follow this.  
> **Last updated:** April 2026

---

## The Rule: Three Languages, No Exceptions

AegisForge speaks **three languages**. Every file in the project maps to one of these:

| Language | Where It's Used | Why |
|---|---|---|
| **TypeScript** | Frontend (web + mobile + desktop), Aegis Chain, Foreman agent, API gateway, build tools | One language across all client platforms + blockchain + orchestration. Types prevent bugs at scale. |
| **Python** | Trading engine, AI/inference bridge, KeyMint auth, bot-home server, data scripts, utilities | Best ecosystem for ML/AI, trading strategies, and rapid backend development. |
| **Solidity / Rust** | Smart contracts only — Solidity for EVM (Aegis Chain + Base), Rust for Solana (Anchor) | These are the native languages of the chains. No alternative. |

**If something can be written in TypeScript, write it in TypeScript.**  
**If it involves AI/ML, trading math, or existing Python infrastructure, write it in Python.**  
**If it's a smart contract, use the chain's native language.**

No Go. No Java. No Swift. No C#. No Dart. No Ruby. Period.

---

## Frontend: Cross-Platform from One Codebase

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

### Frontend Architecture

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

## Backend: Python + Node.js (TypeScript)

### Python Backend (Trading + AI)

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
**Formatter:** Black  
**Import sorting:** isort  
**Type checking:** mypy (strict mode on new code)  
**Testing:** pytest  

### TypeScript Backend (Chain + Agents)

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
**Package manager:** npm  
**Runtime:** Node.js (ts-node or tsx for TypeScript execution)  
**Formatter:** Prettier  
**Linter:** ESLint  
**Testing:** Vitest or Jest  

---

## Smart Contracts

### EVM (Solidity)
```
D:\AegisForge\engine\contracts\
├── ASIGToken.sol                   ← ERC-20, 1M supply (Base chain)
└── SignalRegistry.sol              ← On-chain signal broadcasting

D:\AegisForge\chain\src\foreman\
└── brain.ts                        ← References ForemanBrain.sol (on-chain memory)
```

**Solidity version:** 0.8.x  
**Toolchain:** Hardhat (primary) — compile, test, deploy, verify  
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

**Rust version:** 1.86+  
**Framework:** Anchor  
**Solana CLI:** 2.1.21  
**Testing:** anchor test (TypeScript via Mocha)  

---

## Infrastructure & DevOps

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

## Coding Standards (All Languages)

### Universal Rules
1. **Types everywhere.** TypeScript strict mode. Python type hints on all function signatures. No `any`.
2. **Format on save.** Prettier (TS/JS), Black (Python). No style debates.
3. **Lint always.** ESLint (TS), mypy (Python), solhint (Solidity). Zero warnings in CI.
4. **Test what matters.** Business logic, auth flows, trading strategies. Don't test getters.
5. **No secrets in code.** Ever. Use env vars or the vault. `.env` files are `.gitignore`'d.
6. **Meaningful names.** `calculatePositionSize()` not `calc()`. `walletBalance` not `wb`.
7. **Small functions.** Under 50 lines. If it's bigger, break it up.
8. **Error handling at boundaries.** API endpoints, user input, external calls. Not every internal function.

### TypeScript-Specific
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

### Python-Specific
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

### Solidity-Specific
```solidity
// YES: NatSpec, explicit visibility, SafeMath not needed in 0.8+
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

## File Naming Conventions

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

## Port Assignments

| Service | Port | Status |
|---|---|---|
| Bot-home (Flask) | 8080 | Running |
| Aegis Chain RPC | 8545 | Not started |
| Logos Brain | 7788 | Available |
| Ollama | 11434 | Running |
| LLM Chat Bridge | 9100 | Available |
| Trading Engine (FastAPI) | 8000 | Not started |
| Web App (dev) | 3000 | Not started |
| Mobile (Expo) | 8081 | Not started |
| OpenClaw/Chief | 18789 | Running |

---

## Deployment Targets (When Production-Ready)

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
