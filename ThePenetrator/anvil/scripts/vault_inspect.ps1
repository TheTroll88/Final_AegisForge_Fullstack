<#
.SYNOPSIS
    Quick vault inspector — lists DPAPI vault secrets without exposing values
.DESCRIPTION
    Finds the DPAPI vault directory and lists what secrets are stored.
    Never displays actual secret values — only names and metadata.
#>

$vaultPaths = @(
    "$env:USERPROFILE\.logos\vault",
    "$env:APPDATA\.logos\vault",
    (Join-Path (Split-Path $PSScriptRoot -Parent | Split-Path -Parent) ".vault")
)

$vaultDir = $null
foreach ($p in $vaultPaths) {
    if (Test-Path $p) { $vaultDir = $p; break }
}

if (-not $vaultDir) {
    Write-Host "  No vault found at expected paths." -ForegroundColor Yellow
    Write-Host "  Searched:" -ForegroundColor DarkGray
    foreach ($p in $vaultPaths) { Write-Host "    $p" -ForegroundColor DarkGray }
    exit 1
}

Write-Host "`n  ── DPAPI Vault ──" -ForegroundColor Cyan
Write-Host "  Location: $vaultDir`n" -ForegroundColor DarkGray

$files = Get-ChildItem -Path $vaultDir -File -ErrorAction SilentlyContinue
if ($files.Count -eq 0) {
    Write-Host "  (empty)" -ForegroundColor DarkGray
    exit 0
}

foreach ($f in $files | Sort-Object Name) {
    $size = $f.Length
    $modified = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    $sizeStr = if ($size -lt 1024) { "${size}B" } else { "$([math]::Round($size/1024, 1))KB" }
    Write-Host "  ● " -NoNewline -ForegroundColor Green
    Write-Host "$($f.BaseName)" -NoNewline -ForegroundColor White
    Write-Host "  ($sizeStr, $modified)" -ForegroundColor DarkGray
}

Write-Host "`n  Total: $($files.Count) secrets`n" -ForegroundColor Cyan
