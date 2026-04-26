$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$running = Get-Process -Name "pwsh" -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -like "*pwsh*" } catch { $false }
}

Start-Process pwsh -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "logos-core.ps1"))
Write-Host "Logos start requested."
