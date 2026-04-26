$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "assistant.config.json"

if (-not (Test-Path $configPath)) {
    Write-Host "Missing config: $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json

if (-not $config.PSObject.Properties.Name.Contains("MemoryPath")) {
    $config | Add-Member -NotePropertyName MemoryPath -NotePropertyValue (Join-Path $scriptDir "memory.json")
}
if (-not $config.PSObject.Properties.Name.Contains("TasksPath")) {
    $config | Add-Member -NotePropertyName TasksPath -NotePropertyValue (Join-Path $scriptDir "tasks.json")
}
if (-not $config.PSObject.Properties.Name.Contains("NotesPath")) {
    $config | Add-Member -NotePropertyName NotesPath -NotePropertyValue (Join-Path $scriptDir "notes.log")
}
if (-not $config.PSObject.Properties.Name.Contains("KnowledgePath")) {
    $config | Add-Member -NotePropertyName KnowledgePath -NotePropertyValue (Join-Path $scriptDir "knowledge.json")
}
if (-not $config.PSObject.Properties.Name.Contains("RoutinesPath")) {
    $config | Add-Member -NotePropertyName RoutinesPath -NotePropertyValue (Join-Path $scriptDir "routines.json")
}
if (-not $config.PSObject.Properties.Name.Contains("AllowAllPaths")) {
    $config | Add-Member -NotePropertyName AllowAllPaths -NotePropertyValue $false
}
if (-not $config.PSObject.Properties.Name.Contains("FollowLogPath")) {
    $config | Add-Member -NotePropertyName FollowLogPath -NotePropertyValue (Join-Path $scriptDir "follow.log")
}
if (-not $config.PSObject.Properties.Name.Contains("FollowIntervalSeconds")) {
    $config | Add-Member -NotePropertyName FollowIntervalSeconds -NotePropertyValue 3
}

$followJobName = "AegisLocalFollow"

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $config.LogPath -Value $line
}

function Test-PathAllowed {
    param([string]$Path)

    if ($config.AllowAllPaths) { return $true }

    try {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    catch {
        return $false
    }

    $allowed = $false
    foreach ($root in $config.AllowedRoots) {
        if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $allowed = $true
            break
        }
    }
    if (-not $allowed) { return $false }

    foreach ($blocked in $config.BlockedPatterns) {
        if ($full.StartsWith($blocked, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $false
        }
    }

    return $true
}

function Confirm-Action {
    param([string]$Prompt)
    if (-not $config.RequireConfirmation) { return $true }
    $answer = Read-Host "$Prompt (y/n)"
    return $answer -eq "y"
}

function Show-Help {
    @"
Commands:
  help
  status
  ls <path>
  find <pattern> [path]
  open <path>
  read <path>
  mkdir <path>
  move <src> <dst>
  delete <path>
  cleanup-temp
  remember <key> <value>
  recall [key]
  forget <key>
  note <text>
  notes [count]
  task add <text>
  task list
  task done <id>
  task remove <id>
    goal set <text>
    goal show
    learn <topic> <text>
    knowledge [topic]
    web open <url>
    web fetch <url>
    web search <query>
    routine add <name> <cmd1;cmd2;cmd3>
    routine list
    routine run <name>
    follow on
    follow off
    follow status
  exec <command>      (disabled by default in config)
  ask <prompt>        (ask Ollama a single question)
  chat                (interactive Ollama chat session — type 'exit' to leave)
  model [name]        (show or switch active Ollama model)
  config
  quit
"@ | Write-Host
}

function Initialize-DataFiles {
    if (-not (Test-Path $config.MemoryPath)) {
        "{}" | Set-Content -Path $config.MemoryPath -Encoding UTF8
    }
    if (-not (Test-Path $config.TasksPath)) {
        "[]" | Set-Content -Path $config.TasksPath -Encoding UTF8
    }
    if (-not (Test-Path $config.NotesPath)) {
        New-Item -ItemType File -Path $config.NotesPath -Force | Out-Null
    }
    if (-not (Test-Path $config.KnowledgePath)) {
        "{}" | Set-Content -Path $config.KnowledgePath -Encoding UTF8
    }
    if (-not (Test-Path $config.RoutinesPath)) {
        "{}" | Set-Content -Path $config.RoutinesPath -Encoding UTF8
    }
    if (-not (Test-Path $config.FollowLogPath)) {
        New-Item -ItemType File -Path $config.FollowLogPath -Force | Out-Null
    }
}

function Get-JsonHashtable {
    param([string]$Path)
    $raw = Get-Content -Raw -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
    return $raw | ConvertFrom-Json -AsHashtable
}

function Save-JsonHashtable {
    param([string]$Path, [hashtable]$Data)
    ($Data | ConvertTo-Json -Depth 20) | Set-Content -Path $Path -Encoding UTF8
}

function Ensure-Url {
    param([string]$Url)
    if ($Url -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') { return $Url }
    return "https://$Url"
}

function Start-FollowTracker {
    $existing = Get-Job -Name $followJobName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Follow mode already running."
        return
    }

    $logPath = $config.FollowLogPath
    $interval = [int]$config.FollowIntervalSeconds
    if ($interval -lt 1) { $interval = 3 }

    Start-Job -Name $followJobName -ScriptBlock {
        param($logPath, $interval)

        Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinTitle {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

        $lastTitle = ""
        while ($true) {
            try {
                $h = [WinTitle]::GetForegroundWindow()
                $sb = New-Object System.Text.StringBuilder 1024
                [void][WinTitle]::GetWindowText($h, $sb, $sb.Capacity)
                $title = $sb.ToString().Trim()

                if (-not [string]::IsNullOrWhiteSpace($title) -and $title -ne $lastTitle) {
                    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $title
                    Add-Content -Path $logPath -Value $line
                    $lastTitle = $title
                }
            }
            catch {
                # ignore transient foreground window failures
            }

            Start-Sleep -Seconds $interval
        }
    } -ArgumentList $logPath, $interval | Out-Null

    Write-Host "Follow mode ON."
    Write-Log "follow on"
}

function Stop-FollowTracker {
    $existing = Get-Job -Name $followJobName -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Host "Follow mode already off."
        return
    }

    Stop-Job -Name $followJobName -Force -ErrorAction SilentlyContinue
    Remove-Job -Name $followJobName -Force -ErrorAction SilentlyContinue
    Write-Host "Follow mode OFF."
    Write-Log "follow off"
}

function Show-FollowStatus {
    $existing = Get-Job -Name $followJobName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Follow mode: ON"
    }
    else {
        Write-Host "Follow mode: OFF"
    }
    Write-Host "Follow log: $($config.FollowLogPath)"
}

