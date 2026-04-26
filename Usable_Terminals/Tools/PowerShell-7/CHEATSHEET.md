# PowerShell 7 (pwsh) — Cheat Sheet

> **Path:** `C:\Program Files\PowerShell\7\pwsh.exe`  
> **Version:** 7.5.5  
> **Type:** Modern cross-platform object-oriented shell  
> **AegisForge Role:** DEFAULT shell for all operations  
> **Admin:** `Start-Process pwsh -Verb RunAs`

---

## Core Concepts

PowerShell works with **objects**, not text. Every command outputs .NET objects with properties and methods. This is what makes it more powerful than bash/cmd for structured data.

```powershell
# Everything is an object
Get-Process | Get-Member              # See all properties/methods of process objects
(Get-Date).DayOfWeek                  # Access properties directly
"hello".ToUpper()                     # Call methods on strings
```

---

## Navigation & File Operations

```powershell
# Navigation
Set-Location C:\Users\natha           # cd to directory (alias: cd)
Get-Location                          # pwd (alias: pwd)
Push-Location .\subfolder             # Save current dir, cd to new one
Pop-Location                          # Return to saved dir

# List files
Get-ChildItem                         # ls / dir (alias: ls, dir, gci)
Get-ChildItem -Recurse -Filter "*.py" # Find all .py files recursively
Get-ChildItem -Hidden                 # Show hidden files
Get-ChildItem | Sort-Object Length -Descending | Select-Object -First 10  # Top 10 largest files

# File operations
New-Item -Path "file.txt" -ItemType File           # Create file (alias: ni)
New-Item -Path "folder" -ItemType Directory         # Create directory
Copy-Item source.txt dest.txt                       # cp (alias: cp, copy)
Move-Item old.txt new.txt                           # mv (alias: mv, move)
Remove-Item file.txt                                # rm (alias: rm, del)
Remove-Item folder -Recurse -Force                  # rm -rf equivalent
Rename-Item old.txt new.txt                         # Rename

# Read/Write files
Get-Content file.txt                                # cat (alias: cat, gc, type)
Get-Content file.txt -Tail 20                       # Last 20 lines (like tail)
Get-Content file.txt -Wait                          # tail -f equivalent (live follow)
Set-Content file.txt "content"                      # Write (overwrites)
Add-Content file.txt "more content"                 # Append
"Hello World" | Out-File output.txt                 # Redirect to file
"Hello World" | Out-File output.txt -Append         # Append redirect

# Test existence
Test-Path "C:\some\file.txt"                        # Returns $true or $false
```

---

## Pipeline & Filtering

```powershell
# Pipeline basics — pass objects between commands with |
Get-Process | Where-Object { $_.CPU -gt 100 }       # Filter processes using CPU > 100
Get-Process | Sort-Object WorkingSet64 -Descending   # Sort by memory usage
Get-Process | Select-Object Name, CPU, Id            # Pick specific properties
Get-Process | Group-Object ProcessName               # Group by name
Get-Process | Measure-Object WorkingSet64 -Sum -Average  # Aggregate stats

# Common aliases for pipeline commands
# Where-Object → where, ?
# ForEach-Object → foreach, %
# Select-Object → select

# Examples
Get-ChildItem *.log | ? { $_.Length -gt 1MB }        # Files > 1MB
1..10 | % { $_ * 2 }                                 # Double each number
Get-Service | select Name, Status | sort Status       # List services sorted by status
```

---

## Variables & Data Types

```powershell
# Variables (prefix with $)
$name = "AegisForge"
$count = 42
$items = @("one", "two", "three")    # Array
$dict = @{ key = "value"; port = 8080 }  # Hashtable (dictionary)

# Special variables
$_          # Current pipeline object (in Where-Object, ForEach-Object)
$PSVersionTable   # PowerShell version info
$env:PATH         # Environment variable
$LASTEXITCODE     # Exit code of last native command
$?                # Success/failure of last command ($true/$false)
$null             # Null value
$true / $false    # Booleans
$HOME             # User home directory
$PWD              # Current directory

# String operations
"Hello $name"                         # String interpolation (double quotes only)
'Hello $name'                         # Literal string (no interpolation)
"Process count: $($items.Count)"      # Expression inside string
@"
Multi-line
heredoc string
with $name interpolation
"@                                    # Here-string

# Type casting
[int]"42"                             # String to int
[string]42                            # Int to string
[datetime]"2026-04-20"                # Parse date
[PSCustomObject]@{ Name="test" }      # Create custom object
```

---

## Process Management

```powershell
# View processes
Get-Process                                          # All processes
Get-Process -Name "node"                             # By name
Get-Process | Where-Object { $_.WorkingSet64 -gt 500MB }  # Memory hogs

# Kill processes
Stop-Process -Name "node"                            # Kill by name
Stop-Process -Id 1234                                # Kill by PID
Stop-Process -Id 1234 -Force                         # Force kill

# Start processes
Start-Process notepad                                # Start app
Start-Process pwsh -Verb RunAs                       # Start as admin
Start-Process "node" -ArgumentList "server.js"       # Start with args
Start-Process "http://localhost:3000"                 # Open URL in browser

# Background jobs
Start-Job { Get-ChildItem C:\ -Recurse -Filter "*.log" }  # Run in background
Get-Job                                              # List jobs
Receive-Job -Id 1                                    # Get job output
Remove-Job -Id 1                                     # Clean up job
```

