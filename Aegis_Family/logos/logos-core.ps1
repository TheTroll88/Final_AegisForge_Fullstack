$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $root "logos.config.json"
if (-not (Test-Path $configPath)) { throw "Missing logos.config.json" }
$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json

if (-not $config.PSObject.Properties.Name.Contains("Brain")) {
  $config | Add-Member -NotePropertyName Brain -NotePropertyValue ([PSCustomObject]@{
    Provider = "builtin"
    Endpoint = ""
    Model = ""
  })
}

if (-not $config.Brain.PSObject.Properties.Name.Contains("Provider")) { $config.Brain | Add-Member -NotePropertyName Provider -NotePropertyValue "builtin" }
if (-not $config.Brain.PSObject.Properties.Name.Contains("Endpoint")) { $config.Brain | Add-Member -NotePropertyName Endpoint -NotePropertyValue "" }
if (-not $config.Brain.PSObject.Properties.Name.Contains("Model")) { $config.Brain | Add-Member -NotePropertyName Model -NotePropertyValue "" }

function Save-Config {
  ($config | ConvertTo-Json -Depth 50) | Set-Content -Path $configPath -Encoding UTF8
}

$dataDir = $config.DataDir
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

$memoryPath = Join-Path $dataDir "memory.json"
$tasksPath = Join-Path $dataDir "tasks.json"
$knowledgePath = Join-Path $dataDir "knowledge.json"
$contextPath = Join-Path $dataDir "context.json"
$logPath = Join-Path $dataDir "logos.log"
$backupDir = Join-Path $dataDir "backups"

if (-not (Test-Path $memoryPath)) { "{}" | Set-Content $memoryPath -Encoding UTF8 }
if (-not (Test-Path $tasksPath)) { "[]" | Set-Content $tasksPath -Encoding UTF8 }
if (-not (Test-Path $knowledgePath)) { "{}" | Set-Content $knowledgePath -Encoding UTF8 }
if (-not (Test-Path $contextPath)) { "{}" | Set-Content $contextPath -Encoding UTF8 }
if (-not (Test-Path $logPath)) { New-Item -ItemType File -Path $logPath -Force | Out-Null }
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logPath -Value $line
}

function Read-JsonHashtable([string]$path) {
  $raw = Get-Content -Raw -Path $path
  if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
  return ($raw | ConvertFrom-Json -AsHashtable)
}

function Save-Json([string]$path, $obj) {
  ($obj | ConvertTo-Json -Depth 50) | Set-Content -Path $path -Encoding UTF8
}

function Get-Tasks {
  $raw = Get-Content -Raw -Path $tasksPath
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  $obj = $raw | ConvertFrom-Json
  if ($null -eq $obj) { return @() }
  return @($obj)
}

function Save-Tasks([array]$tasks) {
  Save-Json -path $tasksPath -obj $tasks
}

function Get-SelfCheck {
  $result = [ordered]@{
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    scriptPath = (Join-Path $root "logos-core.ps1")
    syntaxOk = $false
    logTail = @()
  }

  try {
    $code = Get-Content -Raw -Path $result.scriptPath
    $null = [scriptblock]::Create($code)
    $result.syntaxOk = $true
  }
  catch {
    $result.syntaxOk = $false
    $result.error = $_.Exception.Message
  }

  try {
    $result.logTail = @(Get-Content -Path $logPath -Tail 20 -ErrorAction SilentlyContinue)
  }
  catch {
    $result.logTail = @()
  }

  return $result
}

function Backup-Core {
  $corePath = Join-Path $root "logos-core.ps1"
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupPath = Join-Path $backupDir ("logos-core_{0}.ps1.bak" -f $stamp)
  Copy-Item -Path $corePath -Destination $backupPath -Force
  return $backupPath
}

function Update-CorePatch([string]$oldText, [string]$newText) {
  $corePath = Join-Path $root "logos-core.ps1"
  $content = Get-Content -Raw -Path $corePath
  if (-not $content.Contains($oldText)) {
    return "patch failed: old_text not found"
  }

  $backupPath = Backup-Core
  $patched = $content.Replace($oldText, $newText)
  Set-Content -Path $corePath -Value $patched -Encoding UTF8

  try {
    $null = [scriptblock]::Create((Get-Content -Raw -Path $corePath))
    return "patch ok; backup=$backupPath; restart required"
  }
  catch {
    Copy-Item -Path $backupPath -Destination $corePath -Force
    return "patch reverted due to syntax error: $($_.Exception.Message)"
  }
}

function Restore-Core {
  $corePath = Join-Path $root "logos-core.ps1"
  $latest = Get-ChildItem -Path $backupDir -Filter "logos-core_*.ps1.bak" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($null -eq $latest) { return "restore failed: no backups" }
  Copy-Item -Path $latest.FullName -Destination $corePath -Force
  return "restore ok: $($latest.Name); restart required"
}

