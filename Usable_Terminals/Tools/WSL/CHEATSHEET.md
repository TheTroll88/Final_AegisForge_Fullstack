# WSL (Windows Subsystem for Linux) — Cheat Sheet

> **Path:** `C:\WINDOWS\system32\wsl.exe`  
> **Active Distro:** docker-desktop (Docker's internal Linux)  
> **Type:** Run Linux inside Windows — real Linux kernel  
> **AegisForge Role:** Docker backend, potential for Ubuntu dev environment

---

## WSL Management

```powershell
# List distros
wsl --list                                 # Installed distros
wsl --list --verbose                       # With status + WSL version
wsl --list --online                        # Available to install

# Install distros
wsl --install                              # Install default (Ubuntu)
wsl --install -d Ubuntu-24.04              # Install specific distro
wsl --install -d Debian
wsl --install -d kali-linux

# Start/Stop
wsl                                        # Start default distro shell
wsl -d docker-desktop                      # Start specific distro
wsl --shutdown                             # Shutdown all WSL instances
wsl --terminate docker-desktop             # Stop specific distro

# Set default
wsl --set-default Ubuntu-24.04

# WSL version
wsl --version                              # WSL version info
wsl --set-version Ubuntu-24.04 2           # Convert distro to WSL2
wsl --set-default-version 2               # Set WSL2 as default for new installs

# Export/Import (backup/restore)
wsl --export Ubuntu backup.tar             # Export distro to file
wsl --import MyUbuntu C:\WSL\MyUbuntu backup.tar  # Import from file
wsl --unregister Ubuntu-24.04              # Remove distro (DELETES DATA)
```

---

## Inside WSL (Linux Shell)

Once inside WSL, you're in a full Linux environment.

```bash
# Access Windows files
cd /mnt/c/Users/natha/Desktop              # Windows C: drive
cd /mnt/d/AegisForge                       # Windows D: drive
ls /mnt/c/                                 # Browse Windows filesystem

# Access Windows commands from Linux
explorer.exe .                             # Open current dir in Explorer
code .                                     # Open in VS Code
powershell.exe -c "Get-Process"           # Run PowerShell commands
cmd.exe /c "dir"                           # Run CMD commands
clip.exe                                   # Pipe to Windows clipboard
echo "hello" | clip.exe

# Linux package management (Ubuntu/Debian)
sudo apt update                            # Update package lists
sudo apt upgrade -y                        # Upgrade installed packages
sudo apt install build-essential           # Install C/C++ compiler
sudo apt install python3 python3-pip       # Install Python
sudo apt install postgresql-client         # PostgreSQL client
sudo apt install curl wget git             # Common tools

# Networking — WSL accesses Windows network
curl http://localhost:8080                 # Access Windows services
# Windows → WSL: use localhost or WSL IP
hostname -I                                # Get WSL IP address
```

---

## WSL Configuration

### .wslconfig (global — `C:\Users\natha\.wslconfig`)

```ini
[wsl2]
memory=8GB                    # Max RAM for WSL2
processors=4                  # Max CPU cores
swap=4GB                      # Swap file size
localhostForwarding=true      # Access WSL from localhost
nestedVirtualization=true     # For running VMs inside WSL

[experimental]
autoMemoryReclaim=gradual     # Reclaim memory automatically
```

### wsl.conf (per-distro — `/etc/wsl.conf`)

```ini
[automount]
enabled=true                  # Auto-mount Windows drives at /mnt/
root=/mnt/                    # Mount point
options="metadata,umask=22,fmask=11"

[network]
hostname=aegis-wsl
generateHosts=true
generateResolvConf=true

[user]
default=natha                 # Default user

[interop]
enabled=true                  # Run Windows executables from Linux
appendWindowsPath=true        # Include Windows PATH
```

---

## Docker + WSL Integration

Docker Desktop uses WSL as its backend. The `docker-desktop` distro is Docker's internal Linux.

```powershell
# Docker's WSL distro (internal — don't modify directly)
wsl -d docker-desktop                      # Shell into Docker's Linux
wsl -d docker-desktop-data                 # Docker's data volume

# Docker commands work from both Windows and WSL
docker ps                                  # Works from PowerShell
wsl docker ps                              # Works via WSL too
```

---

## File System Performance

| Location | From Windows | From WSL | Performance |
|---|---|---|---|
| `/mnt/c/...` | Native | Mounted | Slow from WSL |
| `\\wsl$\Ubuntu\...` | Network mount | Native | Slow from Windows |
| WSL filesystem | N/A | Native | **Fast** |
| Windows filesystem | Native | N/A | **Fast** |

**Rule:** Keep Linux project files inside WSL. Keep Windows project files outside WSL. Cross-filesystem access is slow.

---

## Useful Patterns

```powershell
# Run a single Linux command without entering shell
wsl -e ls -la /mnt/c/Users/natha/Desktop
wsl -e grep -r "keymint" /mnt/c/Users/natha/v4w_website/

# Run command in specific distro
wsl -d Ubuntu-24.04 -e python3 --version

# Pipe between Windows and Linux
Get-Content file.txt | wsl grep "pattern"
wsl cat /etc/os-release | Select-String "PRETTY_NAME"

# Copy files
# Windows → WSL: just use /mnt/c/ path
# WSL → Windows: copy to /mnt/c/ path
# Or use: \\wsl$\Ubuntu\home\user\file.txt from Explorer
```
