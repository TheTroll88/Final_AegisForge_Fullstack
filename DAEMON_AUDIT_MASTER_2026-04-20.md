# Master Daemon Audit Report
Date: 2026-04-20
Host: Windows
Scope: Non-destructive audit of daemons/background agents, startup persistence, miner/Litecoin activity

## Executive Summary
- A real LITCOIN miner stack exists on this machine at `C:\Users\natha\LITCOIN_Miner`.
- It is configured for autostart via Startup folder and has historical successful claim activity in logs.
- At time of scan, no active LITCOIN miner process was running.
- Additional persistent background launchers exist (OpenClaw gateway, hidden AegisForge monitor script, Ollama).
- A scheduled task named `LITCOIN_MidnightMiner` exists but is currently **Disabled**.

## What Is Running Right Now (Live)
### Confirmed active/background components
1. `ollama.exe` (`...\Ollama\ollama.exe serve`) - local model server.
2. `node.exe` OpenClaw gateway:
   - `...\openclaw\dist\index.js gateway --port 18789`
3. Multiple Python language-server processes tied to VS Code extensions (isort, black, mypy, wake lsp, markitdown-mcp).
4. Many `pwsh.exe` terminals (expected in current session).

### Miner live-state check
- Searched running processes for:
  - `LITCOIN_Miner`
  - `litcoin_miner.py`
  - `miner_daemon.ps1`
  - `fleet_orchestrator.ps1`
- Result: **No active process match at scan time**.

## Persistence / Autostart Findings
### Startup folder (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`)
Found entries:
1. `LITCOIN_Miner_Autostart.bat`
2. `AegisForge.vbs`
3. `OpenClaw Gateway.cmd`
4. `Ollama.lnk`
5. `Windows Update Script.pyw`

### Startup file content evidence
#### `LITCOIN_Miner_Autostart.bat`
- Changes to `C:\Users\natha\LITCOIN_Miner`
- Pulls `BANKR_API_KEY` from `secure_vault.ps1`
- Launches hidden daemon runner:
  - `miner_daemon.ps1`

#### `AegisForge.vbs`
- Launches hidden PowerShell:
  - `pwsh.exe ... -WindowStyle Hidden -File 'C:\Users\natha\OneDrive\GitHub\aegis-chain\orchestrate.ps1' -Monitor`

#### `OpenClaw Gateway.cmd`
- Starts minimized cmd to run:
  - `C:\Users\natha\.openclaw\gateway.cmd`

#### `Windows Update Script.pyw`
- Present in Startup folder.
- Content appears non-human-readable/obfuscated blob in terminal output during inspection.
- Requires dedicated static inspection to classify safely.

## Scheduled Tasks (Relevant)
### `Aegis_CryptoScavenger` (Ready)
- Description: Hits devnet faucets at midnight UTC
- Execute: `C:\Program Files\nodejs\node.exe`
- Args: `...\tsx\dist\cli.mjs C:\Users\natha\aegis-chain\scavenger.ts`
- LastRun: 2026-04-20 19:00:01
- NextRun: 2026-04-21 19:00:00
- LastTaskResult: 0

### `Aegis_SystemMaintenance` (Ready)
- Hidden PowerShell maintenance script
- Execute: `pwsh.exe`
- Args: `-WindowStyle Hidden ... C:\Users\natha\tools\system_maintenance.ps1`
- LastTaskResult: 2147942667 (non-zero failure code)

### `LITCOIN_MidnightMiner` (Disabled)
- Description: Auto-start LITCOIN miner fleet at midnight UTC
- Execute: `powershell.exe`
- Args: `... C:\Users\natha\LITCOIN_Miner\fleet_orchestrator.ps1 -Action start`
- LastRun: 2026-04-07 19:00:01
- NextRun shown by scheduler but task is disabled

## Strong Litecoin/Miner Evidence
## Directory exists
`C:\Users\natha\LITCOIN_Miner` with full project stack:
- `litcoin_miner.py`
- `miner_daemon.ps1`
- `fleet_orchestrator.ps1`
- `secure_vault.ps1`
- `bridge_to_solana.py`
- `swap_lit_to_eth.py`
- `consolidate_to_rune.py`
- `logs\` and `.runtime\` artifacts

### `litcoin_miner.py` indicators
Observed strings/logic include:
- `LITCOIN Standalone Miner - v4.4.0`
- `from litcoin import Agent`
- Uses `BANKR_API_KEY`
- Default wallet address present in code
- Uses model default `gpt-4o-mini`
- Functions/logging mention "Comprehension Mining" and LITCOIN rewards/claims

### Runtime artifacts
From `C:\Users\natha\LITCOIN_Miner\.runtime` and `...\logs`:
- `.runtime\miner_daemon.pid` present (`1824`)
- `logs\miner_daemon.log` shows repeated RUN cycles across multiple dates
- `logs\miner_heartbeat.log` shows:
  - daemon start events
  - claim attempts
  - successful claim tx hashes
  - restarts after heartbeat misses/crash detection
- Latest diagnostics snapshot includes wallet and model details

## Network/Behavior Notes
- OpenClaw gateway is running on port `18789`.
- Ollama local service is running (`serve`).
- Most current established connections are browser/VS Code/Python tooling related.
- No live miner process owned a connection at scan moment.

## Risk Assessment (Operational)
### High
1. `Windows Update Script.pyw` in Startup with opaque/obfuscated-looking content.
2. Hidden launcher chain (`AegisForge.vbs` -> hidden `orchestrate.ps1 -Monitor`) without reviewed script intent in this audit.

### Medium
1. LITCOIN miner ecosystem present with persistent startup path and historical reward claims.
2. OpenClaw gateway active with background automation potential.

### Low to Medium
1. Routine dev daemons (Ollama, VS Code language servers) expected for this workstation profile.

## What Needs To Be Done (Action Plan)
## Priority 1: Clarify unknown hidden/opaque startup items
1. Staticaly inspect `Windows Update Script.pyw` safely (hash + decode + source review).
2. Review `C:\Users\natha\OneDrive\GitHub\aegis-chain\orchestrate.ps1` logic and intended monitor scope.

## Priority 2: Decide miner policy explicitly
1. Keep miner allowed and document owner intent OR disable startup persistence.
2. If allowed: enforce run windows, API key vault policy, and logging/alerting baseline.
3. If not allowed: remove Startup launcher + task references after approved change window.

## Priority 3: Tighten daemon governance
1. Build allowlist of approved background executables and startup entries.
2. Snapshot baseline hashes for startup scripts and compare daily.
3. Track scheduled task result codes (especially `Aegis_SystemMaintenance` failure code).

## Priority 4: Continuous visibility
1. Add a lightweight daily report script for:
   - startup entries
   - related scheduled tasks
   - active gateway/model services
   - miner process live state
2. Store reports in root audit folder for trend review.

## Evidence Pointers
- Startup folder:
  - `C:\Users\natha\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`
- Miner project:
  - `C:\Users\natha\LITCOIN_Miner`
- Miner logs:
  - `C:\Users\natha\LITCOIN_Miner\logs`
- Miner runtime state:
  - `C:\Users\natha\LITCOIN_Miner\.runtime`
- Aegis scavenger task script:
  - `C:\Users\natha\aegis-chain\scavenger.ts`

## Non-Destructive Constraint Followed
- No process was killed.
- No service/task/startup item was changed.
- No files were deleted/modified during this audit.
