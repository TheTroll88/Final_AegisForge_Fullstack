# ============================================================
# AegisForge — Github_Repos SACL Audit Setup (Requires Admin)
# Run via: Start-Process powershell -Verb RunAs -ArgumentList "-File <this_script>"
# ============================================================

$folder = "C:\Users\natha\OneDrive\Desktop\Final_AegisForge_Fullstack\Github_Repos"
$logFile = "C:\Users\natha\OneDrive\Desktop\AegisForge_AuditLog.txt"

Write-Host "=== AegisForge Elevation Script ===" -ForegroundColor Cyan
Write-Host "Running as: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"

# Verify we're elevated
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Not running as Administrator. Aborting." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}
Write-Host "Elevated: YES`n" -ForegroundColor Green

# --- Step 1: Enable Object Access auditing in local policy ---
Write-Host "[1/3] Enabling Object Access audit policy..." -ForegroundColor Yellow
auditpol /set /subcategory:"File System" /success:enable /failure:enable
Write-Host ""

# --- Step 2: Apply SACL (audit rule) to Github_Repos ---
Write-Host "[2/3] Applying audit SACL to Github_Repos..." -ForegroundColor Yellow
$acl = Get-Acl $folder

# Audit ALL access by Everyone (Success + Failure)
$auditRule = New-Object System.Security.AccessControl.FileSystemAuditRule(
    "Everyone",
    "ReadData,WriteData,Delete,ExecuteFile,ChangePermissions,TakeOwnership",
    "ContainerInherit,ObjectInherit",
    "None",
    "Success,Failure"
)
$acl.AddAuditRule($auditRule)
Set-Acl -Path $folder -AclObject $acl
Write-Host "SACL applied.`n" -ForegroundColor Green

# Verify SACL
Write-Host "Verifying audit rules:"
(Get-Acl $folder).Audit | Format-Table IdentityReference, FileSystemRights, AuditFlags -AutoSize

# Verify DACL is still clean (only natha)
Write-Host "`nVerifying access rules (should be ONLY natha):"
(Get-Acl $folder).Access | Format-Table IdentityReference, FileSystemRights, AccessControlType -AutoSize

# --- Step 3: Log the action ---
Write-Host "[3/3] Writing to audit log..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$entry = @"

[$timestamp] ELEVATION EVENT — Github_Repos Hardening
  Action: SACL audit rule applied (Everyone: Read/Write/Delete/Execute/ChangePerms/TakeOwnership — Success+Failure)
  AuditPol: File System subcategory enabled (success+failure)
  DACL: Unchanged (NATES_PC\natha FullControl only)
  Attributes: SH (System+Hidden)
  Executed by: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
"@

if (-not (Test-Path $logFile)) {
    "# AegisForge Audit Log" | Out-File $logFile -Encoding UTF8
    "# Created: $timestamp" | Out-File $logFile -Append -Encoding UTF8
    "# ================================================" | Out-File $logFile -Append -Encoding UTF8
}
$entry | Out-File $logFile -Append -Encoding UTF8
Write-Host "Logged to: $logFile`n" -ForegroundColor Green

Write-Host "=== COMPLETE ===" -ForegroundColor Cyan
Write-Host "Github_Repos is now audited. Any access attempt (even by you) gets logged to Windows Security Event Log."
Write-Host "Query with: Get-WinEvent -LogName Security -FilterXPath '*[EventData[Data[@Name=""ObjectName""] and contains(Data,""Github_Repos"")]]' -MaxEvents 10"
Write-Host ""
Read-Host "Press Enter to close"
