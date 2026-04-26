$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

Write-Host "Using repo root: $repoRoot" -ForegroundColor Cyan

if (-not (Test-Path ".\package.json")) {
    throw "package.json not found in repo root."
}

if (Test-Path ".\node_modules") {
    Remove-Item ".\node_modules" -Recurse -Force
}

if (Test-Path ".\package-lock.json") {
    Remove-Item ".\package-lock.json" -Force
}

npm cache verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm start
exit $LASTEXITCODE
