# CMD (Command Prompt) — Cheat Sheet

> **Path:** `C:\WINDOWS\system32\cmd.exe`  
> **Type:** Windows legacy command interpreter  
> **AegisForge Role:** Running .bat scripts, legacy tools, some VS build tools  
> **Admin:** Right-click → "Run as administrator"

---

## Core Concepts

CMD is the original Windows command interpreter. It processes text (not objects like PowerShell). Commands are simpler but less powerful. Some tools and batch scripts require CMD specifically. Environment variable syntax: `%VARIABLE%`.

---

## Navigation & Files

```cmd
:: Navigation
cd C:\Users\natha\Desktop              :: Change directory
cd /d D:\AegisForge                    :: Change drive AND directory (/d flag required for cross-drive)
cd ..                                  :: Go up one level
cd                                     :: Show current directory (like pwd)
pushd C:\somewhere                     :: Save current dir, cd to new
popd                                   :: Return to saved dir

:: List files
dir                                    :: List files in current directory
dir /b                                 :: Bare format (names only)
dir /s                                 :: Recursive
dir /a                                 :: Include hidden files
dir *.py /s /b                         :: Find all .py files recursively (full paths)

:: File operations
copy source.txt dest.txt               :: Copy file
xcopy folder1 folder2 /E /I /Y        :: Copy directory recursively
robocopy src dest /MIR                 :: Mirror directory (better than xcopy)
move old.txt new.txt                   :: Move/rename
del file.txt                           :: Delete file
del /q /s folder\*.*                   :: Delete all files in folder recursively (quiet)
rmdir /s /q folder                     :: Delete directory recursively
mkdir newfolder                        :: Create directory
ren old.txt new.txt                    :: Rename

:: Read files
type file.txt                          :: Print entire file (like cat)
more file.txt                          :: Paged output (spacebar to continue)
```

---

## Variables & Environment

```cmd
:: Set variables
set MYVAR=hello                        :: Set variable (session only)
set /a RESULT=5+3                      :: Arithmetic
echo %MYVAR%                           :: Use variable
echo %USERNAME%                        :: Built-in environment vars
echo %COMPUTERNAME%
echo %TEMP%
echo %USERPROFILE%

:: Permanent environment variables (requires admin)
setx MYVAR "value"                     :: Set for current user (permanent)
setx MYVAR "value" /M                  :: Set for machine (permanent, needs admin)

:: Special variables
%CD%                                   :: Current directory
%DATE%                                 :: Current date
%TIME%                                 :: Current time
%RANDOM%                               :: Random number 0-32767
%ERRORLEVEL%                           :: Last command's exit code
%~dp0                                  :: Directory of current batch script
%~nx0                                  :: Name of current batch script
```

---

## Piping & Redirection

```cmd
:: Pipes and redirects
command > output.txt                   :: Stdout to file (overwrite)
command >> output.txt                  :: Stdout to file (append)
command 2> errors.txt                  :: Stderr to file
command > out.txt 2>&1                 :: Both to file
command < input.txt                    :: Stdin from file
command1 | command2                    :: Pipe stdout to next command
command > nul                          :: Discard output (like /dev/null)
command 2> nul                         :: Discard errors
```

---

## Search & Filter

```cmd
:: Find text in files
find "search text" file.txt            :: Find string in file
find /i "text" file.txt                :: Case-insensitive
find /c "text" file.txt                :: Count occurrences
find /n "text" file.txt                :: Show line numbers
findstr /s /i "pattern" *.py           :: Recursive grep equivalent
findstr /r "regex" file.txt            :: Regex search

:: Filter output
dir | find "2026"                      :: Filter dir output
tasklist | findstr "node"              :: Find node processes
```

---

## Process Management