function Get-MemoryData {
    $raw = Get-Content -Raw -Path $config.MemoryPath
    if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
    return $raw | ConvertFrom-Json -AsHashtable
}

function Save-MemoryData {
    param([hashtable]$Data)
    ($Data | ConvertTo-Json -Depth 10) | Set-Content -Path $config.MemoryPath -Encoding UTF8
}

function Get-TaskData {
    $raw = Get-Content -Raw -Path $config.TasksPath
    if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
    $data = $raw | ConvertFrom-Json
    if ($null -eq $data) { return @() }
    return @($data)
}

function Save-TaskData {
    param([array]$Tasks)
    ($Tasks | ConvertTo-Json -Depth 10) | Set-Content -Path $config.TasksPath -Encoding UTF8
}

function Parse-TaskCommand {
    param([string]$TaskInput)
    $taskParts = $TaskInput.Split(" ", 2)
    $taskAction = $taskParts[0].ToLowerInvariant()
    $taskRest = if ($taskParts.Count -gt 1) { $taskParts[1] } else { "" }
    return @($taskAction, $taskRest)
}

function Show-TaskList {
    $tasks = Get-TaskData
    if ($tasks.Count -eq 0) {
        Write-Host "No tasks yet."
        return
    }
    $tasks | Sort-Object id | Select-Object id, status, createdAt, completedAt, title | Format-Table -AutoSize
}

Ensure-DataFiles

function Show-Status {
    $os = Get-CimInstance Win32_OperatingSystem
    $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedGB = [math]::Round($totalGB - $freeGB, 2)

    $c = Get-PSDrive C
    $freeDisk = [math]::Round($c.Free / 1GB, 2)
    $usedDisk = [math]::Round(($c.Used) / 1GB, 2)

    Write-Host "Memory Used: $usedGB GB / $totalGB GB"
    Write-Host "Disk C Used: $usedDisk GB | Free: $freeDisk GB"
}

function Get-ArgsLine {
    param([string]$Line)
    if ($Line.IndexOf(" ") -lt 0) { return @() }
    return @($Line.Substring($Line.IndexOf(" ") + 1))
}

function Get-OllamaEndpoint {
    if ($config.PSObject.Properties.Name -contains "OllamaEndpoint") { return $config.OllamaEndpoint }
    return "http://localhost:11434"
}