function Invoke-SpeechRecognition {
  try {
    [void] [System.Reflection.Assembly]::LoadWithPartialName("System.Speech")
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    $recognizer.SetInputToDefaultAudioDevice()

    $grammar = New-Object System.Speech.Recognition.DictationGrammar
    $recognizer.LoadGrammar($grammar)

    $result = $recognizer.Recognize([timespan]::FromSeconds(10))

    if ($result -and $result.Confidence -gt 0.5) {
      return $result.Text
    }
    return ""
  }
  catch {
    return "error: $($_.Exception.Message)"
  }
}

function Invoke-BuiltinBrain([string]$prompt) {
  $memory = Read-JsonHashtable $memoryPath
  $context = Read-JsonHashtable $contextPath
  $tasks = Get-Tasks
  $knowledge = Read-JsonHashtable $knowledgePath

  $openTasks = @($tasks | Where-Object { $_.status -eq "open" })
  $doneTasks = @($tasks | Where-Object { $_.status -eq "done" })
  $goal = if ($memory.ContainsKey("primary_goal")) { [string]$memory["primary_goal"] } else { "" }
  $ctxFile = if ($context.ContainsKey("filePath")) { [string]$context["filePath"] } else { "" }

  $lower = $prompt.ToLowerInvariant()

  # Status queries
  if ($lower -match "status|how are you|up") {
    $msg = "Online and ready. "
    if ($openTasks.Count -gt 0) { $msg += "$($openTasks.Count) task$(if ($openTasks.Count -ne 1) { 's' }) open. " }
    if ($doneTasks.Count -gt 0) { $msg += "$($doneTasks.Count) completed. " }
    if ($ctxFile) { $msg += "Working in $ctxFile." }
    return $msg.Trim()
  }

  # Task questions
  if ($lower -match "next|what.*do|what.*task") {
    if ($openTasks.Count -gt 0) {
      $first = $openTasks[0]
      return "Next up: [$($first.id)] $($first.title) - created $($first.createdAt)"
    }
    return "All tasks done. Add a new one with 'task add <description>'"
  }

  # Memory/goal questions
  if ($lower -match "goal|objective|aim") {
    if ($goal) { return "Current goal: $goal" }
    return "No primary goal set. Use 'remember primary_goal <text>' to set one."
  }

  # Context questions
  if ($lower -match "context|file|where|current") {
    if ($ctxFile) { return "Working context: $ctxFile" }
    return "No context file set. Context is updated when you send editor selections."
  }

  # Knowledge/learn questions
  if ($lower -match "what do you know|tell me about|explain") {
    $topics = @($knowledge.PSObject.Properties | Select-Object -ExpandProperty Name)
    if ($topics.Count -gt 0) {
      return "I know about: $($topics -join ', ')"
    }
    return "I haven't learned anything yet. Use 'learn <topic>' to teach me."
  }

  # Help request
  if ($lower -match "help|\?$") {
    return "Available: status, tasks, context, memory, knowledge. Try 'task add <text>' or 'remember <key> <value>'"
  }

  # Default: thoughtful response attempt
  if ($lower.Length -lt 10) {
    # Short input - probably a greeting or single word
    if ($lower -match "hi|hey|hello|yo") { return "Hey there. What can I help with?" }
    if ($lower -match "ok|good|great|yes|cool") { return "Cool. Ready for the next thing." }
    if ($lower -match "no|nope|stop|cancel") { return "Understood. What now?" }
    return "Tell me more."
  }

  # Longer input - attempt to infer intent
  $hasQuestionMark = $prompt -like "*?*"
  if ($hasQuestionMark) {
    # Question detected - try to answer
    if ($lower -match "how|what|why|when|where|who") {
      return "I need more context. Are you asking about a task, the current file, or something else?"
    }
  }

  if ($lower -match "code|debug|fix|help") {
    return "I'm here to help with code. Share a problem or file context and I'll do what I can."
  }

  if ($lower -match "remember|save|store") {
    return "Use 'remember <key> <value>' format to save something. Example: remember project_name MyApp"
  }

  # Fallback: acknowledge and ask for clarity
  return "Got it. How would you like me to help?"
}

