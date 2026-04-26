#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Aegis Key Rotator — Venice AI
    Uses an existing admin key to create new keys and delete old ones.
    New keys go directly into DPAPI vault. Old keys get invalidated.

.DESCRIPTION
    Flow: Read old key from secure prompt → List existing keys → Create new → Delete old → Seal new in vault

.NOTES
    Author: Anvil (Lead Architect)
    Date: 2026-04-10
    Security: Keys never touch disk in plaintext. Prompt → memory → API → vault → zeroed.
#>

param(
    [string]$VaultPath = "D:\DataVault\Vault\aegis_vault.enc"
)

Add-Type -AssemblyName System.Security

$baseUrl = "https://api.venice.ai/api/v1"

function Invoke-VeniceAPI {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$BearerToken,
        [hashtable]$Body = $null
    )
    $headers = @{ "Authorization" = "Bearer $BearerToken" }
    $params = @{
        Uri         = "$baseUrl$Endpoint"
        Method      = $Method
        Headers     = $headers
        ContentType = "application/json"
        TimeoutSec  = 15
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
    Invoke-RestMethod @params
}

# ── Step 1: Get current admin key securely ──
Write-Host "`nAEGIS KEY ROTATOR — Venice AI" -ForegroundColor Cyan
Write-Host "This will create new keys and invalidate old ones.`n" -ForegroundColor Yellow

$secureKey = Read-Host -Prompt "Paste a current Venice admin key" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$adminKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

# ── Step 2: List existing keys ──
Write-Host "`nListing existing keys..." -ForegroundColor Cyan
try {
    $existing = Invoke-VeniceAPI -Endpoint "/api_keys" -BearerToken $adminKey
    $keyList = if ($existing.data) { $existing.data } else { $existing }
    Write-Host "Found $($keyList.Count) existing keys:" -ForegroundColor Green
    foreach ($k in $keyList) {
        $masked = if ($k.key) { $k.key.Substring(0, [math]::Min(12, $k.key.Length)) + "..." } else { "(hidden)" }
        Write-Host "  ID: $($k.id) | Name: $($k.name) | Key: $masked"
    }
} catch {
    Write-Host "Failed to list keys: $($_.Exception.Message)" -ForegroundColor Red
    $adminKey = $null
    exit 1
}

# ── Step 3: Create new keys ──
$labels = @("Aegis_Logos", "Aegis_Vixen", "Aegis_Inference", "Aegis_Spare")
$newKeys = @{}

Write-Host "`nCreating $($labels.Count) new keys..." -ForegroundColor Cyan
foreach ($label in $labels) {
    try {
        $result = Invoke-VeniceAPI -Endpoint "/api_keys" -Method "POST" -BearerToken $adminKey -Body @{ name = $label }
        $newKey = if ($result.key) { $result.key } elseif ($result.data.key) { $result.data.key } else { $result }
        $newId = if ($result.id) { $result.id } elseif ($result.data.id) { $result.data.id } else { "unknown" }
        $newKeys[$label] = @{ key = $newKey; id = $newId }
        $masked = $newKey.ToString().Substring(0, [math]::Min(12, $newKey.ToString().Length)) + "..."
        Write-Host "  CREATED: $label → $masked (ID: $newId)" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $label — $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($newKeys.Count -eq 0) {
    Write-Host "`nNo new keys created. Aborting." -ForegroundColor Red
    $adminKey = $null
    exit 1
}

# ── Step 4: Seal new keys into DPAPI vault ──
Write-Host "`nSealing new keys into vault..." -ForegroundColor Cyan
$vaultData = @{}

# Load existing vault if present
if (Test-Path $VaultPath) {
    try {
        $enc = [System.IO.File]::ReadAllBytes($VaultPath)
        $dec = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        $json = [System.Text.Encoding]::UTF8.GetString($dec)
        $vaultData = $json | ConvertFrom-Json | ForEach-Object {
            $ht = @{}; $_.PSObject.Properties | ForEach-Object { $ht[$_.Name] = $_.Value }; $ht
        }
        [Array]::Clear($dec, 0, $dec.Length)
        Write-Host "  Loaded existing vault entries" -ForegroundColor Gray
    } catch {
        Write-Host "  Fresh vault (no existing data)" -ForegroundColor Gray
    }
}

# Add new Venice keys (as SecureString-encrypted strings)
foreach ($label in $newKeys.Keys) {
    $ss = ConvertTo-SecureString $newKeys[$label].key -AsPlainText -Force
    $vaultData["VENICE_$label"] = $ss | ConvertFrom-SecureString
}

# Write vault
$vaultJson = $vaultData | ConvertTo-Json -Compress
$vaultBytes = [System.Text.Encoding]::UTF8.GetBytes($vaultJson)
$encrypted = [System.Security.Cryptography.ProtectedData]::Protect(
    $vaultBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[System.IO.File]::WriteAllBytes($VaultPath, $encrypted)
[Array]::Clear($vaultBytes, 0, $vaultBytes.Length)
Write-Host "  Vault sealed: $VaultPath ($($encrypted.Length) bytes)" -ForegroundColor Green

# ── Step 5: Prompt for old key deletion ──
Write-Host "`n⚠ OLD KEY DELETION" -ForegroundColor Yellow
Write-Host "The following old keys can be deleted:" -ForegroundColor Yellow
foreach ($k in $keyList) {
    if ($newKeys.Values.id -notcontains $k.id) {
        Write-Host "  ID: $($k.id) | Name: $($k.name)"
    }
}

$confirm = Read-Host "`nDelete old keys? (yes/no)"
if ($confirm -eq "yes") {
    foreach ($k in $keyList) {
        if ($newKeys.Values.id -notcontains $k.id) {
            try {
                Invoke-VeniceAPI -Endpoint "/api_keys/$($k.id)" -Method "DELETE" -BearerToken $adminKey
                Write-Host "  DELETED: $($k.name) ($($k.id))" -ForegroundColor Red
            } catch {
                Write-Host "  Failed to delete $($k.id): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "  Skipped deletion. Old keys remain active." -ForegroundColor Yellow
}

# ── Cleanup ──
$adminKey = $null
$newKeys = $null
Write-Host "`nRotation complete." -ForegroundColor Green
