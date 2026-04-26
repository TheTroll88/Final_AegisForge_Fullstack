# Vinece — Endpoint & API Reference Catalog

Extracted from `Aegis_Family/Vinece` (origin: `solana-clawd`).
Original source is **read-only** — this is the working reference copy for other agents and services.

---

## Core API Surfaces

### 1. Helius (Solana RPC + Enhanced APIs)

| Surface | Endpoint | Auth |
|---|---|---|
| JSON-RPC (mainnet) | `https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` | API key in URL |
| JSON-RPC (devnet)  | `https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` | API key in URL |
| REST (enhanced)    | `https://api-mainnet.helius-rpc.com{path}?api-key={HELIUS_API_KEY}` | API key in URL |
| WebSocket (mainnet)| `wss://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` | API key in URL |
| WebSocket (devnet) | `wss://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}` | API key in URL |

**Env var:** `HELIUS_API_KEY` / `HELIUS_RPC_URL`
**Docs:** https://docs.helius.dev

#### Helius Capabilities Used in Vinece
- Priority fee estimates (`getPriorityFeeEstimate`)
- DAS (Digital Asset Standard): `getAsset`, `getAssetsByOwner`, `getAssetsByGroup`, `searchAssets`
- Enhanced transaction parsing (human-readable descriptions)
- Webhooks: Create/edit/delete/get — for real-time account change alerts
- WebSocket subscriptions: account / program / logs / slot / enhanced `transactionSubscribe`
- Polling fallback for any JSON-RPC method

---

### 2. Pump.fun + PumpSwap AMM

| Resource | Address |
|---|---|
| Pump Program | `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` |
| PumpSwap AMM  | `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` |
| Fee Program   | `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVJ` |
| Global PDA    | `4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf` |
| AMM Global Config PDA | `ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw` |

**PumpPortal WebSocket (real-time feed):**
- `wss://pumpportal.fun/api/data` — token creation + trade stream (no auth)
- Subscribe: `{ method: "subscribeNewToken" }` or `{ method: "subscribeTokenTrade", keys: [mint] }`

**SolanaTracker:**
- Token security score, holder count, volume
- **Env var:** `SOLANA_TRACKER_API_KEY`

**Fee structure:**
- Bonding curve: 1% (100 bps)
- AMM LP fee: 0.20% | Protocol fee: 0.05% | Total: 0.25%
- Graduation threshold: ~85 SOL real reserves → token moves to AMM

---

### 3. Telegram Bot Gateway

**Endpoint:** `https://api.telegram.org/bot{TOKEN}/{method}`
**Env var:** `TELEGRAM_BOT_TOKEN`
**Mode:** Long-polling (no public URL) OR webhook via Tailscale Funnel

**Commands available (20+):**
`/start` `/help` `/sol` `/price` `/trending` `/token` `/wallet` `/scan` `/grad` `/mcap`
`/cashback` `/signals` `/status` `/ooda` `/research` `/memory` `/dream` `/skills` `/tailscale`
`/snipe` `/stop` `/agent`

---

### 4. x402 Micropayment Protocol

HTTP payment protocol for pay-per-request APIs.
- Triggered on `402 Payment Required` responses
- Input: `X-Payment-Required` header (JSON payload)
- Output: `X-Payment` header (EIP-3009 `transferWithAuthorization` signed via EIP-712)
- Token: USDC (6 decimals; 1 USDC = 1 USD peg assumed)
- Networks: Base mainnet, Ethereum mainnet (see `USDC_ADDRESSES` in types)
- Facilitator: `DEFAULT_FACILITATOR_URLS` (see `src/services/x402/types.ts`)

**Env vars:**
- `X402_ENABLED` — enable/disable
- `X402_PRIVATE_KEY` — EVM wallet key for signing
- `X402_MAX_PAYMENT_PER_REQUEST_USD`
- `X402_MAX_SESSION_SPEND_USD`

---

### 5. Claude OAuth (Anthropic / Claude.ai)

