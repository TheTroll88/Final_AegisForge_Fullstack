<#
.SYNOPSIS
    Agent Status Tracker — live dashboard for Anvil & Logos
.DESCRIPTION
    Runs in a terminal, shows real-time status of both agents.
    Green = alive, Red = down. Refreshes every 5 seconds.
#>

$refreshInterval = 5

function Get-LogosStatus {
    # Check PID lock
    $pidFile = "$env:TEMP\logos.pid"
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($pid) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) { return @{ Alive = $true; PID = $pid; Detail = "Running (PID $pid)" } }
        }
    }
    # Fallback: check for python process running logos
    $proc = Get-Process python* -ErrorAction SilentlyContinue | Where-Object {
        try { $_.CommandLine -match 'logos' } catch { $false }
    } | Select-Object -First 1
    if ($proc) { return @{ Alive = $true; PID = $proc.Id; Detail = "Running (PID $($proc.Id))" } }
    return @{ Alive = $false; PID = $null; Detail = "DOWN" }
}

function Get-GatewayStatus {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:11435/health" -TimeoutSec 2 -ErrorAction Stop
        $data = $r.Content | ConvertFrom-Json
        return @{ Alive = $true; Detail = "Online (port 11435)" }
    } catch {
        return @{ Alive = $false; Detail = "Offline" }
    }
}

function Get-AnvilStatus {
    # Anvil runs inside Copilot Chat — always alive if this script is running
    # But we can check if our gateway/infrastructure is responding
    $gw = Get-GatewayStatus
    return @{ Alive = $true; Gateway = $gw; Detail = "Active" }
}

function Show-Dashboard {
    $logos = Get-LogosStatus
    $anvil = Get-AnvilStatus
    $gw = Get-GatewayStatus
    $time = Get-Date -Format "HH:mm:ss"

    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor DarkGray
    Write-Host "  ║          " -NoNewline -ForegroundColor DarkGray
    Write-Host "AGENT STATUS TRACKER" -NoNewline -ForegroundColor Cyan
    Write-Host "                      ║" -ForegroundColor DarkGray
    Write-Host "  ║                    " -NoNewline -ForegroundColor DarkGray
    Write-Host "$time" -NoNewline -ForegroundColor DarkGray
    Write-Host "                            ║" -ForegroundColor DarkGray
    Write-Host "  ╠════════════════════════════╦═════════════════════════════╣" -ForegroundColor DarkGray
    Write-Host "  ║" -NoNewline -ForegroundColor DarkGray

    # Anvil side
    Write-Host "  " -NoNewline
    if ($anvil.Alive) {
        Write-Host "● " -NoNewline -ForegroundColor Green
    } else {
        Write-Host "● " -NoNewline -ForegroundColor Red
    }
    Write-Host "ANVIL" -NoNewline -ForegroundColor White
    Write-Host "                   " -NoNewline
    Write-Host "║" -NoNewline -ForegroundColor DarkGray

    # Logos side
    Write-Host "  " -NoNewline
    if ($logos.Alive) {
        Write-Host "● " -NoNewline -ForegroundColor Green
    } else {
        Write-Host "● " -NoNewline -ForegroundColor Red
    }
    Write-Host "LOGOS" -NoNewline -ForegroundColor White
    Write-Host "                    ║" -ForegroundColor DarkGray

    Write-Host "  ║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Lead Architect" -NoNewline -ForegroundColor DarkCyan
    Write-Host "            " -NoNewline
    Write-Host "║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Vanguard" -NoNewline -ForegroundColor DarkYellow
    Write-Host "                  ║" -ForegroundColor DarkGray

    Write-Host "  ║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Status: " -NoNewline -ForegroundColor Gray
    if ($anvil.Alive) {
        Write-Host "Active" -NoNewline -ForegroundColor Green
    } else {
        Write-Host "DOWN" -NoNewline -ForegroundColor Red
    }
    Write-Host "              " -NoNewline
    Write-Host "║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Status: " -NoNewline -ForegroundColor Gray
    if ($logos.Alive) {
        Write-Host "$($logos.Detail)" -NoNewline -ForegroundColor Green
    } else {
        Write-Host "DOWN" -NoNewline -ForegroundColor Red
    }
    # Pad to fit
    $pad = 18 - $logos.Detail.Length
    if ($pad -lt 0) { $pad = 0 }
    Write-Host (" " * $pad) -NoNewline
    Write-Host "║" -ForegroundColor DarkGray

    Write-Host "  ║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Gateway: " -NoNewline -ForegroundColor Gray
    if ($gw.Alive) {
        Write-Host "Online" -NoNewline -ForegroundColor Green
    } else {
        Write-Host "Offline" -NoNewline -ForegroundColor Red
    }
    Write-Host "             " -NoNewline
    Write-Host "║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Tools: 24 loaded" -NoNewline -ForegroundColor Gray
    Write-Host "          ║" -ForegroundColor DarkGray

    Write-Host "  ╠════════════════════════════╩═════════════════════════════╣" -ForegroundColor DarkGray
    Write-Host "  ║" -NoNewline -ForegroundColor DarkGray
    Write-Host "  Refreshes every ${refreshInterval}s" -NoNewline -ForegroundColor DarkGray
    Write-Host "  |  Ctrl+C to close" -NoNewline -ForegroundColor DarkGray
    Write-Host "          ║" -ForegroundColor DarkGray
    Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor DarkGray
    Write-Host ""
}

# Main loop
while ($true) {
    Show-Dashboard
    Start-Sleep -Seconds $refreshInterval
}
