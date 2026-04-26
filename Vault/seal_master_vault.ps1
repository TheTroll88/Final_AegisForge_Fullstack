# ============================================================================
#  MASTER VAULT — SEAL (DPAPI Encrypt)
#  Encrypts all .txt files in Vault/ to .txt.enc and removes plaintext
#  Only YOUR Windows user account can unseal
# ============================================================================
param([switch]$Force)

$vaultDir = Split-Path -Parent $PSCommandPath
$files = Get-ChildItem $vaultDir -Recurse -Include "*.txt" -File

if ($files.Count -eq 0) {
    Write-Host "No plaintext .txt files found — vault may already be sealed." -ForegroundColor Yellow
    exit 0
}

Write-Host "Sealing $($files.Count) files with DPAPI..." -ForegroundColor Cyan

foreach ($f in $files) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
        $encrypted = [System.Security.Cryptography.ProtectedData]::Protect(
            $bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [System.IO.File]::WriteAllBytes("$($f.FullName).enc", $encrypted)
        Remove-Item $f.FullName -Force
        Write-Host "  Sealed: $($f.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $($f.Name) — $_" -ForegroundColor Red
    }
}

Write-Host "`nVault SEALED. Run unseal_master_vault.ps1 to decrypt." -ForegroundColor Cyan
