param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "logos.config.json"),
  [double]$MinConfidence = 0.55,
  [switch]$NoSpeak
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
  throw "Missing config file: $ConfigPath"
}

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$port = [int]$config.Port
$endpoint = "http://127.0.0.1:$port/command"

function Invoke-LogosCommand {
  param([string]$Command)

  $payload = @{ command = $Command; source = "voice" } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $endpoint -Body $payload -ContentType "application/json" -TimeoutSec 90
    if ($resp -and $resp.result) { return [string]$resp.result }
    return "No response."
  }
  catch {
    return "Logos unavailable on port $port. Start logos-core first."
  }
}

Add-Type -AssemblyName System.Speech

try {
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo("en-US")
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
}
catch {
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
}

$recognizer.SetInputToDefaultAudioDevice()
$dictation = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($dictation)

$synth = $null
if (-not $NoSpeak) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SetOutputToDefaultAudioDevice()
}

Write-Host "Logos voice mode ready." -ForegroundColor Cyan
Write-Host "Speak naturally. Say 'stop listening' or 'quit' to exit." -ForegroundColor DarkGray
Write-Host "Say '/status' or '/task list' for direct commands." -ForegroundColor DarkGray

while ($true) {
  try {
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds(30))
  }
  catch {
    continue
  }

  if ($null -eq $result) { continue }
  $text = [string]$result.Text
  $confidence = [double]$result.Confidence

  if ([string]::IsNullOrWhiteSpace($text)) { continue }
  if ($confidence -lt $MinConfidence) {
    Write-Host "(low confidence: $([math]::Round($confidence,2))) $text" -ForegroundColor DarkGray
    continue
  }

  $text = $text.Trim()
  $lower = $text.ToLowerInvariant()

  if ($lower -in @("stop listening", "quit", "exit", "logos stop")) {
    Write-Host "Stopping voice mode." -ForegroundColor Yellow
    break
  }

  $command = ""

  if ($text.StartsWith("/")) {
    $command = $text.Substring(1)
  }
  elseif ($lower.StartsWith("logos ")) {
    $command = "brain ask " + $text.Substring(6)
  }
  else {
    $command = "brain ask $text"
  }

  Write-Host "You: $text" -ForegroundColor Green
  $reply = Invoke-LogosCommand -Command $command
  Write-Host "Logos: $reply" -ForegroundColor Magenta

  if ($synth -and -not [string]::IsNullOrWhiteSpace($reply)) {
    $spoken = if ($reply.Length -gt 800) { $reply.Substring(0, 800) } else { $reply }
    $synth.SpeakAsyncCancelAll()
    $synth.SpeakAsync($spoken) | Out-Null
  }
}

if ($synth) { $synth.Dispose() }
$recognizer.Dispose()
