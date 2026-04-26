# ============================================================================
#  MASTER VAULT — UNSEAL (DPAPI Decrypt)
#  Decrypts all .txt.enc files back to .txt
#  Only works on this machine, with this Windows user
# ============================================================================

Add-Type -AssemblyName System.Security

$vaultDir = Split-Path -Parent $PSCommandPath
$files = Get-ChildItem $vaultDir -Recurse -Include "*.txt.enc" -File

if ($files.Count -eq 0) {
    Write-Host "No encrypted .enc files found — vault may already be unsealed." -ForegroundColor Yellow
    exit 0
}

Write-Host "Unsealing $($files.Count) files with DPAPI..." -ForegroundColor Cyan

foreach ($f in $files) {
    try {
        $encrypted = [System.IO.File]::ReadAllBytes($f.FullName)
        $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $encrypted, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        $plainPath = $f.FullName -replace '\.enc$', ''
        [System.IO.File]::WriteAllBytes($plainPath, $decrypted)
        Remove-Item $f.FullName -Force
        Write-Host "  Unsealed: $($f.Name -replace '\.enc$','')" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $($f.Name) — $_" -ForegroundColor Red
    }
}

Write-Host "`nVault UNSEALED. Files are now readable." -ForegroundColor Cyan
Write-Host "Run seal_master_vault.ps1 when done to re-encrypt." -ForegroundColor Yellow