function Get-OllamaModel {
    if ($config.PSObject.Properties.Name -contains "OllamaModel") { return $config.OllamaModel }
    return "gemma4:latest"
}

function Invoke-OllamaAsk {
    param([array]$Messages)
    $endpoint = Get-OllamaEndpoint
    $model    = Get-OllamaModel
    $body = @{
        model    = $model
        messages = $Messages
        stream   = $false
    } | ConvertTo-Json -Depth 10
    try {
        $resp = Invoke-RestMethod -Uri "$endpoint/api/chat" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 180
        return $resp.message.content
    }
    catch {
        return "Ollama error: $($_.Exception.Message)"
    }
}

Write-Host "[$($config.AssistantName)] Local assistant ready. Type 'help'." -ForegroundColor Cyan
Write-Log "assistant started"

while ($true) {
    try {
        $line = Read-Host ">"
        if ([string]::IsNullOrWhiteSpace($line)) { continue }

        $parts = $line.Split(" ", 2)
        $cmd = $parts[0].ToLowerInvariant()
        $rest = if ($parts.Count -gt 1) { $parts[1] } else { "" }

        switch ($cmd) {
            "help" {
                Show-Help
            }
            "status" {
                Show-Status
            }
            "config" {
                $config | ConvertTo-Json -Depth 5 | Write-Host
            }
            "ls" {
                if (-not $rest) { Write-Host "Usage: ls <path>" -ForegroundColor Yellow; break }
                if (-not (Is-PathAllowed -Path $rest)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                Get-ChildItem -Force -Path $rest | Select-Object Mode, LastWriteTime, Length, Name | Format-Table -AutoSize
            }
            "find" {
                if (-not $rest) { Write-Host "Usage: find <pattern> [path]" -ForegroundColor Yellow; break }
                $findParts = $rest.Split(" ", 2)
                $pattern = $findParts[0]
                $searchPath = if ($findParts.Count -gt 1) { $findParts[1] } else { $scriptDir }
                if (-not (Is-PathAllowed -Path $searchPath)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                Get-ChildItem -Path $searchPath -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$pattern*" } | Select-Object -First 100 FullName
            }
            "open" {
                if (-not $rest) { Write-Host "Usage: open <path>" -ForegroundColor Yellow; break }
                if (-not (Is-PathAllowed -Path $rest)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                Start-Process $rest
                Write-Log "open $rest"
            }
            "read" {
                if (-not $rest) { Write-Host "Usage: read <path>" -ForegroundColor Yellow; break }
                if (-not (Is-PathAllowed -Path $rest)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                Get-Content -Path $rest -TotalCount 200
            }
            "mkdir" {
                if (-not $rest) { Write-Host "Usage: mkdir <path>" -ForegroundColor Yellow; break }
                if (-not (Is-PathAllowed -Path $rest)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                if (Confirm-Action "Create directory: $rest") {
                    New-Item -ItemType Directory -Path $rest -Force | Out-Null
                    Write-Host "Created."
                    Write-Log "mkdir $rest"
                }
            }
            "move" {
                $mv = $rest.Split(" ", 2)
                if ($mv.Count -lt 2) { Write-Host "Usage: move <src> <dst>" -ForegroundColor Yellow; break }
                $src = $mv[0]
                $dst = $mv[1]
                if (-not (Is-PathAllowed -Path $src) -or -not (Is-PathAllowed -Path $dst)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                if (Confirm-Action "Move '$src' to '$dst'") {
                    Move-Item -Path $src -Destination $dst -Force
                    Write-Host "Moved."
                    Write-Log "move $src -> $dst"
                }
            }
            "delete" {
                if (-not $rest) { Write-Host "Usage: delete <path>" -ForegroundColor Yellow; break }
                if (-not (Is-PathAllowed -Path $rest)) { Write-Host "Path not allowed." -ForegroundColor Red; break }
                if (Confirm-Action "Delete '$rest'") {
                    Remove-Item -Path $rest -Recurse -Force
                    Write-Host "Deleted."
                    Write-Log "delete $rest"
                }
            }
            "cleanup-temp" {
                $targets = @(
                    "$env:TEMP\\*",
                    "C:\\Windows\\Temp\\*"
                )
                foreach ($t in $targets) {
                    if (Confirm-Action "Clean temp target: $t") {
                        Remove-Item -Path $t -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Log "cleanup $t"
                    }
                }
                Write-Host "Temp cleanup complete."
            }
            "remember" {
                $rememberParts = $rest.Split(" ", 2)
                if ($rememberParts.Count -lt 2) { Write-Host "Usage: remember <key> <value>" -ForegroundColor Yellow; break }
                $key = $rememberParts[0]
                $value = $rememberParts[1]
                $memory = Get-MemoryData
                $memory[$key] = $value
                Save-MemoryData -Data $memory
                Write-Host "Stored memory key '$key'."
                Write-Log "remember $key"
            }
            "recall" {
                $memory = Get-MemoryData
                if (-not $rest) {
                    if ($memory.Count -eq 0) { Write-Host "No memory entries."; break }
                    $memory.GetEnumerator() | Sort-Object Name | Format-Table Name, Value -AutoSize
                    break
                }
                if ($memory.ContainsKey($rest)) {
                    Write-Host "${rest}: $($memory[$rest])"
                }
                else {
                    Write-Host "No memory for key '$rest'." -ForegroundColor Yellow
                }
            }
            "forget" {
                if (-not $rest) { Write-Host "Usage: forget <key>" -ForegroundColor Yellow; break }
                $memory = Get-MemoryData
                if (-not $memory.ContainsKey($rest)) { Write-Host "Key not found." -ForegroundColor Yellow; break }
                if (Confirm-Action "Remove memory key '$rest'") {
                    $memory.Remove($rest) | Out-Null
                    Save-MemoryData -Data $memory
                    Write-Host "Removed."
                    Write-Log "forget $rest"
                }
            }
            "note" {
                if (-not $rest) { Write-Host "Usage: note <text>" -ForegroundColor Yellow; break }
                $lineEntry = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $rest
                Add-Content -Path $config.NotesPath -Value $lineEntry
                Write-Host "Note saved."
                Write-Log "note added"
            }
            "notes" {
                $count = 30
                if ($rest) {
                    [int]$parsed = 0
                    if ([int]::TryParse($rest, [ref]$parsed)) { $count = $parsed }
                }
                Get-Content -Path $config.NotesPath -Tail $count
            }
            "task" {
                if (-not $rest) { Write-Host "Usage: task <add|list|done|remove> [value]" -ForegroundColor Yellow; break }
                $taskParsed = Parse-TaskCommand -TaskInput $rest
                $taskAction = $taskParsed[0]
                $taskRest = $taskParsed[1]
                $tasks = Get-TaskData

                switch ($taskAction) {
                    "add" {
                        if (-not $taskRest) { Write-Host "Usage: task add <text>" -ForegroundColor Yellow; break }
                        $nextId = if ($tasks.Count -eq 0) { 1 } else { (($tasks | Measure-Object -Property id -Maximum).Maximum + 1) }
                        $newTask = [PSCustomObject]@{
                            id = $nextId
                            title = $taskRest
                            status = "open"
                            createdAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                            completedAt = ""
                        }
                        $tasks += $newTask
                        Save-TaskData -Tasks $tasks
                        Write-Host "Task #$nextId added."
                        Write-Log "task add $nextId"
                    }
                    "list" {
                        Show-TaskList
                    }
                    "done" {
                        if (-not $taskRest) { Write-Host "Usage: task done <id>" -ForegroundColor Yellow; break }
                        [int]$id = 0
                        if (-not [int]::TryParse($taskRest, [ref]$id)) { Write-Host "Invalid id." -ForegroundColor Yellow; break }
                        $target = $tasks | Where-Object { $_.id -eq $id } | Select-Object -First 1
                        if ($null -eq $target) { Write-Host "Task not found." -ForegroundColor Yellow; break }
                        $target.status = "done"
                        $target.completedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                        Save-TaskData -Tasks $tasks
                        Write-Host "Task #$id marked done."
                        Write-Log "task done $id"
                    }
                    "remove" {
                        if (-not $taskRest) { Write-Host "Usage: task remove <id>" -ForegroundColor Yellow; break }
                        [int]$id = 0
                        if (-not [int]::TryParse($taskRest, [ref]$id)) { Write-Host "Invalid id." -ForegroundColor Yellow; break }
                        if (Confirm-Action "Remove task #$id") {
                            $remaining = @($tasks | Where-Object { $_.id -ne $id })
                            if ($remaining.Count -eq $tasks.Count) {
                                Write-Host "Task not found." -ForegroundColor Yellow
                                break
                            }
                            Save-TaskData -Tasks $remaining
                            Write-Host "Task #$id removed."
                            Write-Log "task remove $id"
                        }
                    }
                    default {
                        Write-Host "Usage: task <add|list|done|remove> [value]" -ForegroundColor Yellow
                    }
                }
            }
            "goal" {
                if (-not $rest) { Write-Host "Usage: goal <set|show> [text]" -ForegroundColor Yellow; break }
                $goalParts = $rest.Split(" ", 2)
                $goalCmd = $goalParts[0].ToLowerInvariant()
                $goalText = if ($goalParts.Count -gt 1) { $goalParts[1] } else { "" }
                $memory = Get-MemoryData
                switch ($goalCmd) {
                    "set" {
                        if (-not $goalText) { Write-Host "Usage: goal set <text>" -ForegroundColor Yellow; break }
                        $memory["primary_goal"] = $goalText
                        Save-MemoryData -Data $memory
                        Write-Host "Primary goal saved."
                        Write-Log "goal set"
                    }
                    "show" {
                        if ($memory.ContainsKey("primary_goal")) {
                            Write-Host "Primary goal: $($memory['primary_goal'])"
                        }
                        else {
                            Write-Host "No primary goal set."
                        }
                    }
                    default {
                        Write-Host "Usage: goal <set|show> [text]" -ForegroundColor Yellow
                    }
                }
            }
            "learn" {
                $learnParts = $rest.Split(" ", 2)
                if ($learnParts.Count -lt 2) { Write-Host "Usage: learn <topic> <text>" -ForegroundColor Yellow; break }
                $topic = $learnParts[0].ToLowerInvariant()
                $text = $learnParts[1]
                $knowledge = Get-JsonHashtable -Path $config.KnowledgePath
                if (-not $knowledge.ContainsKey($topic)) {
                    $knowledge[$topic] = @()
                }
                $knowledge[$topic] += @("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $text)
                Save-JsonHashtable -Path $config.KnowledgePath -Data $knowledge
                Write-Host "Learned under topic '$topic'."
                Write-Log "learn $topic"
            }
            "knowledge" {
                $knowledge = Get-JsonHashtable -Path $config.KnowledgePath
                if (-not $rest) {
                    if ($knowledge.Count -eq 0) { Write-Host "No knowledge saved yet."; break }
                    $knowledge.Keys | Sort-Object | ForEach-Object { Write-Host "- $_" }
                    break
                }
                $topic = $rest.ToLowerInvariant()
                if (-not $knowledge.ContainsKey($topic)) { Write-Host "No entries for topic '$topic'." -ForegroundColor Yellow; break }
                @($knowledge[$topic]) | Select-Object -Last 20
            }
            "web" {
                if (-not $rest) { Write-Host "Usage: web <open|fetch|search> <value>" -ForegroundColor Yellow; break }
                $webParts = $rest.Split(" ", 2)
                $webCmd = $webParts[0].ToLowerInvariant()
                $webValue = if ($webParts.Count -gt 1) { $webParts[1] } else { "" }
                switch ($webCmd) {
                    "open" {
                        if (-not $webValue) { Write-Host "Usage: web open <url>" -ForegroundColor Yellow; break }
                        $url = Ensure-Url -Url $webValue
                        Start-Process $url
                        Write-Host "Opened: $url"
                        Write-Log "web open $url"
                    }
                    "fetch" {
                        if (-not $webValue) { Write-Host "Usage: web fetch <url>" -ForegroundColor Yellow; break }
                        $url = Ensure-Url -Url $webValue
                        try {
                            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
                            $title = ""
                            if ($resp.Content -match '<title>(.*?)</title>') { $title = $Matches[1] }
                            Write-Host "Status: $($resp.StatusCode)"
                            if ($title) { Write-Host "Title: $title" }
                            Write-Host "Length: $($resp.Content.Length)"
                            Write-Host ($resp.Content.Substring(0, [Math]::Min(1200, $resp.Content.Length)))
                            Write-Log "web fetch $url"
                        }
                        catch {
                            Write-Host "Fetch failed: $($_.Exception.Message)" -ForegroundColor Red
                        }
                    }
                    "search" {
                        if (-not $webValue) { Write-Host "Usage: web search <query>" -ForegroundColor Yellow; break }
                        $q = [uri]::EscapeDataString($webValue)
                        $url = "https://duckduckgo.com/?q=$q"
                        Start-Process $url
                        Write-Host "Opened search: $webValue"
                        Write-Log "web search $webValue"
                    }
                    default {
                        Write-Host "Usage: web <open|fetch|search> <value>" -ForegroundColor Yellow
                    }
                }
            }
            "routine" {
                if (-not $rest) { Write-Host "Usage: routine <add|list|run> ..." -ForegroundColor Yellow; break }
                $routineParts = $rest.Split(" ", 2)
                $routineCmd = $routineParts[0].ToLowerInvariant()
                $routineRest = if ($routineParts.Count -gt 1) { $routineParts[1] } else { "" }
                $routines = Get-JsonHashtable -Path $config.RoutinesPath

                switch ($routineCmd) {
                    "add" {
                        $addParts = $routineRest.Split(" ", 2)
                        if ($addParts.Count -lt 2) { Write-Host "Usage: routine add <name> <cmd1;cmd2;cmd3>" -ForegroundColor Yellow; break }
                        $name = $addParts[0].ToLowerInvariant()
                        $cmds = $addParts[1].Split(";") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
                        if ($cmds.Count -eq 0) { Write-Host "No commands provided." -ForegroundColor Yellow; break }
                        $routines[$name] = @($cmds)
                        Save-JsonHashtable -Path $config.RoutinesPath -Data $routines
                        Write-Host "Routine '$name' saved with $($cmds.Count) command(s)."
                        Write-Log "routine add $name"
                    }
                    "list" {
                        if ($routines.Count -eq 0) { Write-Host "No routines saved."; break }
                        $routines.Keys | Sort-Object | ForEach-Object {
                            $count = @($routines[$_]).Count
                            Write-Host "- $_ ($count commands)"
                        }
                    }
                    "run" {
                        if (-not $routineRest) { Write-Host "Usage: routine run <name>" -ForegroundColor Yellow; break }
                        $name = $routineRest.ToLowerInvariant()
                        if (-not $routines.ContainsKey($name)) { Write-Host "Routine not found." -ForegroundColor Yellow; break }
                        $commands = @($routines[$name])
                        Write-Host "Running routine '$name'..."
                        foreach ($cmdLine in $commands) {
                            Write-Host "-> $cmdLine"
                            Write-Log "routine step $cmdLine"
                            $innerParts = $cmdLine.Split(" ", 2)
                            $innerCmd = $innerParts[0].ToLowerInvariant()
                            $innerRest = if ($innerParts.Count -gt 1) { $innerParts[1] } else { "" }
                            if ($innerCmd -eq "exec" -and -not $config.AllowCommandExecution) {
                                Write-Host "Skipped exec (disabled)." -ForegroundColor Yellow
                                continue
                            }
                            if ($innerCmd -eq "exec") {
                                Invoke-Expression $innerRest
                            }
                            elseif ($innerCmd -eq "web") {
                                $temp = "web $innerRest"
                                $parts2 = $temp.Split(" ", 2)
                                $cmd = $parts2[0]
                                $rest = if ($parts2.Count -gt 1) { $parts2[1] } else { "" }
                                # recurse through main switch by setting line and continuing
                                $line = "$cmd $rest"
                            }
                            else {
                                Write-Host "Routine command type not auto-executed: $cmdLine" -ForegroundColor Yellow
                            }
                        }
                        Write-Host "Routine complete."
                    }
                    default {
                        Write-Host "Usage: routine <add|list|run> ..." -ForegroundColor Yellow
                    }
                }
            }
            "follow" {
                if (-not $rest) { Write-Host "Usage: follow <on|off|status>" -ForegroundColor Yellow; break }
                $mode = $rest.ToLowerInvariant()
                switch ($mode) {
                    "on" { Start-FollowTracker }
                    "off" { Stop-FollowTracker }
                    "status" { Show-FollowStatus }
                    default { Write-Host "Usage: follow <on|off|status>" -ForegroundColor Yellow }
                }
            }
            "exec" {
                if (-not $config.AllowCommandExecution) {
                    Write-Host "exec disabled in config." -ForegroundColor Yellow
                    break
                }
                if (-not $rest) { Write-Host "Usage: exec <command>" -ForegroundColor Yellow; break }
                if (Confirm-Action "Execute command: $rest") {
                    Write-Log "exec $rest"
                    Invoke-Expression $rest
                }
            }
            "quit" {
                Stop-FollowTracker
                Write-Log "assistant stopped"
                break
            }
            default {
                Write-Host "Unknown command. Type 'help'." -ForegroundColor Yellow
            }
        }
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Log "error $($_.Exception.Message)"
    }
}
