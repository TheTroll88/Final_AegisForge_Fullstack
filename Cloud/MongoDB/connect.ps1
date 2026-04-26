# =============================================================================
#  AegisForge — MongoDB Atlas Connect
#  Cloud/MongoDB/connect.ps1
#
#  Loads credentials from Vault at runtime and opens mongosh to cluster0.
#  Usage:
#    .\connect.ps1                   # interactive shell
#    .\connect.ps1 -Eval "show dbs"  # run single command and exit
# =============================================================================
param(
    [string]$Eval = ""
)

$VaultFile = Join-Path $PSScriptRoot "..\..\Vault\Api_keys.txt"

# --- Parse credentials from Vault ---
$vaultContent = Get-Content $VaultFile -Raw -ErrorAction Stop

$username = if ($vaultContent -match 'Username:\s*(\S+)') { $Matches[1] } else { $null }
$password  = if ($vaultContent -match 'Password:\s*(\S+)') { $Matches[1] } else { $null }
$uri       = if ($vaultContent -match 'URI:\s*(\S+)') { $Matches[1] } else { $null }

if (-not $username -or -not $password -or -not $uri) {
    Write-Error "Could not parse Atlas credentials from Vault. Check Vault/Api_keys.txt."
    exit 1
}

Write-Host "[AegisForge] Connecting to MongoDB Atlas cluster..." -ForegroundColor Cyan
Write-Host "[AegisForge] Host: $uri" -ForegroundColor DarkCyan
Write-Host "[AegisForge] User: $username" -ForegroundColor DarkCyan

if ($Eval) {
    mongosh $uri --apiVersion 1 --username $username --password $password --eval $Eval
} else {
    mongosh $uri --apiVersion 1 --username $username --password $password
}
