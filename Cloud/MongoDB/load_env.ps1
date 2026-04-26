# =============================================================================
#  AegisForge — Atlas Environment Loader
#  Cloud/MongoDB/load_env.ps1
#
#  Sets MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY as process-scoped
#  env vars from Vault so Terraform and agents can use them without hardcoding.
#  Run: . .\load_env.ps1   (dot-source to persist in current session)
# =============================================================================

$VaultFile = Join-Path $PSScriptRoot "..\..\Vault\Api_keys.txt"
$vaultContent = Get-Content $VaultFile -Raw -ErrorAction Stop

# Atlas API key: format is PublicKey.atlasv1.PrivateKey
$fullKey = if ($vaultContent -match '\[MongoDB Atlas - API Key\]\s*\r?\n(\S+)') { $Matches[1] } else { $null }

if ($fullKey -and $fullKey -match '^([^.]+)\.atlasv1\.(.+)$') {
    $env:MONGODB_ATLAS_PUBLIC_KEY  = $Matches[1]
    $env:MONGODB_ATLAS_PRIVATE_KEY = $Matches[2]
    Write-Host "[AegisForge] Atlas keys loaded into session env vars." -ForegroundColor Green
    Write-Host "[AegisForge] Public Key: $($env:MONGODB_ATLAS_PUBLIC_KEY)" -ForegroundColor DarkGreen
} else {
    Write-Error "Could not parse Atlas API key from Vault. Check Vault/Api_keys.txt [MongoDB Atlas - API Key] entry."
    return
}

# Terraform Cloud token
$tfToken = if ($vaultContent -match '\[Terraform Cloud Token[^\]]*\]\s*\r?\n(\S+)') { $Matches[1] } else { $null }
if ($tfToken) {
    $env:TF_TOKEN_app_terraform_io = $tfToken
    Write-Host "[AegisForge] Terraform Cloud token loaded." -ForegroundColor Green
}

Write-Host "[AegisForge] Environment ready. You can now run: terraform init / plan / apply" -ForegroundColor Cyan
