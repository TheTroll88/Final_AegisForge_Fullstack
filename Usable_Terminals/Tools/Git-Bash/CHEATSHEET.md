# Git Bash — Cheat Sheet

> **Path:** `C:\Program Files\Git\bin\bash.exe`  
> **Version:** GNU bash 5.2.37 + Git 2.49.0  
> **Type:** MinGW bash shell with Unix coreutils on Windows  
> **AegisForge Role:** Unix-like scripting, shell scripts, POSIX-compatible operations  
> **Launch:** Git Bash shortcut, or `"C:\Program Files\Git\bin\bash.exe"` from any terminal

---

## Core Concepts

Git Bash is a real bash shell running on Windows via MSYS2/MinGW. It provides Unix commands (ls, grep, sed, awk, find, curl, ssh) on Windows. Paths translate automatically: `C:\Users\natha` → `/c/Users/natha`.

---

## Navigation & Files

```bash
# Navigation
cd /c/Users/natha/OneDrive/Desktop    # Windows paths use /c/ prefix
cd ~                                   # Home directory
cd -                                   # Previous directory
pwd                                    # Current directory

# List files
ls                                     # Basic listing
ls -la                                 # Long format with hidden files
ls -lah                                # Human-readable sizes
ls -R                                  # Recursive
ls *.py                                # Glob pattern

# File operations
touch file.txt                         # Create/update timestamp
mkdir -p path/to/folder                # Create nested directories
cp source.txt dest.txt                 # Copy
cp -r folder/ backup/                  # Copy directory recursively
mv old.txt new.txt                     # Move/rename
rm file.txt                            # Delete file
rm -rf folder/                         # Delete directory recursively (CAREFUL!)
ln -s target linkname                  # Symbolic link

# Read files
cat file.txt                           # Print entire file
head -n 20 file.txt                    # First 20 lines
tail -n 20 file.txt                    # Last 20 lines
tail -f logfile.log                    # Follow live (like Get-Content -Wait)
less file.txt                          # Paged viewing (q to quit)
wc -l file.txt                        # Count lines
```

---

## Text Processing (Unix Power Tools)

```bash
# grep — search text
grep "pattern" file.txt                # Find lines matching pattern
grep -r "keymint" .                    # Recursive search in current dir
grep -rn "TODO" --include="*.py" .     # Recursive + line numbers + filter file type
grep -i "error" log.txt                # Case-insensitive
grep -v "debug" log.txt                # Invert match (exclude lines)
grep -c "error" log.txt                # Count matches
grep -l "pattern" *.py                 # List files that match
grep -E "error|warn|fail" log.txt      # Extended regex (OR)

# sed — stream editor (find/replace)
sed 's/old/new/' file.txt              # Replace first occurrence per line
sed 's/old/new/g' file.txt             # Replace all occurrences
sed -i 's/old/new/g' file.txt          # In-place edit (modifies file!)
sed -n '10,20p' file.txt               # Print lines 10-20
sed '/^#/d' file.txt                   # Delete comment lines

# awk — column processing
awk '{print $1}' file.txt              # Print first column
awk -F',' '{print $2}' data.csv        # CSV: print second column
awk '{sum+=$1} END {print sum}' nums   # Sum a column
awk '/error/ {count++} END {print count}' log.txt  # Count error lines
ps aux | awk '{print $1, $11}'         # User + command from ps output

# sort & uniq
sort file.txt                          # Sort lines
sort -n file.txt                       # Numeric sort
sort -r file.txt                       # Reverse sort
sort file.txt | uniq                   # Remove duplicates
sort file.txt | uniq -c | sort -rn     # Count + sort by frequency

# cut
cut -d',' -f2 data.csv                # Extract column 2 from CSV
cut -c1-10 file.txt                   # First 10 characters per line

# tr — translate/delete characters
echo "Hello" | tr 'a-z' 'A-Z'         # Uppercase
echo "Hello  World" | tr -s ' '       # Squeeze repeated spaces
```

---

## Piping & Redirection

```bash
# Pipes (connect stdout → stdin)
ls -la | grep ".py"                    # Filter ls output
cat log.txt | grep "error" | wc -l    # Count error lines
ps aux | sort -k3 -rn | head -10      # Top 10 CPU processes

# Redirection
command > output.txt                   # Stdout to file (overwrite)
command >> output.txt                  # Stdout to file (append)
command 2> errors.txt                  # Stderr to file
command > out.txt 2>&1                 # Both stdout+stderr to file
command < input.txt                    # Stdin from file
command 2>/dev/null                    # Discard errors

# Tee — write to file AND stdout
command | tee output.txt               # Display and save
command | tee -a output.txt            # Display and append
```

---