function Invoke-Brain([string]$prompt) {
  $provider = [string]$config.Brain.Provider
  $endpoint = [string]$config.Brain.Endpoint
  $model = [string]$config.Brain.Model

  if ([string]::IsNullOrWhiteSpace($provider) -or $provider -eq "none") {
    return (Invoke-BuiltinBrain -prompt $prompt)
  }

  switch ($provider.ToLowerInvariant()) {
    "builtin" {
      return (Invoke-BuiltinBrain -prompt $prompt)
    }
    "ollama" {
      if ([string]::IsNullOrWhiteSpace($endpoint)) { $endpoint = "http://127.0.0.1:11434" }
      if ([string]::IsNullOrWhiteSpace($model)) { return "brain model is empty" }
      $uri = "$endpoint/api/generate"
      $payload = @{ model = $model; prompt = $prompt; stream = $false } | ConvertTo-Json -Depth 10
      try {
        $resp = Invoke-RestMethod -Method Post -Uri $uri -Body $payload -ContentType "application/json" -TimeoutSec 60
        if ($resp.response) { return [string]$resp.response }
        return ($resp | ConvertTo-Json -Depth 10)
      }
      catch {
        return (Invoke-BuiltinBrain -prompt $prompt)
      }
    }
    default {
      return (Invoke-BuiltinBrain -prompt $prompt)
    }
  }
}

