# ============================================================
#  AEGIS FOREMAN STACK — LAUNCH SCRIPT
#  Starts chain, waits for RPC, then starts Foreman
# ============================================================

$scriptDir = Split-Path -Parent $PSCommandPath
$chainPath = Join-Path $scriptDir "node.ts"
$foremanPath = Join-Path $scriptDir "foreman.ts"

# Use master Vault location for Foreman state + keys
$env:FOREMAN_VAULT_DIR = "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Vault\DPAPI_Encrypted\foreman"

Write-Host ""
Write-Host "  Foreman vault: $($env:FOREMAN_VAULT_DIR)"
Write-Host "  Starting Aegis chain..."

$chainJob = Start-Job -ScriptBlock {
  param($path)
  npx tsx $path
} -ArgumentList $chainPath

$rpcReady = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $body = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
    $resp = Invoke-RestMethod -Method Post -Uri "http://localhost:8545" -ContentType "application/json" -Body $body
    if ($resp.result) {
      $rpcReady = $true
      break
    }
  } catch {}
  Start-Sleep -Seconds 1
}

if (-not $rpcReady) {
  Write-Host "  WARNING: Chain RPC did not become ready in time."
  Write-Host "  Foreman will still start in degraded mode."
}

Write-Host "  Starting Foreman..."
Set-Location $scriptDir
npx tsx $foremanPath
