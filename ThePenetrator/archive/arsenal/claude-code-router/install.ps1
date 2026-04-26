# Claude Code Router — One-shot install & configure
# Run from this directory: .\install.ps1

$ErrorActionPreference = "Stop"

# Check Node.js
$nodeVer = node --version 2>$null
if (-not $nodeVer) {
    Write-Host "Node.js not found. Install v18+ first." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js $nodeVer" -ForegroundColor Green

# Install Claude Code CLI
Write-Host "Installing Claude Code CLI..." -ForegroundColor Cyan
npm install -g @anthropic-ai/claude-code

# Install the router
Write-Host "Installing claude-code-router..." -ForegroundColor Cyan
npm install -g @musistudio/claude-code-router

# Create config directory
$configDir = Join-Path $HOME ".claude-code-router"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Copy config
$src = Join-Path $PSScriptRoot "config.json"
$dst = Join-Path $configDir "config.json"
Copy-Item $src $dst -Force
Write-Host "Config deployed to $dst" -ForegroundColor Green

# Check for Venice API key
$keyFile = Join-Path $HOME ".venice_key"
$hasEnv = [bool]$env:VENICE_API_KEY
$hasFile = Test-Path $keyFile

if ($hasEnv) {
    Write-Host "VENICE_API_KEY found in environment." -ForegroundColor Green
}
elseif ($hasFile) {
    $key = (Get-Content $keyFile -Raw).Trim()
    $env:VENICE_API_KEY = $key
    Write-Host "Loaded key from ~/.venice_key" -ForegroundColor Green
}
else {
    Write-Host "No Venice API key found. Set VENICE_API_KEY env var or create ~/.venice_key" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Ready. Run:" -ForegroundColor Cyan
Write-Host "  ccr start     # start the router proxy"
Write-Host "  ccr code      # launch Claude Code through the router"
Write-Host "  ccr ui        # visual config editor"
Write-Host "  ccr model     # switch models interactively"
