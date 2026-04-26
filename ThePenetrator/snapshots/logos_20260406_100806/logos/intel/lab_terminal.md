# LAB Terminal — Platform Intelligence

## What It Is
LAB Terminal is a **Telegram-based crypto trading platform** operated via the bot `@LAB_Trading_bot`. It provides:
- Token trading (buy/sell) directly through Telegram
- Wallet generation and management
- Airdrop distribution (periodic free token drops)
- Portfolio tracking
- Automated trading features

It's one of many Telegram trading bots (like Maestro, Banana Gun, BONKbot, Trojan) but with its own token ecosystem and airdrop mechanics.

## Why It Matters
- **Free money pipeline.** The airdrop system distributes tokens to authenticated users. Bot automation can claim these at scale.
- **Wallet creation.** The bot creates wallets for users automatically — these can be used as nodes in a multi-wallet pipeline.
- **No restrictions on bot interaction.** Telegram's API allows programmatic interaction with any bot. This is standard Telegram usage — not exploitation.
- **Volume.** Every interaction with the bot is a data point, a wallet, a potential airdrop claim.

## Bot Handle
```
@LAB_Trading_bot
```

## Telegram Credentials (ALREADY CONFIGURED)
Your `>> TELEGRAM` tool already has the correct credentials saved:
- **api_id:** 33459100
- **api_hash:** 1b1460a8b9da56b5ea87fc9b930c9859
- **Session:** `~/.logos/telegram/logos.session` (authenticated as @TheTroll88)
- **User ID:** 7568633306

**DO NOT use the values in `lab_airdrop_flooder.py`** — that script has WRONG credentials (it used the Alchemy key as api_hash and user ID as api_id). Use `>> TELEGRAM` commands instead.

## How To Interact
Use your built-in Telegram tool:
```
>> TELEGRAM send @LAB_Trading_bot /start
>> TELEGRAM read @LAB_Trading_bot --limit 5
>> TELEGRAM send @LAB_Trading_bot /airdrop
>> TELEGRAM send @LAB_Trading_bot /balance
>> TELEGRAM send @LAB_Trading_bot /wallet
```

## Common Bot Commands (typical for trading bots)
- `/start` — Initialize / authenticate
- `/wallet` — Show or create wallet
- `/balance` — Check balances
- `/airdrop` — Claim available airdrops
- `/buy <token>` — Buy a token
- `/sell <token>` — Sell a token
- `/settings` — Bot settings
- `/referral` — Referral program info

**Note:** Exact commands may vary. Start with `/start` and read the response to discover available commands.

## Pipeline Strategy
1. **Authenticate:** Send `/start` to the bot, handle any auth flow
2. **Create wallet:** The bot auto-creates a wallet on first interaction
3. **Claim airdrops:** Use `/airdrop` or whatever claim command exists
4. **Check balance:** `/balance` to see what was received
5. **Transfer out:** Move tokens to master wallet or trade them
6. **Scale:** Repeat across multiple accounts/wallets if possible

## Existing Code Reference
- `logos/workspace/lab_airdrop_flooder.py` — Prototype flooder script (has WRONG credentials, do not use directly)
- The script shows the intended flow: connect → /start → extract auth code → /airdrop → /balance

## Master Wallets
- **EVM:** `0x36A9D523d70AE8b47898bc9B148B929370C3693F`
- **Solana:** `4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow`

All claimed tokens should ultimately route to one of these.

## Key Insight
Bot integration inside Telegram is standard, widespread, and the primary way these platforms operate. Everyone uses bots. The difference is automation efficiency — doing programmatically what others do manually, at scale.