function Invoke-LogosCommand([string]$line) {
  if ([string]::IsNullOrWhiteSpace($line)) { return "empty command" }
  $parts = $line.Split(" ", 2)
  $cmd = $parts[0].ToLowerInvariant()
  $rest = if ($parts.Count -gt 1) { $parts[1] } else { "" }

  switch ($cmd) {
    "status" {
      $os = Get-CimInstance Win32_OperatingSystem
      $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
      $freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
      $c = Get-PSDrive C
      return "mem_used=$([math]::Round($totalGB-$freeGB,2))GB mem_total=${totalGB}GB disk_free=$([math]::Round($c.Free/1GB,2))GB"
    }
    "remember" {
      $sub = $rest.Split(" ", 2)
      if ($sub.Count -lt 2) { return "usage: remember <key> <value>" }
      $m = Read-JsonHashtable $memoryPath
      $m[$sub[0]] = $sub[1]
      Save-Json $memoryPath $m
      return "ok remembered $($sub[0])"
    }
    "recall" {
      $m = Read-JsonHashtable $memoryPath
      if (-not $rest) { return ($m | ConvertTo-Json -Depth 20) }
      if ($m.ContainsKey($rest)) { return [string]$m[$rest] }
      return "not found"
    }
    "learn" {
      $sub = $rest.Split(" ", 2)
      if ($sub.Count -lt 2) { return "usage: learn <topic> <text>" }
      $k = Read-JsonHashtable $knowledgePath
      if (-not $k.ContainsKey($sub[0])) { $k[$sub[0]] = @() }
      $k[$sub[0]] += @("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $sub[1])
      Save-Json $knowledgePath $k
      return "ok learned $($sub[0])"
    }
    "task" {
      $sub = $rest.Split(" ", 2)
      $action = $sub[0].ToLowerInvariant()
      $arg = if ($sub.Count -gt 1) { $sub[1] } else { "" }
      $tasks = Get-Tasks
      switch ($action) {
        "add" {
          if (-not $arg) { return "usage: task add <text>" }
          $id = if ($tasks.Count -eq 0) { 1 } else { (($tasks | Measure-Object -Property id -Maximum).Maximum + 1) }
          $tasks += [PSCustomObject]@{ id=$id; title=$arg; status="open"; createdAt=(Get-Date -Format "yyyy-MM-dd HH:mm:ss") }
          Save-Tasks $tasks
          return "ok task #$id"
        }
        "list" {
          return ($tasks | ConvertTo-Json -Depth 10)
        }
        "done" {
          [int]$id = 0
          if (-not [int]::TryParse($arg, [ref]$id)) { return "usage: task done <id>" }
          $t = $tasks | Where-Object { $_.id -eq $id } | Select-Object -First 1
          if ($null -eq $t) { return "not found" }
          $t.status = "done"
          $t.completedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
          Save-Tasks $tasks
          return "ok done #$id"
        }
        default { return "usage: task <add|list|done> ..." }
      }
    }
    "web" {
      $sub = $rest.Split(" ", 2)
      $action = $sub[0].ToLowerInvariant()
      $arg = if ($sub.Count -gt 1) { $sub[1] } else { "" }
      switch ($action) {
        "open" {
          if (-not $arg) { return "usage: web open <url>" }
          $url = if ($arg -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') { $arg } else { "https://$arg" }
          Start-Process $url
          return "ok opened $url"
        }
        "fetch" {
          if (-not $arg) { return "usage: web fetch <url>" }
          $url = if ($arg -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') { $arg } else { "https://$arg" }
          try {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
            return "status=$($resp.StatusCode) bytes=$($resp.Content.Length)"
          } catch {
            return "fetch failed: $($_.Exception.Message)"
          }
        }
        default { return "usage: web <open|fetch> <url>" }
      }
    }
    "exec" {
      if (-not $config.AllowExec) { return "exec disabled" }
      if (-not $rest) { return "usage: exec <command>" }
      try {
        $out = Invoke-Expression $rest | Out-String
        return $out.Trim()
      } catch {
        return "exec failed: $($_.Exception.Message)"
      }
    }
    "self" {
      $sub = $rest.Split(" ", 2)
      $action = $sub[0].ToLowerInvariant()
      $arg = if ($sub.Count -gt 1) { $sub[1] } else { "" }
      switch ($action) {
        "check" {
          $check = Get-SelfCheck
          return ($check | ConvertTo-Json -Depth 20)
        }
        "patch" {
          if (-not $arg.Contains("=>")) { return "usage: self patch <old_text> => <new_text>" }
          $patchParts = $arg.Split("=>", 2)
          $oldText = $patchParts[0].Trim()
          $newText = $patchParts[1].Trim()
          if ([string]::IsNullOrWhiteSpace($oldText)) { return "patch failed: old_text empty" }
          return (Apply-CorePatch -oldText $oldText -newText $newText)
        }
        "rollback" {
          return (Rollback-Core)
        }
        default {
          return "usage: self <check|patch|rollback>"
        }
      }
    }
    "brain" {
      $sub = $rest.Split(" ", 2)
      $action = $sub[0].ToLowerInvariant()
      $arg = if ($sub.Count -gt 1) { $sub[1] } else { "" }
      switch ($action) {
        "show" {
          return ($config.Brain | ConvertTo-Json -Depth 10)
        }
        "set" {
          $setParts = $arg.Split(" ")
          if ($setParts.Count -lt 3) { return "usage: brain set <provider> <endpoint> <model>" }
          $config.Brain.Provider = $setParts[0]
          $config.Brain.Endpoint = $setParts[1]
          $config.Brain.Model = $setParts[2]
          Save-Config
          return "brain config saved"
        }
        "ask" {
          if ([string]::IsNullOrWhiteSpace($arg)) { return "usage: brain ask <prompt>" }
          return (Invoke-Brain -prompt $arg)
        }
        default {
          return "usage: brain <show|set|ask> ..."
        }
      }
    }
    default {
      return "unknown command"
    }
  }
}

function Update-LogosContext($obj) {
  $ctx = Read-JsonHashtable $contextPath
  foreach ($k in $obj.PSObject.Properties.Name) {
    $ctx[$k] = $obj.$k
  }
  $ctx["updatedAt"] = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  Save-Json $contextPath $ctx
  return "ok"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$($config.Port)/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Logos running on $prefix" -ForegroundColor Cyan
Write-Log "started $prefix"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $body = ""

    $res.Headers["Access-Control-Allow-Origin"] = "*"
    $res.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    $res.Headers["Access-Control-Allow-Headers"] = "Content-Type"

    if ($req.HttpMethod -eq "OPTIONS") {
      $res.StatusCode = 204
      $res.OutputStream.Close()
      continue
    }

    try {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $body = $reader.ReadToEnd()
      $reader.Close()

      if ($req.HttpMethod -eq "GET" -and $req.Url.AbsolutePath -eq "/state") {
        $state = [PSCustomObject]@{
          name = $config.Name
          memory = Read-JsonHashtable $memoryPath
          tasks = Get-Tasks
          context = Read-JsonHashtable $contextPath
        }
        $json = $state | ConvertTo-Json -Depth 50
      }
      elseif ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/command") {
        $obj = if ($body) { $body | ConvertFrom-Json } else { $null }
        $cmd = if ($obj -and $obj.command) { [string]$obj.command } else { "" }
        $result = Invoke-LogosCommand -line $cmd
        $json = ([PSCustomObject]@{ ok=$true; result=$result }) | ConvertTo-Json -Depth 10
        Write-Log "cmd: $cmd"
      }
      elseif ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/context/vscode") {
        $obj = if ($body) { $body | ConvertFrom-Json } else { $null }
        $r = Handle-ContextUpdate $obj
        $json = ([PSCustomObject]@{ ok=$true; result=$r }) | ConvertTo-Json -Depth 10
      }
      elseif ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/speech") {
        $transcript = Invoke-SpeechRecognition
        $json = ([PSCustomObject]@{ ok=$true; transcript=$transcript }) | ConvertTo-Json -Depth 10
        Write-Log "speech: $transcript"
      }
      else {
        $res.StatusCode = 404
        $json = ([PSCustomObject]@{ ok=$false; error="not found" }) | ConvertTo-Json
      }
    }
    catch {
      $res.StatusCode = 500
      $json = ([PSCustomObject]@{ ok=$false; error=$_.Exception.Message }) | ConvertTo-Json -Depth 10
      Write-Log "error: $($_.Exception.Message)"
    }

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $res.ContentType = "application/json"
    $res.ContentEncoding = [System.Text.Encoding]::UTF8
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
  Write-Log "stopped"
}
