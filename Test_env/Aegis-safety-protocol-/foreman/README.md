# Foreman — Install & Run Guide

## What Foreman Is
A persistent daemon that acts with Nate's full authority.
It runs 24/7, posts $SIGNAL content, executes tasks, and never stops.
From the system's perspective: Foreman is Nate.

## Quick Start

```powershell
cd C:\Users\natha\OneDrive\GitHub\Aegis-safety-protocol-\foreman
pip install openai playwright tweepy requests
playwright install chromium

# First run (simulation mode — no real posting yet)
python daemon.py --run
```

## Activate Powers (flip flags in config.json)

```json
"flags": {
  "post_to_twitter": true,       ← flip when X session is saved
  "execute_shell_commands": true, ← flip when ready for full shell
  "autonomous_mode": true         ← full autonomy
}
```

## Set Up Twitter Session (one-time manual login)

```powershell
python session_auth\save_session.py --site twitter
# Browser opens → log in to X → press ENTER → session saved
```

Then set `"mode": "playwright"` in config.json and flip `post_to_twitter` to true.

## Add OpenAI Key (for AI-generated posts)
Edit config.json → set `openai.api_key` to your key.
Without it, Foreman uses the curated post bank (still works, just static).

## Install as Windows Startup Task
```powershell
python daemon.py --install
# Foreman starts automatically on every login
```

## Inject Tasks Manually
```powershell
python daemon.py --task "post signal update"
python daemon.py --task "check airdrop eligibility"
python daemon.py --task "verify accounts"
```

## Account + Wallet Verification (First Test)

Foreman can now run a structured authority test:
- Verify wallet secret -> expected wallet address mappings
- Verify account login session files exist and are usable
- Generate signed audit report in `reports/`
- Optionally store audit summary in KeePassXC

### 1) Fill inventory
Edit `account_inventory.json` and confirm every expected wallet/account entry.

### 2) Set wallet secrets as env vars (PowerShell)
```powershell
$env:RAINBOW_PRIMARY_PRIVATE_KEY = "<your private key>"
$env:SOLANA_PRIMARY_SECRET = "<base58 secret or [64-byte array]>"
```

### 3) Save sessions for accounts you want validated
```powershell
python session_auth\save_session.py --site twitter
python session_auth\save_session.py --site galxe
python session_auth\save_session.py --site layer3
python session_auth\save_session.py --site taskon
python session_auth\save_session.py --site intract
```

### 4) Run verification
```powershell
python daemon.py --task "verify accounts"
```

### 5) Optional KeePassXC write-back
In `config.json`, set:
- `account_verification.keepass.enabled = true`
- `account_verification.keepass.database = <path to kdbx>`
- Env var for master password: `KEEPASS_MASTER_PASSWORD`

## Check Status
```powershell
python daemon.py --status
```

## File Structure
```
foreman/
  daemon.py       ← main loop (the brain)
  voice.py        ← AI voice engine (generates posts)
  poster.py       ← Twitter/X posting
  config.json     ← all settings (never commit this)
  logs/           ← rotating logs
  queue/          ← pending/done/failed tasks
```

## The Three Flags
| Flag | Effect |
|------|--------|
| `post_to_twitter: false` | Simulates posts, logs them but doesn't send |
| `post_to_twitter: true` | Live posting to X as Nate |
| `execute_shell_commands: true` | Can run approved shell commands |
| `autonomous_mode: true` | Full decision-making authority, no confirmation |
