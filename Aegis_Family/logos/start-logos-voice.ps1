$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process pwsh -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $root "logos-core.ps1")
)

Start-Sleep -Seconds 2

Start-Process pwsh -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $root "logos-voice.ps1")
)

Write-Host "Logos daemon + voice mode started."
