<#
.SYNOPSIS
    Workspace health check — validates structure, sovereignty, and infrastructure
.DESCRIPTION
    Runs a diagnostic pass confirming all expected directories exist, Logos sovereignty
    is intact, gateway is reachable, and the vault has expected secrets.
#>

param([switch]$Quiet)

$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$pass = 0; $fail = 0; $warn = 0

function Check($label, $test) {
    if ($test) {
        if (-not $Quiet) { Write-Host "  PASS  " -NoNewline -ForegroundColor Green; Write-Host $label }
        $script:pass++
    }
    else {
        Write-Host "  FAIL  " -NoNewline -ForegroundColor Red; Write-Host $label
        $script:fail++
    }
}

function Warn($label) {
    Write-Host "  WARN  " -NoNewline -ForegroundColor Yellow; Write-Host $label
    $script:warn++
}

Write-Host "`n  ── Anvil Workspace Health Check ──`n" -ForegroundColor Cyan

# Structure
Check "anvil/ exists"          (Test-Path "$root\anvil")
Check "anvil/configs/ exists"  (Test-Path "$root\anvil\configs")
Check "anvil/scripts/ exists"  (Test-Path "$root\anvil\scripts")
Check "anvil/tools/ exists"    (Test-Path "$root\anvil\tools")
Check "anvil/logs/ exists"     (Test-Path "$root\anvil\logs")
Check "anvil/intel/ exists"    (Test-Path "$root\anvil\intel")
Check "logos/ exists"          (Test-Path "$root\logos")
Check "snapshots/ exists"      (Test-Path "$root\snapshots")
Check "archive/ exists"        (Test-Path "$root\archive")
Check ".venv/ exists"          (Test-Path "$root\.venv")

# Sovereignty
$logosFiles = @("__init__.py", "__main__.py", "agent.py", "boot.py", "cli.py", "gateway.py", "config.py")
foreach ($f in $logosFiles) {
    Check "logos/$f intact" (Test-Path "$root\logos\$f")
}

# Gateway
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:11435/health" -TimeoutSec 2 -ErrorAction Stop
    Check "Gateway reachable (port 11435)" $true
}
catch {
    Warn "Gateway offline (port 11435)"
}

# Vault
$vaultPaths = @(
    "$env:USERPROFILE\.logos\vault",
    "$env:APPDATA\.logos\vault"
)
$vaultFound = $false
foreach ($vp in $vaultPaths) {
    if (Test-Path $vp) { $vaultFound = $true; break }
}
if ($vaultFound) {
    Check "DPAPI vault directory found" $true
}
else {
    Warn "DPAPI vault not found at expected paths"
}

# No junk at root
$rootFiles = Get-ChildItem -Path $root -File -ErrorAction SilentlyContinue
if ($rootFiles.Count -eq 0) {
    Check "Workspace root clean (no loose files)" $true
}
else {
    Warn "Root has $($rootFiles.Count) loose file(s): $($rootFiles.Name -join ', ')"
}

# Summary
Write-Host ""
Write-Host "  ── Results: " -NoNewline -ForegroundColor Cyan
Write-Host "$pass passed" -NoNewline -ForegroundColor Green
if ($fail -gt 0) { Write-Host ", $fail failed" -NoNewline -ForegroundColor Red }
if ($warn -gt 0) { Write-Host ", $warn warnings" -NoNewline -ForegroundColor Yellow }
Write-Host " ──`n" -ForegroundColor Cyan

if ($fail -gt 0) { exit 1 } else { exit 0 }
