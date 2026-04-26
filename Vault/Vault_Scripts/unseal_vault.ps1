#!/usr/bin/env pwsh
# AEGIS VAULT UNSEALER — reads DPAPI encrypted vault
# Returns a hashtable of secrets for programmatic use
# Usage: $keys = .\unseal_vault.ps1

param(
    [string]$VaultPath = "D:\DataVault\Vault\aegis_vault.enc",
    [string]$KeyName   = ""  # Optional: return single key
)

Add-Type -AssemblyName System.Security

if (-not (Test-Path $VaultPath)) {
    Write-Error "Vault not found at $VaultPath"
    exit 1
}

$encrypted = [System.IO.File]::ReadAllBytes($VaultPath)
$decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect(
    $encrypted, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
$json = [System.Text.Encoding]::UTF8.GetString($decrypted)
$secrets = $json | ConvertFrom-Json

if ($KeyName) {
    # Return single key as SecureString
    $encStr = $secrets.$KeyName
    if (-not $encStr) {
        Write-Error "Key '$KeyName' not found in vault"
        exit 1
    }
    $ss = $encStr | ConvertTo-SecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    return $plain
} else {
    # Return all key names (never dump values)
    Write-Host "Vault contents ($VaultPath):" -ForegroundColor Cyan
    $secrets.PSObject.Properties.Name | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "Usage: .\unseal_vault.ps1 -KeyName VENICE_LOGOS" -ForegroundColor Yellow
}

# Zero out decrypted bytes
[Array]::Clear($decrypted, 0, $decrypted.Length)
