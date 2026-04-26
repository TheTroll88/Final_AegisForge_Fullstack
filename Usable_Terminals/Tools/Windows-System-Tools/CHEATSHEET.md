# Windows Networking & System Tools — Cheat Sheet

> Built-in Windows commands for network diagnostics, system management, and security.  
> Most live in `C:\WINDOWS\system32\`.  
> Some require admin elevation.

---

## Network Diagnostics

### netstat

```powershell
# View connections and listening ports
netstat -ano                               # All connections with PIDs
netstat -ano | findstr "LISTENING"         # Only listening ports
netstat -ano | findstr ":8080"             # Find what's on port 8080
netstat -b                                 # Show executable names (needs admin)
netstat -s                                 # Protocol statistics

# PowerShell equivalent (better)
Get-NetTCPConnection -State Listen         # All listening ports
Get-NetTCPConnection -LocalPort 8080       # What's on port 8080
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess  # Process on port
```

### ping

```powershell
ping google.com                            # Ping (4 packets)
ping -t google.com                         # Continuous ping (Ctrl+C to stop)
ping -n 1 localhost                        # Single ping
ping -n 10 -l 1000 host                   # 10 pings, 1000 byte packets

# PowerShell equivalent
Test-NetConnection google.com
Test-NetConnection localhost -Port 8080    # Test specific port
Test-NetConnection host -TraceRoute        # Trace route
```

### ipconfig

```powershell
ipconfig                                   # Basic IP info
ipconfig /all                              # Detailed network info
ipconfig /flushdns                         # Clear DNS cache
ipconfig /displaydns                       # Show DNS cache
ipconfig /release                          # Release DHCP lease
ipconfig /renew                            # Renew DHCP lease

# PowerShell equivalents
Get-NetIPAddress                           # All IP addresses
Get-NetAdapter                             # Network adapters
Get-DnsClientCache                         # DNS cache
Resolve-DnsName google.com                 # DNS lookup
```

### nslookup

```powershell
nslookup google.com                        # DNS lookup
nslookup -type=MX gmail.com              # Mail server lookup
nslookup -type=TXT domain.com            # TXT records (SPF, DKIM)
nslookup -type=NS domain.com             # Nameservers
```

### tracert / pathping

```powershell
tracert google.com                         # Trace route to host
tracert -d google.com                      # Skip DNS resolution (faster)
pathping google.com                        # Detailed path analysis (slower, more info)
```

### Other Network Tools

```powershell
# ARP table
arp -a                                     # Show ARP cache

# Route table
route print                                # Show routing table

# WiFi profiles
netsh wlan show profiles                   # Saved WiFi networks
netsh wlan show profile name="NetworkName" key=clear  # Show WiFi password (admin)

# Firewall
netsh advfirewall show allprofiles         # Firewall status
netsh advfirewall firewall show rule name=all  # All firewall rules (verbose)

# Port forwarding
netsh interface portproxy add v4tov4 listenport=8080 connectport=80 connectaddress=192.168.1.100
netsh interface portproxy show all         # List port forwards
```

---

## System Management

### tasklist / taskkill

```powershell
# List processes
tasklist                                   # All processes
tasklist /fi "imagename eq node.exe"       # Filter by name
tasklist /fi "memusage gt 100000"          # Memory > 100MB
tasklist /svc                              # Show services in processes
tasklist /v                                # Verbose (window titles, status)

# Kill processes
taskkill /im node.exe /f                   # Kill by name (force)
taskkill /pid 1234 /f                      # Kill by PID (force)
taskkill /im chrome.exe /f /t              # Kill + all child processes
```

### sc (Service Control)

```powershell
# Service management (admin required)
sc query                                   # List all services
sc query "ServiceName"                     # Query specific service
sc start "ServiceName"                     # Start service
sc stop "ServiceName"                      # Stop service
sc config "ServiceName" start=auto         # Set to auto-start

# PowerShell equivalents (better)
Get-Service                                # All services
Get-Service docker                         # Specific service
Start-Service docker                       # Start
Stop-Service docker                        # Stop
Restart-Service docker                     # Restart
Set-Service docker -StartupType Automatic  # Auto-start
```

### schtasks (Scheduled Tasks)

```powershell
# View tasks
schtasks /query /fo TABLE                  # List all
schtasks /query /tn "\smart_cleanup" /fo LIST /v  # Detailed view

# Run task
schtasks /run /tn "smart_cleanup"

# Create task
schtasks /create /tn "MyTask" /tr "pwsh -File C:\script.ps1" /sc daily /st 09:00

# Delete task
schtasks /delete /tn "MyTask" /f

# PowerShell equivalents
Get-ScheduledTask                          # All tasks
Start-ScheduledTask -TaskName "smart_cleanup"
```

---

## Security Tools

### certutil

```powershell
# Hash checking
certutil -hashfile file.exe SHA256         # SHA-256 hash
certutil -hashfile file.exe MD5            # MD5 hash

# Base64 encode/decode
certutil -encode file.txt encoded.b64
certutil -decode encoded.b64 file.txt

# Certificate management
certutil -store My                         # Personal certificate store
certutil -viewstore                        # GUI certificate viewer
```

### cipher

```powershell
# Secure delete (overwrite free space)
cipher /w:C:\                              # Wipe free space on C: drive

# EFS encryption
cipher /e file.txt                         # Encrypt file
cipher /d file.txt                         # Decrypt file
```

### icacls (Permissions)

```powershell
# View permissions
icacls file.txt                            # Show file permissions
icacls folder /t                           # Recursive

# Set permissions
icacls file.txt /grant Users:(R)           # Grant read
icacls folder /grant Everyone:(OI)(CI)(F)  # Full control, inherited
icacls file.txt /remove Users              # Remove permissions
icacls folder /reset /t                    # Reset to inherited
```

---

## System Info

```powershell
# System details
systeminfo                                 # Full system info
hostname                                   # Computer name
whoami                                     # Current user
whoami /groups                             # User group memberships
ver                                        # Windows version (CMD)
winver                                     # Windows version (GUI)

# Disk info
wmic diskdrive list brief                  # Physical disks
wmic logicaldisk get caption,freespace,size  # Drive space

# PowerShell system info
Get-ComputerInfo | Select-Object OsName, OsVersion, CsTotalPhysicalMemory
[System.Environment]::OSVersion
$PSVersionTable
```

---

## Useful One-Liners

```powershell
# Find what's using a port
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess

# Kill everything on a port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# Check all AegisForge ports
@(8080, 8545, 7788, 11434, 9100) | % {
    $conn = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue
    if ($conn) { "$_ ✅ PID: $($conn.OwningProcess)" } else { "$_ ❌ not listening" }
}

# Get public IP
(Invoke-RestMethod ifconfig.me).Trim()

# Quick DNS flush
ipconfig /flushdns; Clear-DnsClientCache

# Open port in firewall
New-NetFirewallRule -DisplayName "Allow 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```
