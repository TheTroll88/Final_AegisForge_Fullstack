<#
.SYNOPSIS
    Gateway control — start, stop, restart, status for the Logos gateway
.DESCRIPTION
    Manages the shared LLM gateway on port 11435.
    Used by both Anvil (infrastructure owner) and Logos (consumer).
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "status"
)

$port = 11435

function Get-GatewayPID {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { return $conn.OwningProcess }
    return $null
}

function Show-Status {
    $pid = Get-GatewayPID
    if ($pid) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        Write-Host "  Gateway: " -NoNewline; Write-Host "ONLINE" -ForegroundColor Green -NoNewline
        Write-Host " (port $port, PID $pid)"
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -TimeoutSec 2 -ErrorAction Stop
            $data = $r.Content | ConvertFrom-Json
            Write-Host "  Health:  " -NoNewline; Write-Host "OK" -ForegroundColor Green
        }
        catch {
            Write-Host "  Health:  " -NoNewline; Write-Host "NOT RESPONDING" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  Gateway: " -NoNewline; Write-Host "OFFLINE" -ForegroundColor Red
    }
}

function Stop-Gateway {
    $pid = Get-GatewayPID
    if ($pid) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "  Gateway stopped (PID $pid)." -ForegroundColor Yellow
    }
    else {
        Write-Host "  Gateway not running." -ForegroundColor DarkGray
    }
}

function Start-Gateway {
    $existing = Get-GatewayPID
    if ($existing) {
        Write-Host "  Gateway already running (PID $existing)." -ForegroundColor Yellow
        return
    }
    $root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
    $python = "$root\.venv\Scripts\python.exe"
    if (-not (Test-Path $python)) {
        Write-Host "  ERROR: Python venv not found at $python" -ForegroundColor Red
        return
    }
    $gateway = "$root\logos\gateway.py"
    if (-not (Test-Path $gateway)) {
        Write-Host "  ERROR: gateway.py not found" -ForegroundColor Red
        return
    }
    Start-Process -FilePath $python -ArgumentList $gateway -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $pid = Get-GatewayPID
    if ($pid) {
        Write-Host "  Gateway started (PID $pid, port $port)." -ForegroundColor Green
    }
    else {
        Write-Host "  Gateway failed to start." -ForegroundColor Red
    }
}

switch ($Action) {
    "status" { Show-Status }
    "stop" { Stop-Gateway }
    "start" { Start-Gateway }
    "restart" { Stop-Gateway; Start-Sleep -Seconds 1; Start-Gateway }
}
