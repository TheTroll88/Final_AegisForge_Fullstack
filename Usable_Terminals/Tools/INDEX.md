# Usable Terminals & Tools — Master Index

> **Location:** `Final_AegisForge_Fullstack\Usable_Terminals\Tools\`  
> **Companion file:** `TERMINALS_INVENTORY.md` (full detailed inventory of all 71 tools)  
> **Last updated:** April 20, 2026

---

## Folder Structure

Each tool/terminal has its own folder with a comprehensive `CHEATSHEET.md` covering commands, syntax, patterns, and examples.

| Folder | Tool(s) Covered | Key Commands |
|---|---|---|
| `PowerShell-7/` | PowerShell 7.5.5 (pwsh) — **DEFAULT SHELL** | `Get-Process`, `Invoke-RestMethod`, pipes, objects |
| `Git-Bash/` | GNU Bash 5.2.37 + Unix coreutils | `grep`, `sed`, `awk`, `find`, `curl`, `ssh` |
| `CMD/` | Windows Command Prompt | `dir`, `findstr`, `tasklist`, batch scripting |
| `Docker/` | Docker Desktop (CLI + Compose + Kubernetes) | `docker run`, `docker compose up`, Dockerfile |
| `Node-npm/` | Node.js 22.14.0, npm 10.9.2, npx | `npm install`, `npm run`, `node --watch` |
| `Python/` | Python 3.9/3.10/3.11/3.13/3.14 + pip + venvs | `py -3.X`, `pip install`, `python -m` |
| `Git/` | Git 2.49.0 | `git commit`, `git branch`, `git rebase` |
| `Solana-Anchor/` | Solana CLI 2.1.21, Anchor 0.32.1, SPL Token, Rustup | `solana transfer`, `anchor build`, `spl-token` |
| `PostgreSQL/` | psql 18.0, pg_dump, pg_restore, pgbench | SQL queries, `\dt`, `\copy`, backups |
| `Google-Cloud-SDK/` | gcloud 563.0.0, gsutil, bq | `gcloud compute`, `gsutil cp`, `bq query` |
| `Kubectl/` | kubectl v1.34.1 (via Docker Desktop) | `kubectl get pods`, `kubectl apply`, `kubectl exec` |
| `Ollama/` | Ollama (local LLM server, port 11434) | `ollama run`, REST API, Python/PS integration |
| `Tesseract-OCR/` | Tesseract 5.4.0 | `tesseract img.png output`, PSM modes, Python integration |
| `Java/` | JDK 25, JRE 11, JRE 8 | `java -jar`, `javac`, `jshell`, version switching |
| `WSL/` | Windows Subsystem for Linux | `wsl --install`, `wsl -d`, cross-OS file access |
| `VS-Code/` | VS Code Stable + Insiders (PRIMARY) | `code-insiders .`, `--diff`, extensions CLI |
| `Package-Managers/` | winget, Chocolatey, npm, pip, cargo | `winget install`, `choco install`, `cargo add` |
| `Windows-System-Tools/` | netstat, ping, ipconfig, tasklist, certutil, sc | Network diagnostics, process management, security |

---

## Quick Navigation: Which Tool for What?

### "I need to..." → Use this tool

| Task | Tool | Folder |
|---|---|---|
| Run a command / script | PowerShell 7 | `PowerShell-7/` |
| Search text in files | Git Bash (grep) or PowerShell (Select-String) | `Git-Bash/` or `PowerShell-7/` |
| Manage Git repos | Git | `Git/` |
| Run containers | Docker | `Docker/` |
| Deploy to Kubernetes | kubectl | `Kubectl/` |
| JavaScript/Node project | Node + npm | `Node-npm/` |
| Python project | Python + pip | `Python/` |
| Query a database | psql | `PostgreSQL/` |
| Run AI inference locally | Ollama | `Ollama/` |
| Deploy to Google Cloud | gcloud | `Google-Cloud-SDK/` |
| Build Solana programs | Anchor + Solana CLI | `Solana-Anchor/` |
| Extract text from images | Tesseract | `Tesseract-OCR/` |
| Run Java applications | Java | `Java/` |
| Install software | winget or choco | `Package-Managers/` |
| Check network/ports | Windows System Tools | `Windows-System-Tools/` |
| Run Linux commands | WSL | `WSL/` |
| Open files in editor | VS Code CLI | `VS-Code/` |

---

## Tools NOT Yet Installed (from TERMINALS_INVENTORY.md)

| Tool | Purpose | Install |
|---|---|---|
| Foundry (forge/cast/anvil) | EVM smart contracts | `curl -L https://foundry.paradigm.xyz \| bash` |
| Terraform | Infrastructure as code | `winget install Hashicorp.Terraform` |
| Azure CLI | Azure cloud | `winget install Microsoft.AzureCLI` |
| gsudo | Inline elevation | `winget install gerardog.gsudo` |
| Ubuntu (WSL) | Full Linux distro | `wsl --install -d Ubuntu` |
