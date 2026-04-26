# Solana-Clawd — Agentic Solana Framework
# Source: C:\Users\natha\OneDrive\ThePenetrator\solana-clawd

## OVERVIEW
MCP server providing 31 Solana tools to any Claude-powered agent.
TypeScript, MIT license, zero-cost for read ops (free Helius key).
Architecture adapted from Claude Code's agentic pipeline.

## MCP TOOLS (31 total)

### Market Data (8 tools)
- solana_price — Live token price (mint or symbol)
- solana_trending — Top trending tokens
- solana_token_info — Token metadata + security score
- solana_wallet_pnl — Wallet P&L (realized + unrealized)
- solana_search — Token search by name/symbol
- solana_top_traders — Smart money wallets per token
- solana_wallet_tokens — Token balances for any wallet
- sol_price — Quick SOL/USD via CoinGecko

### Helius Onchain (8 tools)
- helius_account_info — Full account data via RPC
- helius_balance — SOL balance in SOL
- helius_transactions — Parsed tx history (SWAP/NFT/TRANSFER filters)
- helius_priority_fee — Real-time fee estimate
- helius_das_asset — DAS metadata (NFT/token, creators, royalties)
- helius_webhook_create — Live address-watching webhooks
- helius_webhook_list — List active webhooks
- helius_listener_setup — TypeScript code for WebSocket listeners

### Agent Fleet (3 tools)
- agent_spawn — Spawn research/OODA/scanner/dream agent
- agent_list — List active agent tasks
- agent_stop — Stop a task

### Memory (2 tools)
- memory_recall — Query by tier (KNOWN/LEARNED/INFERRED)
- memory_write — Write fact to memory

### Metaplex Agent Registry (6 tools)
- metaplex_mint_agent — Mint AI agents as MPL Core assets
- metaplex_register_identity — Register agent identity PDA
- metaplex_read_agent — Read agent data and registration
- metaplex_delegate_execution — Delegate execution to operators
- metaplex_verify_mint — Verify minting status
- metaplex_agent_wallet — Manage agent wallets on Solana

### Skills (2 tools)
- skill_list — List available SKILL.md files
- skill_read — Read a skill's content

## BUILT-IN AGENTS (9)
1. Explore — read-only research, 10 turns, cheap
2. Scanner — market scan, 25 turns, trending + smart money
3. PumpScanner — autonomous Pump.fun curve watcher
4. SniperBot — automated trade execution loop
5. OODA — full trading cycle, 40 turns, permission-gated
6. Dream — memory consolidation, INFERRED → LEARNED promotion
7. Analyst — structured research reports, 30 turns
8. Monitor — onchain listener setup, webhooks, 15 turns
9. MetaplexAgent — onchain agent minting, 25 turns

## OODA TRADING LOOP
```
OBSERVE  → sol_price, trending, helius_priority_fee, memory KNOWN
ORIENT   → score: trend(25) + momentum(20) + liquidity(20) + participation(15) - risk(20)
DECIDE   → confidence >= 60? → size band (0.5x / 1.0x / 1.25x / 1.5x)
ACT      → trade_execute (human approval required, deny-first)
LEARN    → write INFERRED → Dream promotes to LEARNED
```

## PERMISSION ENGINE
- deny-first for all write operations
- Always deny: trade_execute, wallet_send, wallet_sign
- Always allow: solana_price, helius_account_info (read-only)
- Modes: ask (default), auto, bypassAll, readOnly

## MEMORY SYSTEM (3 tiers)
- KNOWN: expires (time-limited facts, e.g. prices)
- LEARNED: persistent (proven patterns)
- INFERRED: tentative (unverified signals)

## DEPLOYMENT OPTIONS
- VS Code MCP: add to mcp.json config
- Claude Desktop: add to desktop config
- Public URL: https://solana-clawd.fly.dev/mcp (hosted)
- Skill install: `npx skills add x402agent/solana-clawd`

## REQUIREMENTS
- HELIUS_API_KEY (free at helius.dev — 1M credits/month)
- Node.js
- Optional: SOLANA_TRACKER_API_KEY, OPENROUTER_API_KEY
