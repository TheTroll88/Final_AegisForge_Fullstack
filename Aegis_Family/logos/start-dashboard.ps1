$dashboardPath = "C:\Users\natha\logos\dashboard\index.html"

if (-not (Test-Path $dashboardPath)) {
  Write-Host "Dashboard file not found: $dashboardPath" -ForegroundColor Red
  exit 1
}

Start-Process $dashboardPath
Write-Host "Dashboard opened."