**Authorize URL (console):** from `getOauthConfig().CONSOLE_AUTHORIZE_URL`
**Authorize URL (Claude.ai):** from `getOauthConfig().CLAUDE_AI_AUTHORIZE_URL`

Scopes available:
```
ALL_OAUTH_SCOPES, CLAUDE_AI_INFERENCE_SCOPE, CLAUDE_AI_OAUTH_SCOPES
```
- PKCE flow (S256 challenge)
- Redirect URI: `http://localhost:{port}/callback` (local) or manual
- Token exchange, refresh, org-scoped auth supported

**Env var:** `CLAUDE_API_KEY` (fallback from OAuth tokens via `saveApiKey`)

---

### 6. SolanaOS Gateway (SSE Transport)

Internal multi-client message bus used by Vinece as an AI agent communication layer.

- `GET  /api/v1/stream` — SSE stream (client subscribes)
- `POST /api/v1/gateway/message` — client sends message

**Gateway Events:**
| Constant | String |
|---|---|
| `GATEWAY_EVENT_CHAT_MESSAGE`  | chat message inbound |
| `GATEWAY_EVENT_CHAT_STREAM`   | assistant streaming |
| `GATEWAY_EVENT_TOOL_STREAM`   | tool call streaming |
| `GATEWAY_EVENT_SESSION_REFRESH` | session refresh |
| `GATEWAY_EVENT_EXEC_APPROVAL` | exec approval request |
| `GATEWAY_EVENT_AGENT`         | agent messages |
| `GATEWAY_EVENT_HEALTH`        | heartbeat/health |

Device auth is validated via `validateDeviceAuth(DeviceAuthPayload)`.
Client surfaces: `web`, `android`, `macos`, `extension`, `seeker`

---

### 7. Grove API (Anthropic account settings)

- `GET/POST` — account-level feature flags (e.g. Grove toggle)
- Auth: OAuth with 401 retry
- Cached 24h per session; invalidated on settings update
- **Env var:** OAuth token from Claude account

---

## Environment Variables (complete)

```env
# Solana / Helius
HELIUS_API_KEY=
HELIUS_RPC_URL=         # optional override — defaults to mainnet.helius-rpc.com

# Pump.fun
SOLANA_TRACKER_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=

# x402 payments
X402_ENABLED=false
X402_PRIVATE_KEY=       # EVM wallet private key for USDC micropayments
X402_MAX_PAYMENT_PER_REQUEST_USD=0.10
X402_MAX_SESSION_SPEND_USD=5.00

# Claude
CLAUDE_API_KEY=         # from claude.ai/settings or OAuth flow
```

---

## Source Files (do not edit originals)

| This file covers | Original location |
|---|---|
| HeliusClient class, types | `Aegis_Family/Vinece/src/helius/helius-client.ts` |
| HeliusListener (WS/webhook) | `Aegis_Family/Vinece/src/helius/onchain-listener.ts` |
| Pump.fun client + PDA helpers | `Aegis_Family/Vinece/src/pump/client.ts` |
| Pump types / program addresses | `Aegis_Family/Vinece/src/pump/types.ts` |
| Pump bonding curve math | `Aegis_Family/Vinece/src/pump/math.ts` |
| Telegram bot + commands | `Aegis_Family/Vinece/src/telegram/bot.ts` |
| x402 payment client | `Aegis_Family/Vinece/src/services/x402/client.ts` |
| x402 types / USDC addresses | `Aegis_Family/Vinece/src/services/x402/types.ts` |
| OAuth client / PKCE | `Aegis_Family/Vinece/src/services/oauth/client.ts` |
| SSE Gateway transport | `Aegis_Family/Vinece/src/gateway/sse-transport.ts` |
| Gateway integration layer | `Aegis_Family/Vinece/src/gateway/gateway-integration.ts` |
| Grove API | `Aegis_Family/Vinece/src/services/api/grove.ts` |
