param(
  [Parameter(Mandatory = $true)]
  [string]$Command,
  [int]$Port = 7788
)

$uri = "http://127.0.0.1:$Port/command"
$payload = @{ command = $Command } | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Body $payload -ContentType "application/json"
  if ($resp.result) { $resp.result } else { $resp | ConvertTo-Json -Depth 10 }
}
catch {
  Write-Host "Logos daemon not reachable on port $Port" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 1
}