## Variables & Scripting

```bash
# Variables (no spaces around =)
NAME="AegisForge"
PORT=8080
echo "Running $NAME on port $PORT"
echo "Path: ${NAME}_backup"           # Braces for disambiguating

# Command substitution
FILES=$(ls *.py)
COUNT=$(wc -l < file.txt)
TODAY=$(date +%Y-%m-%d)

# Conditionals
if [ -f "file.txt" ]; then            # File exists?
  echo "Found it"
elif [ -d "folder" ]; then            # Directory exists?
  echo "It's a directory"
else
  echo "Not found"
fi

# Test operators
[ -f file ]      # File exists
[ -d dir ]       # Directory exists
[ -z "$var" ]    # String is empty
[ -n "$var" ]    # String is not empty
[ "$a" = "$b" ]  # String equality
[ $x -eq 5 ]     # Numeric equality
[ $x -gt 0 ]     # Greater than

# Loops
for file in *.py; do
  echo "Processing $file"
done

for i in {1..10}; do
  echo "Iteration $i"
done

while read -r line; do
  echo "$line"
done < file.txt
```

---

## Git Commands (Primary Purpose)

```bash
# Status & info
git status                             # Working tree status
git log --oneline -20                  # Recent commits
git log --graph --oneline --all        # Visual branch graph
git diff                               # Unstaged changes
git diff --staged                      # Staged changes
git branch -a                          # All branches

# Basic workflow
git add .                              # Stage all changes
git add file.txt                       # Stage specific file
git commit -m "message"                # Commit
git push                               # Push to remote
git pull                               # Fetch + merge
git fetch --all                        # Fetch all remotes

# Branching
git checkout -b feature-name           # Create + switch branch
git switch main                        # Switch to main
git merge feature-name                 # Merge branch
git rebase main                        # Rebase onto main

# Stash
git stash                              # Stash changes
git stash list                         # List stashes
git stash pop                          # Apply + remove stash
git stash apply                        # Apply but keep stash

# Undo
git checkout -- file.txt               # Discard unstaged changes
git reset HEAD file.txt                # Unstage file
git reset --soft HEAD~1                # Undo last commit (keep changes)
git reset --hard HEAD~1                # Undo last commit (DESTROY changes)

# Remote
git remote -v                          # List remotes
git remote add origin URL              # Add remote
git clone URL                          # Clone repo
```

---

## SSH & Network (Built-in)

```bash
# SSH (OpenSSH bundled with Git)
ssh user@host                          # Connect
ssh -p 2222 user@host                  # Custom port
ssh -i ~/.ssh/key.pem user@host        # Specific key
ssh-keygen -t ed25519                  # Generate key pair
ssh-copy-id user@host                  # Copy key to server

# curl (bundled)
curl http://localhost:8080/health      # GET request
curl -s http://api.example.com | jq .  # Silent + pipe to jq
curl -X POST -H "Content-Type: application/json" -d '{"key":"val"}' URL
curl -o output.zip URL                 # Download to file
curl -L URL                            # Follow redirects

# wget (if installed)
wget URL                               # Download file
wget -q -O - URL                       # Download to stdout
```

---

## Process Management

```bash
# Run commands
command &                              # Run in background
nohup command &                        # Background + survive terminal close
jobs                                   # List background jobs
fg %1                                  # Bring job 1 to foreground
kill %1                                # Kill job 1

# Process info
ps aux                                 # All processes
ps aux | grep node                     # Find node processes
kill PID                               # Graceful kill
kill -9 PID                            # Force kill
```

---

## Path Translation (Windows ↔ Git Bash)

| Windows Path | Git Bash Path |
|---|---|
| `C:\Users\natha` | `/c/Users/natha` |
| `D:\AegisForge\engine` | `/d/AegisForge/engine` |
| `\\server\share` | `//server/share` |

```bash
# Convert paths
cygpath -u "C:\Users\natha"           # → /c/Users/natha
cygpath -w "/c/Users/natha"           # → C:\Users\natha
```

---

## Useful One-Liners

```bash
# Find all Python files modified in last 24 hours
find . -name "*.py" -mtime -1

# Count lines of code in project
find . -name "*.py" -o -name "*.js" -o -name "*.ts" | xargs wc -l | tail -1

# Find large files (>100MB)
find . -size +100M -type f

# Quick HTTP server
python -m http.server 8000

# Watch a command repeat every 2 seconds
watch -n 2 'curl -s http://localhost:8080/health'

# Base64 encode/decode
echo "secret" | base64
echo "c2VjcmV0Cg==" | base64 -d

# Generate random password
openssl rand -base64 32

# MD5/SHA checksums
sha256sum file.txt
md5sum file.txt
```