```cmd
:: List processes
tasklist                               :: All processes
tasklist /fi "imagename eq node.exe"   :: Filter by name
tasklist /fi "pid eq 1234"             :: Filter by PID
tasklist /svc                          :: Show services in each process

:: Kill processes
taskkill /im node.exe                  :: Kill by name
taskkill /pid 1234                     :: Kill by PID
taskkill /pid 1234 /f                  :: Force kill
taskkill /im chrome.exe /f /t          :: Force kill + child processes

:: Start programs
start notepad                          :: Start program (new window)
start "" "http://localhost:3000"       :: Open URL in browser
start /wait program.exe                :: Start and wait for exit
start /min program.exe                 :: Start minimized
```

---

## Batch Scripting

```cmd
@echo off                              :: Suppress command echoing
echo Hello World                       :: Print text

:: Conditionals
if %ERRORLEVEL% equ 0 (
    echo Success
) else (
    echo Failed
)

if exist "file.txt" (
    echo File exists
)

if "%MYVAR%"=="hello" echo Match

:: Loops
for %%f in (*.py) do echo %%f         :: Loop through files (%%f in batch, %f in console)
for /r . %%f in (*.log) do del "%%f"  :: Recursive file loop
for /l %%i in (1,1,10) do echo %%i    :: Count 1 to 10

:: Labels and goto
:start
echo Doing work
goto end

:error
echo Something went wrong
exit /b 1

:end
echo Done

:: Functions (call)
call :myfunction arg1 arg2
goto :eof

:myfunction
echo Arg1: %~1
echo Arg2: %~2
goto :eof
```

---

## Network Commands

```cmd
:: Diagnostics
ping google.com                        :: Ping
ping -n 1 localhost                     :: Single ping
tracert google.com                     :: Trace route
ipconfig                               :: IP configuration
ipconfig /all                          :: Detailed network info
ipconfig /flushdns                     :: Flush DNS cache
nslookup domain.com                    :: DNS lookup
netstat -ano                           :: All connections with PIDs
netstat -ano | findstr "8080"          :: Find what's on port 8080
```

---

## System Commands

```cmd
:: System info
systeminfo                             :: Full system info
hostname                               :: Computer name
whoami                                 :: Current user
ver                                    :: Windows version

:: Disk
chkdsk C:                              :: Check disk
diskpart                               :: Disk partition tool (interactive)

:: Services
sc query                               :: List services
sc start ServiceName                   :: Start service
sc stop ServiceName                    :: Stop service
net start ServiceName                  :: Start service (alternative)

:: Scheduled tasks
schtasks /query /fo TABLE              :: List scheduled tasks
schtasks /run /tn "TaskName"           :: Run a scheduled task
```

---

## Useful CMD-Specific Tricks

```cmd
:: Chaining commands
command1 & command2                    :: Run both regardless
command1 && command2                   :: Run 2nd only if 1st succeeds
command1 || command2                   :: Run 2nd only if 1st fails

:: Delayed expansion (for loops with variables)
setlocal enabledelayedexpansion
set count=0
for %%f in (*.txt) do (
    set /a count+=1
    echo !count!: %%f
)

:: Clip — copy output to clipboard
dir | clip                             :: Copy dir listing to clipboard
type file.txt | clip                   :: Copy file content to clipboard

:: Pause
pause                                  :: "Press any key to continue..."
timeout /t 5                           :: Wait 5 seconds

:: Clear screen
cls                                    :: Clear console
```

---

## CMD vs PowerShell Quick Comparison

| Operation | CMD | PowerShell |
|---|---|---|
| List files | `dir` | `Get-ChildItem` (alias: `dir`) |
| Search text | `findstr` | `Select-String` |
| Environment var | `%VAR%` | `$env:VAR` |
| Set variable | `set VAR=val` | `$VAR = "val"` |
| Delete folder | `rmdir /s /q` | `Remove-Item -Recurse -Force` |
| Exit code | `%ERRORLEVEL%` | `$LASTEXITCODE` |
| Quiet null | `> nul` | `> $null` or `Out-Null` |