---

## Networking & HTTP

```powershell
# HTTP requests
Invoke-RestMethod "http://localhost:11434/api/tags"   # GET (parses JSON automatically!)
Invoke-RestMethod "http://localhost:8080/health"      # Health check
Invoke-RestMethod -Uri "http://api.example.com" -Method POST -Body (@{key="val"} | ConvertTo-Json) -ContentType "application/json"

# Web requests (more control)
Invoke-WebRequest "http://example.com"                # Full response with headers
(Invoke-WebRequest "http://example.com").StatusCode   # Just status code

# Network diagnostics
Test-NetConnection localhost -Port 8080               # Test if port is open
Test-NetConnection google.com                         # Ping equivalent
Get-NetTCPConnection | Where-Object { $_.State -eq 'Listen' }  # All listening ports
Get-NetTCPConnection -LocalPort 8080                  # What's on port 8080?

# Download files
Invoke-WebRequest "https://example.com/file.zip" -OutFile "file.zip"
```

---

## JSON / Data Handling

```powershell
# JSON
$json = Get-Content config.json | ConvertFrom-Json    # Parse JSON file
$json.property                                        # Access property
$json | ConvertTo-Json -Depth 10                      # Back to JSON string
@{ name = "test"; port = 8080 } | ConvertTo-Json     # Object to JSON

# CSV
Import-Csv data.csv                                   # Parse CSV
$data | Export-Csv output.csv -NoTypeInformation       # Write CSV

# XML
[xml]$doc = Get-Content config.xml                    # Parse XML
$doc.root.element                                     # Access elements
```

---

## Services & System

```powershell
# Windows Services
Get-Service                                           # All services
Get-Service -Name "docker"                            # Specific service
Start-Service "ServiceName"                           # Start (needs admin)
Stop-Service "ServiceName"                            # Stop (needs admin)
Restart-Service "ServiceName"                         # Restart (needs admin)

# System info
Get-ComputerInfo | Select-Object OsName, OsVersion, CsTotalPhysicalMemory
[Environment]::OSVersion                              # OS version
$env:COMPUTERNAME                                     # Computer name
$env:USERNAME                                         # Current user

# Environment variables
$env:PATH                                             # Read PATH
$env:MY_VAR = "value"                                 # Set for session
[Environment]::SetEnvironmentVariable("MY_VAR", "value", "User")  # Permanent (user scope)
```

---

## Error Handling

```powershell
# Try/Catch
try {
    Get-Content "nonexistent.txt" -ErrorAction Stop
} catch {
    Write-Error "Failed: $_"
}

# Error preferences
$ErrorActionPreference = "Stop"        # Make all errors terminating
$ErrorActionPreference = "Continue"    # Default — show error, keep going
-ErrorAction SilentlyContinue         # Per-command: suppress errors

# Check last command
if ($LASTEXITCODE -ne 0) { Write-Error "Command failed with exit code $LASTEXITCODE" }
if (-not $?) { Write-Error "Last command failed" }
```

---

## Modules & Help

```powershell
# Modules
Get-Module -ListAvailable                             # All installed modules
Install-Module Az -Scope CurrentUser                  # Install from PSGallery
Import-Module ModuleName                              # Load module
Find-Module "*docker*"                                # Search PSGallery

# Help
Get-Help Get-Process                                  # Basic help
Get-Help Get-Process -Full                            # Detailed help
Get-Help Get-Process -Examples                        # Just examples
Get-Command *service*                                 # Find commands by name
Get-Command -Module Microsoft.PowerShell.Management   # Commands in a module
```

---

## Useful One-Liners for AegisForge

```powershell
# Check what's listening on ports
Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | Sort-Object LocalPort

# Find which process owns a port
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess

# Quick health check all services
@(8080, 8545, 7788, 11434, 9100, 18789) | % { $p=$_; try { $r = Invoke-RestMethod "http://localhost:$p" -TimeoutSec 2; "$p ✅" } catch { "$p ❌" } }

# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Recursive find files by content
Get-ChildItem -Recurse -Filter "*.py" | Select-String "keymint"

# Disk space
Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='GB_Used';E={[math]::Round($_.Used/1GB,1)}}, @{N='GB_Free';E={[math]::Round($_.Free/1GB,1)}}

# Tail a log file live
Get-Content "$env:TEMP\smart_cleanup.log" -Wait -Tail 20
```

---

## Operators Quick Reference

| Operator | Meaning | Example |
|---|---|---|
| `-eq` | Equals | `$x -eq 5` |
| `-ne` | Not equals | `$x -ne 0` |
| `-gt` / `-lt` | Greater / Less than | `$x -gt 10` |
| `-ge` / `-le` | Greater/Less or equal | `$x -ge 1` |
| `-like` | Wildcard match | `$name -like "*.py"` |
| `-match` | Regex match | `$name -match "^test"` |
| `-contains` | Array contains | `@(1,2,3) -contains 2` |
| `-in` | Value in array | `2 -in @(1,2,3)` |
| `-and` / `-or` | Logical | `$a -and $b` |
| `-not` / `!` | Negation | `-not $false` |
| `-replace` | Regex replace | `"hello" -replace "l","r"` |
| `-split` | Split string | `"a,b,c" -split ","` |
| `-join` | Join array | `@("a","b") -join ","` |
