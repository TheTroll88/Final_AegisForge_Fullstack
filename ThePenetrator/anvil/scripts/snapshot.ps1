<#
.SYNOPSIS
    Snapshot Logos state for emergency recovery
.DESCRIPTION
    Creates a timestamped backup of the logos/ directory into snapshots/.
    Only copies source files, configs, intel — skips __pycache__ and .pyc.
#>

param([string]$Label)

$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$name = if ($Label) { "logos_${timestamp}_${Label}" } else { "logos_$timestamp" }
$dest = Join-Path $root "snapshots\$name"

$source = Join-Path $root "logos"
if (-not (Test-Path $source)) {
    Write-Host "  ERROR: logos/ not found" -ForegroundColor Red
    exit 1
}

Write-Host "  Creating snapshot: $name" -ForegroundColor Cyan

# Copy with exclusions
$exclude = @("__pycache__", "*.pyc", ".pytest_cache")
Copy-Item -Path $source -Destination $dest -Recurse -Force
# Clean up excluded patterns from the copy
Get-ChildItem -Path $dest -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $dest -Recurse -File -Filter "*.pyc" | Remove-Item -Force -ErrorAction SilentlyContinue

$count = (Get-ChildItem -Path $dest -Recurse -File).Count
Write-Host "  Snapshot complete: $count files → snapshots/$name" -ForegroundColor Green
