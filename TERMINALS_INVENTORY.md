# AegisForge — Terminal & Shell Inventory

> **Machine:** DESKTOP (Windows 11, x64)  
> **Last scanned:** April 20, 2026  
> **Total tools cataloged:** 71  
> **Purpose:** Agent-readable inventory of every available terminal, shell, CLI tool, runtime, and SDK.  
> Each entry includes: path, version, capabilities, and admin-mode instructions.

---

## How Agents Should Use This File

Every entry below is a **usable tool**, not just documentation. Agents can spawn any of these
terminals, pipe commands through them, chain outputs, and run elevated operations.

```yaml
# To run a command in any shell:
#   1. Check the Task Router below — it tells you WHICH terminal to use
#   2. Use the executable path to spawn it
#   3. For admin mode, see the "Admin Elevation" section at the bottom
#
# All paths are absolute. Agents should prefer the "Default" shell
# unless a specific shell or runtime is required for the task.
```

---

## TASK ROUTER — Which Terminal For Which Job

> **Agents: Read this section first.** Match your task to a category, then use the specified terminal.
> Do NOT default to PowerShell for everything — the right terminal makes you faster and avoids errors.

### File & System Operations
| Task | Use | Why |
|---|---|---|
| File CRUD, process mgmt, automation | **pwsh** (#1) | Native .NET objects, pipelines, tab completion |
| Batch files (.bat/.cmd) | **cmd** (#3) | Only cmd runs batch natively |
| Unix shell scripts (.sh) | **Git Bash** (#4) | POSIX-compat shell with grep/sed/awk/find |
| Linux binaries, apt-get, dpkg | **WSL** (#5) | Real Linux kernel, full distro |
| Service start/stop/query | **pwsh (elevated)** (#1) | `Start-Process pwsh -Verb RunAs` — needs admin |
| Firewall rules, port forwarding | **pwsh (elevated)** + netsh (#32) | `netsh advfirewall` — requires admin |
| File/folder permissions (ACL) | **pwsh (elevated)** + icacls (#33) | Lock vaults, audit access |

### Code Execution & Development
| Task | Use | Why |
|---|---|---|
| Run TypeScript/JavaScript | **node** (#12) via pwsh | `node file.js`, `npx ts-node file.ts` |
| Run Python | **python** (#15) via pwsh | `python file.py`, `python -m pytest` |
| Run Rust / Solana programs | **cargo** (#25) via pwsh | `cargo build`, `cargo test`, `anchor build` |
| .NET / C# builds | **Dev PS for VS 2022** (#7) | Has MSVC, MSBuild, NuGet in PATH |
| C/C++ native compilation | **Dev Cmd for VS 2022** (#6) | Has cl.exe, link.exe, Windows SDK |
| npm scripts, builds | **pwsh** + npm (#13) | `npm run build`, `npm test` |

### Blockchain & Crypto
| Task | Use | Why |
|---|---|---|
| Solana wallet, deploy, balance | **solana** (#23) via pwsh | `solana balance`, `solana deploy` |
| EVM contract compile/test/deploy | ⚠️ **Foundry not installed** | Install first: `curl -L https://foundry.paradigm.xyz \| bash` |
| Aegis Chain RPC interaction | **curl** (#28) via pwsh | JSON-RPC at localhost:8545 |
| Token transfers, on-chain reads | **node** (#12) + ethers/viem | TypeScript scripts with Web3 libs |

### AI & Inference
| Task | Use | Why |
|---|---|---|
| Run/pull/list LLM models | **ollama** (#22) via pwsh | `ollama run llama3.1`, `ollama list` |
| Query LLM via API | **curl** (#28) or **python** (#15) | REST API at `http://localhost:11434/api/generate` |
| Start Logos daemon | **pwsh** (#1) | `& "D:\AegisForge\logos\logos-core.ps1"` |
| Interactive AI chat | **python** (#15) | `python talk_to_him.py` at port 9100 |

### Cloud & Infrastructure
| Task | Use | Why |
|---|---|---|
| Azure resource management | **Azure Cloud Shell** (#10) | az CLI pre-installed; no local install needed |
| Docker build/run/compose | **pwsh** (#1) + docker (#21) | Docker Desktop + WSL2 backend |
| Kubernetes (if kubectl installed) | **pwsh** + kubectl | ⚠️ Not installed yet |
| Git operations, PRs, issues | **pwsh** + git (#19) + gh (#20) | `gh pr create`, `git push` |

### Package Management
| Task | Use | Why |
|---|---|---|
| Install Windows software | **winget** (#30) or **choco** (#29) | winget = no admin; choco = needs admin |
| Install Node packages | **npm** (#13) | `npm install`, `npm install -g` |
| Install Python packages | **pip** (#18) | `pip install package` |
| Install Rust crates | **cargo** (#25) | `cargo install`, `cargo add` |

### Security & Admin
| Task | Use | Why |
|---|---|---|
| DPAPI vault seal/unseal | **powershell 5.1** (#2) | Legacy DPAPI cmdlets, .NET Framework |
| Certificate operations | **certutil** (#34) via pwsh | Hash files, manage cert store |
| Registry edits | **reg.exe** (#35) via pwsh (elevated) | `reg add`, `reg query` |
| Repair Windows system files | **sfc** (#36) / **DISM** (#37) (elevated) | Always needs admin |
| Kill stuck processes | **taskkill** (#38) via pwsh | `taskkill /pid 1234 /f` |

---

## COMPOUND COMMANDS — Multi-Terminal Pipelines

Agents can chain terminals together. Examples:

```powershell
# Build in Node, deploy via Docker, verify with curl
npm run build; docker build -t aegis-web .; docker run -d -p 3000:3000 aegis-web; curl http://localhost:3000/health

# Run Python tests, then if passing, commit via git
python -m pytest tests/ -q; if ($LASTEXITCODE -eq 0) { git add -A; git commit -m "tests pass" }

# Query Ollama for model list, pipe to agent decision
$models = ollama list | ConvertFrom-Csv -Delimiter "`t"; $models | Where-Object { $_.NAME -like "*llama*" }

# Check Solana balance, log to file, alert if low
$bal = solana balance --url devnet 2>&1; if ([double]($bal -replace ' SOL','') -lt 1) { Write-Warning "Low SOL balance: $bal" }

# Elevate, open firewall port, then start service
Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -Command `"netsh advfirewall firewall add rule name='AegisRPC' dir=in action=allow protocol=tcp localport=8545`""
```

---

## SHELLS (Interactive Terminals)

### 1. PowerShell 7+ (pwsh) — DEFAULT
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\PowerShell\7\pwsh.exe` |
| **Version** | 7.5.5 |
| **Type** | Modern cross-platform shell |
| **What It Does** | Primary shell for AegisForge. Object-oriented pipeline, .NET integration, module system, PSScriptAnalyzer. Runs all AegisForge scripts (daemon launchers, vault seal/unseal, smart_cleanup). |
| **Use For** | Everything — file ops, process management, API calls, script execution, automation, admin tasks |
| **Config** | `C:\Users\natha\Documents\PowerShell\Microsoft.PowerShell_profile.ps1` |
| **Admin** | `Start-Process pwsh -Verb RunAs` |

### 2. Windows PowerShell 5.1 (powershell)
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` |
| **Version** | 5.1 (build 10.0.26100.5074) |
| **Type** | Legacy Windows-only shell |
| **What It Does** | Ships with Windows. Needed for some older modules (DISM, Group Policy, legacy AD cmdlets). DPAPI operations, Windows-specific system admin. |
| **Use For** | Legacy script compatibility, DPAPI encryption, COM object automation, older Windows admin modules |
| **Config** | `C:\Users\natha\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` |
| **Admin** | `Start-Process powershell -Verb RunAs` |

### 3. Command Prompt (cmd)
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\system32\cmd.exe` |
| **Version** | Windows built-in |
| **Type** | Classic Windows shell |
| **What It Does** | Traditional Windows command line. Runs .bat/.cmd batch files. Some legacy tools only work here (certain devenv commands, old build scripts). |
| **Use For** | Batch files, legacy tools, `VsDevCmd.bat`, running .exe with specific environment vars |
| **Admin** | `Start-Process cmd -Verb RunAs` |

### 4. Git Bash (bash via Git for Windows)
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Git\bin\bash.exe` |
| **Alt Path** | `C:\WINDOWS\system32\bash.exe` (WSL redirect) |
| **Version** | Ships with Git 2.53.0 |
| **Type** | Unix-like shell (MSYS2/MinGW) |
| **What It Does** | Provides Unix commands on Windows — grep, sed, awk, find, ssh, curl, tar. Runs shell scripts (.sh). Git operations feel native here. |
| **Use For** | Shell scripts, Unix commands, git operations, SSH, piping/text processing |
| **Admin** | Run Windows Terminal as admin, then open Git Bash profile |

### 5. WSL (Windows Subsystem for Linux)
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\system32\wsl.exe` |
| **Distro** | docker-desktop (WSL 2, running) |
| **Type** | Full Linux kernel on Windows |
| **What It Does** | Runs a real Linux environment. Docker Desktop uses it as its backend. Can install Ubuntu/Debian/etc. for full Linux toolchains. |
| **Use For** | Docker operations, Linux-native builds, running Linux binaries, cross-platform testing |
| **Enter** | `wsl` or `wsl -d docker-desktop` |
| **Admin** | WSL runs as current user; use `sudo` inside the Linux shell |

### 6. Developer Command Prompt for VS 2022
| Key | Value |
|---|---|
| **Type** | Preconfigured CMD with VS build tools in PATH |
| **What It Does** | Sets up MSVC compiler (cl.exe), MSBuild, NuGet, .NET SDK, Windows SDK paths. Required for C++/C# native compilation. |
| **Use For** | C/C++ compilation, MSBuild, native Windows development, .NET Framework builds |
| **Launch** | Via Windows Terminal profile or Start Menu |

### 7. Developer PowerShell for VS 2022
| Key | Value |
|---|---|
| **Type** | PowerShell 5.1 with VS build environment loaded |
| **What It Does** | Same as Developer Command Prompt but in PowerShell. Loads `Microsoft.VisualStudio.DevShell` module. |
| **Use For** | .NET builds in PowerShell, MSBuild commands, NuGet package management |
| **Launch** | Via Windows Terminal profile or Start Menu |

### 8. Developer Command Prompt for VS 2019
| Key | Value |
|---|---|
| **Type** | Legacy VS 2019 build environment |
| **What It Does** | Older MSVC toolchain. May be needed for projects targeting older Windows SDK versions. |
| **Use For** | Legacy C++ builds, older .NET Framework targets |

### 9. Developer PowerShell for VS 2019
| Key | Value |
|---|---|
| **Type** | PowerShell with VS 2019 environment |
| **What It Does** | Same as above but PowerShell variant. |

### 10. Azure Cloud Shell
| Key | Value |
|---|---|
| **Type** | Cloud-hosted Bash/PowerShell in Azure |
| **What It Does** | Browser-based shell with Azure CLI, Terraform, kubectl pre-installed. Persistent storage via Azure Files. |
| **Use For** | Azure resource management, cloud infrastructure, running az commands without local install |
| **Launch** | Via Windows Terminal profile (requires Azure account) |

### 11. Windows Terminal (wt)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Microsoft\WindowsApps\wt.exe` |
| **Type** | Terminal multiplexer / host |
| **What It Does** | The graphical host for all shells above. Tabs, panes, profiles, GPU-accelerated rendering, custom themes. NOT a shell itself — it launches shells. |
| **Profiles Configured** | Windows PowerShell, Command Prompt, Azure Cloud Shell, Dev Prompt VS 2022, Dev PS VS 2022, Dev Prompt VS 2019, Dev PS VS 2019, PowerShell 7 |
| **Settings** | `C:\Users\natha\AppData\Local\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` |
| **Admin** | `Start-Process wt -Verb RunAs` (elevates ALL tabs) |

---

## RUNTIMES (Execution Engines — agents can execute code through these)

### 12. Node.js
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\nodejs\node.exe` |
| **Version** | v25.8.1 |
| **What It Does** | JavaScript runtime (V8 engine). Runs JS/TS server code, scripts, build tools. Foundation for Aegis Chain, Foreman, all Node projects. |
| **Use For** | Running JS/TS files, npm scripts, Express/Fastify servers, build tools (webpack, vite, esbuild) |
| **REPL** | `node` (interactive JS console) |
| **Admin** | `Start-Process node -Verb RunAs -ArgumentList "script.js"` |

### 13. npm
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\nodejs\npm.ps1` |
| **What It Does** | Node Package Manager — install dependencies, run scripts, publish packages. |
| **Use For** | `npm install`, `npm run build`, `npm test`, `npm start` |

### 14. npx
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\nodejs\npx.ps1` |
| **What It Does** | Execute npm packages without installing globally. Run one-off tools. |
| **Use For** | `npx hardhat`, `npx create-react-app`, `npx ts-node script.ts` |

### 15. Python 3.9
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Python39\python.exe` |
| **Version** | 3.9.7 |
| **What It Does** | Python interpreter. Runs all AegisForge Python code — trading engine, keymint, bot-home, Flask apps, AI scripts. |
| **Use For** | Running .py files, pip installs, virtualenvs, Django/Flask/FastAPI, ML/data science |
| **REPL** | `python` (interactive Python console) |
| **Admin** | `Start-Process python -Verb RunAs -ArgumentList "script.py"` |

### 16. Python Launcher (py)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Python\Launcher\py.exe` |
| **What It Does** | Python version selector. `py -3.9 script.py` picks the right Python. Reads `#!python3` shebangs. |
| **Use For** | Running scripts with specific Python versions |

### 17. IPython
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Roaming\Python\Python313\Scripts\ipython.exe` |
| **What It Does** | Enhanced interactive Python shell — syntax highlighting, tab completion, magic commands (%timeit, %debug), rich display. |
| **Use For** | Interactive exploration, data analysis, debugging, prototyping |

### 18. pip
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Python39\Scripts\pip.exe` |
| **What It Does** | Python package installer. Downloads and installs packages from PyPI. |
| **Use For** | `pip install package`, `pip freeze`, `pip list` |

---

## CLI TOOLS (Agents can invoke these as commands in any shell)

### 19. Git
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Git\cmd\git.exe` |
| **Version** | 2.53.0 |
| **What It Does** | Version control — clone, commit, push, pull, branch, merge, rebase. The backbone of all code management. |
| **Use For** | All version control operations, repo management, GitHub interaction |

### 20. GitHub CLI (gh)
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\GitHub CLI\gh.exe` |
| **Version** | 2.88.1 |
| **What It Does** | GitHub from the terminal — create PRs, manage issues, trigger workflows, browse repos, manage releases. Authenticated. |
| **Use For** | `gh pr create`, `gh issue list`, `gh repo clone`, `gh workflow run`, `gh auth status` |

### 21. Docker
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` |
| **Version** | 29.3.1 |
| **What It Does** | Container runtime — build images, run containers, manage networks/volumes. Docker Desktop with WSL2 backend. |
| **Use For** | Containerized deployments, isolated environments, CI simulation, service orchestration |
| **Admin** | Docker Desktop runs with current user; container root is isolated |

### 22. Ollama
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Ollama\ollama.exe` |
| **Version** | 0.20.7 |
| **What It Does** | Local LLM runner. Serves models (llama3.1, etc.) via REST API on port 11434. Powers the Logos brain daemon. |
| **Models Dir** | `D:\Ollama\models` |
| **Use For** | `ollama run llama3.1`, `ollama list`, `ollama pull`, API at `http://localhost:11434` |

### 23. Solana CLI
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\.local\share\solana\install\releases\2.1.21\solana-release\bin\solana.exe` |
| **Version** | 2.1.21 (Agave client) |
| **What It Does** | Solana blockchain CLI — manage wallets, deploy programs, check balances, airdrop SOL, interact with on-chain programs. |
| **Use For** | `solana balance`, `solana deploy`, `solana keygen`, `solana transfer`, program deployment |

### 24. Rust Compiler (rustc)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\.cargo\bin\rustc.exe` |
| **Version** | 1.86.0 |
| **What It Does** | Compiles Rust code to native binaries. Used for Solana program development (Anchor). |
| **Use For** | Compiling Rust programs, Solana on-chain programs |

### 25. Cargo
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\.cargo\bin\cargo.exe` |
| **Version** | 1.86.0 |
| **What It Does** | Rust package manager and build system. Manages dependencies (Cargo.toml), compiles, tests, publishes crates. |
| **Use For** | `cargo build`, `cargo test`, `cargo run`, `cargo add`, Anchor project builds |

### 26. .NET SDK
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\dotnet\dotnet.exe` |
| **Version** | 10.0.202 |
| **What It Does** | .NET runtime and SDK — build/run C#/F#/VB apps, ASP.NET web apps, console tools, Azure Functions. |
| **Use For** | `dotnet build`, `dotnet run`, `dotnet new`, Azure Functions, C# tools |

### 27. SSH
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\System32\OpenSSH\ssh.exe` |
| **What It Does** | Secure shell client — connect to remote machines, tunneling, port forwarding, key-based auth. |
| **Use For** | Remote server access, deployment, tunnels (`ssh -L`), SCP file transfer |

### 28. curl
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\system32\curl.exe` |
| **What It Does** | HTTP client — send GET/POST/PUT/DELETE requests, download files, test APIs. |
| **Use For** | API testing, file downloads, webhook testing, health checks |

### 29. Chocolatey (choco)
| Key | Value |
|---|---|
| **Executable** | `C:\ProgramData\chocolatey\bin\choco.exe` |
| **Version** | 2.4.3 |
| **What It Does** | Windows package manager — install/update/remove software from command line. |
| **Use For** | `choco install package`, `choco upgrade all`, `choco list --local` |
| **Admin** | Requires elevation: `Start-Process pwsh -Verb RunAs -ArgumentList "-c choco install X"` |

### 30. winget
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Microsoft\WindowsApps\winget.exe` |
| **What It Does** | Microsoft's official package manager. Install/update apps from Microsoft Store and community repos. |
| **Use For** | `winget install`, `winget upgrade --all`, `winget search` |

---

## WINDOWS SYSTEM TOOLS (Admin-capable — agents can use for system ops)

### 31. sc.exe (Service Controller)
| **Path** | `C:\WINDOWS\system32\sc.exe` |
|---|---|
| **What It Does** | Manage Windows services — start, stop, query, create, delete, configure. |
| **Use For** | `sc query`, `sc start ServiceName`, `sc stop ServiceName` |
| **Admin** | Most operations require elevation |

### 32. netsh
| **Path** | `C:\WINDOWS\system32\netsh.exe` |
|---|---|
| **What It Does** | Network configuration — firewall rules, port forwarding, interface config, WiFi profiles. |
| **Use For** | `netsh advfirewall`, `netsh interface portproxy`, WiFi management |
| **Admin** | Requires elevation for modifications |

### 33. icacls
| **Path** | `C:\WINDOWS\system32\icacls.exe` |
|---|---|
| **What It Does** | File/folder permission management (ACLs). Set/view/modify access control lists. |
| **Use For** | Lock down vault folders, set file permissions, audit access |
| **Admin** | Often needs elevation for system files |

### 34. certutil
| **Path** | `C:\WINDOWS\system32\certutil.exe` |
|---|---|
| **What It Does** | Certificate management, hash computation, base64 encode/decode. |
| **Use For** | `certutil -hashfile`, `certutil -encode`, certificate store management |

### 35. reg.exe (Registry Editor CLI)
| **Path** | `C:\WINDOWS\system32\reg.exe` |
|---|---|
| **What It Does** | Read/write Windows Registry from command line. |
| **Use For** | `reg query`, `reg add`, `reg delete` — system configuration |
| **Admin** | HKLM writes require elevation |

### 36. sfc (System File Checker)
| **Path** | `C:\WINDOWS\system32\sfc.exe` |
|---|---|
| **What It Does** | Scans and repairs protected Windows system files. |
| **Admin** | Always requires elevation: `sfc /scannow` |

### 37. DISM
| **Path** | `C:\WINDOWS\system32\dism.exe` |
|---|---|
| **What It Does** | Deployment Image Servicing — repair Windows image, enable features, manage packages. |
| **Admin** | Always requires elevation |

### 38. tasklist / taskkill
| **Path** | `C:\WINDOWS\system32\tasklist.exe` / `taskkill.exe` |
|---|---|
| **What It Does** | List running processes / kill processes by PID or name. |
| **Use For** | `tasklist /fi "imagename eq node.exe"`, `taskkill /pid 1234 /f` |

---

## CLOUD & INFRASTRUCTURE TOOLS

### 39. Google Cloud SDK (gcloud)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd` |
| **Version** | 563.0.0 |
| **Shell Shortcut** | "Google Cloud SDK Shell" (Start Menu) — opens cmd.exe with GCP environment loaded |
| **What It Does** | Full Google Cloud Platform control — manage projects, compute instances, storage, networking, IAM, Kubernetes (GKE), Cloud Functions, Pub/Sub, BigQuery, and 200+ GCP services from CLI. |
| **Sub-tools** | `gcloud` (main CLI), `gsutil` (Cloud Storage), `bq` (BigQuery), `docker-credential-gcloud` (container auth), `git-credential-gcloud` (repo auth) |
| **Use For** | `gcloud compute instances list`, `gcloud auth login`, `gsutil cp`, `bq query`, GKE cluster management |
| **Config** | `gcloud config set project PROJECT_ID`, `gcloud init` |

### 40. kubectl (Kubernetes)
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Docker\Docker\resources\bin\kubectl.exe` |
| **Version** | v1.34.1 (with Kustomize v5.7.1) |
| **What It Does** | Kubernetes cluster management — deploy, inspect, scale, debug workloads. Control pods, services, deployments, configmaps, secrets, namespaces. |
| **Use For** | `kubectl get pods`, `kubectl apply -f manifest.yaml`, `kubectl logs pod-name`, `kubectl exec -it pod -- bash` |
| **Note** | Ships with Docker Desktop. Works with local Docker Kubernetes, GKE, AKS, EKS. |

### 41. Docker Compose
| Key | Value |
|---|---|
| **Executable** | `docker compose` (subcommand of docker) |
| **Version** | v5.1.1 |
| **What It Does** | Multi-container application orchestration — define and run multi-service apps with a single `docker-compose.yml` file. |
| **Use For** | `docker compose up -d`, `docker compose down`, `docker compose logs`, `docker compose build` |

---

## DATABASE TOOLS

### 42. PostgreSQL CLI (psql)
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\PostgreSQL\18\bin\psql.exe` |
| **Shell Script** | `C:\Program Files\PostgreSQL\18\scripts\runpsql.bat` (Start Menu: "SQL Shell (psql)") |
| **Version** | PostgreSQL 18.0 |
| **What It Does** | Interactive PostgreSQL terminal — run SQL queries, manage databases, tables, users, permissions. Import/export data. |
| **Use For** | `psql -U postgres -d dbname`, SQL queries, `\dt` (list tables), `\d tablename` (describe), `\copy` (import/export) |
| **Companion Tools** | Same directory: `pg_dump.exe` (backup), `pg_restore.exe` (restore), `createdb.exe`, `dropdb.exe`, `pg_isready.exe` (health check), `pgbench.exe` (benchmarking) |

---

## BLOCKCHAIN TOOLS (Additional)

### 43. Anchor CLI
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\.cargo\bin\anchor.exe` |
| **Version** | anchor-cli 0.32.1 |
| **What It Does** | Solana smart contract (program) framework — scaffold, build, test, deploy Solana programs written in Rust. Generates IDL for client integration. |
| **Use For** | `anchor init`, `anchor build`, `anchor test`, `anchor deploy`, `anchor idl` |
| **Note** | Previously listed as "not installed" — it IS installed via cargo. |

### 44. Rustup (Rust Toolchain Manager)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\.cargo\bin\rustup.exe` |
| **Version** | 1.29.0 |
| **What It Does** | Manages Rust toolchains — install/update/switch between stable, beta, nightly. Install components (clippy, rustfmt, rust-analyzer). Manages targets (wasm, ARM, etc). |
| **Use For** | `rustup update`, `rustup default nightly`, `rustup target add wasm32-unknown-unknown`, `rustup component add clippy` |

---

## JAVA RUNTIMES

### 45. Java JRE 1.8 (Oracle)
| Key | Value |
|---|---|
| **Path** | `C:\Program Files\Java\jre1.8.0_461\bin\java.exe` |
| **Version** | 1.8.0_461 |
| **What It Does** | Legacy Java Runtime Environment. Runs Java applications. Some older tools and enterprise software require Java 8 specifically. |
| **Use For** | Running .jar files that require Java 8, legacy enterprise apps |

### 46. Java JRE 11 (Eclipse Adoptium)
| Key | Value |
|---|---|
| **Path** | `C:\Program Files\Eclipse Adoptium\jre-11.0.28.6-hotspot\bin\java.exe` |
| **Version** | 11.0.28.6 (HotSpot) |
| **What It Does** | LTS Java runtime. Many modern tools target Java 11 as minimum. Open-source (Adoptium/Temurin). |
| **Use For** | Running Java 11+ apps, middleware, build tools |

### 47. Java JDK 25 (Microsoft OpenJDK)
| Key | Value |
|---|---|
| **Path** | `C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot\bin\java.exe` |
| **Compiler** | `C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot\bin\javac.exe` |
| **Version** | OpenJDK 25.0.2 LTS |
| **What It Does** | Latest Java Development Kit — compile AND run Java code. Includes javac compiler, jshell REPL, jlink, jpackage. Primary JDK on PATH. |
| **Use For** | `javac App.java`, `java App`, `jshell` (REPL), `jpackage` (native installers), Gradle/Maven builds |

---

## PYTHON RUNTIMES (All Installed Versions)

### 48. Python 3.10
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Python\Python310\python.exe` |
| **Version** | 3.10.11 |
| **IDLE** | `C:\Users\natha\AppData\Local\Programs\Python\Python310\pythonw.exe` |

### 49. Python 3.11
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Python\Python311\python.exe` |
| **Version** | 3.11.9 |
| **IDLE** | `C:\Users\natha\AppData\Local\Programs\Python\Python311\pythonw.exe` |

### 50. Python 3.13
| Key | Value |
|---|---|
| **Executable** | `C:\Python313\python.exe` |
| **Version** | 3.13.7 |
| **Choco alias** | `C:\ProgramData\chocolatey\bin\python3.13.exe` |
| **IDLE** | `C:\Python313\pythonw.exe` |

### 51. Python 3.14
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Python\pythoncore-3.14-64\python.exe` |
| **Version** | 3.14.3 |
| **IDLE** | `C:\Users\natha\AppData\Local\Python\pythoncore-3.14-64\pythonw.exe` |
| **Note** | Newest Python — may have compatibility issues with some packages. Use `py -3.14` to invoke. |

> **Python version selector:** Use `py -3.X script.py` to pick a specific version. The `py.exe` launcher reads `#!python3.X` shebangs.

---

## IDE & CODE EDITOR TOOLS

### 52. Visual Studio Code (Stable)
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code\Code.exe` |
| **CLI** | `code` (on PATH) |
| **What It Does** | Code editor with integrated terminal, debugging, extensions, Git. |
| **Use For** | `code .` (open folder), `code file.txt` (open file), `code --diff a.txt b.txt` |

### 53. Visual Studio Code Insiders
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code Insiders\Code - Insiders.exe` |
| **CLI** | `code-insiders` (on PATH) |
| **What It Does** | Pre-release VS Code with latest features. PRIMARY editor for AegisForge. 83 extensions installed. |
| **Agent CLI** | `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code Insiders\Agents - Insiders.exe` |

### 54. Visual Studio 2022 Community
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\devenv.exe` |
| **What It Does** | Full IDE for .NET, C++, C#, F#. Includes debugger, profiler, IntelliSense, designers. |
| **Use For** | .sln/.csproj projects, C++ development, .NET desktop/web apps |

### 55. OpenCode
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\AppData\Local\OpenCode\OpenCode.exe` |
| **What It Does** | Terminal-based AI coding assistant. Alternative to Claude Code / aider. |
| **Use For** | AI-assisted coding from terminal |

### 56. GitHub Desktop
| Key | Value |
|---|---|
| **Executable** | `C:\ProgramData\natha\GitHubDesktop\GitHubDesktop.exe` |
| **What It Does** | GUI Git client — visual branch management, diff viewing, commit history, PR creation. |
| **Use For** | Visual Git operations, repository management |

---

## OCR & DOCUMENT TOOLS

### 57. Tesseract OCR
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Tesseract-OCR\tesseract.exe` |
| **Version** | 5.4.0 |
| **What It Does** | Optical Character Recognition engine — extract text from images, PDFs, screenshots. Supports 100+ languages. |
| **Use For** | `tesseract image.png output`, `tesseract image.png output -l eng pdf`, `tesseract image.png - --psm 6` |

---

## NETWORKING & PRIVACY TOOLS

### 58. I2P Router
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\i2p\i2p.exe` |
| **Service** | `C:\Program Files\i2p\I2Psvc.exe` (Windows service mode) |
| **What It Does** | Invisible Internet Project — anonymous overlay network. Routes traffic through encrypted tunnels for privacy. |
| **Console** | `http://localhost:7657` when running |
| **Use For** | Anonymous communication, hidden services, privacy-focused browsing |

---

## DEVELOPER COMMAND PROMPTS (Visual Studio)

These are specialized cmd/powershell sessions with Visual Studio build tools pre-loaded in PATH.

### 59. x64 Native Tools Command Prompt for VS 2022
| **What It Does** | cmd.exe with 64-bit MSVC compiler (cl.exe), linker, Windows SDK. For building x64 native C/C++. |
|---|---|

### 60. x86 Native Tools Command Prompt for VS 2022
| **What It Does** | cmd.exe with 32-bit MSVC compiler. For building x86 native C/C++. |
|---|---|

### 61. x64_x86 Cross Tools Command Prompt for VS 2022
| **What It Does** | Use x64 host tools to cross-compile for x86 target. |
|---|---|

### 62. x86_x64 Cross Tools Command Prompt for VS 2022
| **What It Does** | Use x86 host tools to cross-compile for x64 target. |
|---|---|

### 63-66. Same prompts exist for VS 2019
Identical layout as VS 2022 versions but using the older VS 2019 toolchain. Use for projects targeting older Windows SDK versions.

---

## MISC TOOLS

### 67. Gitpod CLI
| Key | Value |
|---|---|
| **Executable** | `C:\Users\natha\OneDrive\Desktop\gitpod-cli-windows-amd64.exe` |
| **What It Does** | Cloud development environment CLI — manage Gitpod workspaces from terminal. |
| **Use For** | Start/stop cloud dev environments, manage workspace configuration |
| **Note** | Standalone binary on Desktop. Consider moving to a tools directory or adding to PATH. |

### 68. PowerShell ISE
| Key | Value |
|---|---|
| **Executable** | `C:\WINDOWS\system32\WindowsPowerShell\v1.0\PowerShell_ISE.exe` |
| **x86 variant** | `C:\WINDOWS\syswow64\WindowsPowerShell\v1.0\PowerShell_ISE.exe` |
| **What It Does** | Integrated Scripting Environment for PowerShell 5.1 — editor + console + debugger in one window. Syntax highlighting, IntelliSense, breakpoints. |
| **Use For** | Writing/debugging PowerShell scripts, interactive exploration with GUI |
| **Note** | Legacy tool. VS Code with PowerShell extension is the modern replacement, but ISE still works for quick PS5.1 scripting. |

### 69. Git CMD
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files\Git\git-cmd.exe` |
| **What It Does** | Opens a CMD window with Git binaries in PATH. Unlike Git Bash, stays in CMD environment. |
| **Use For** | Git operations when you need cmd.exe compatibility |

### 70. BleachBit Debugging Terminal
| Key | Value |
|---|---|
| **Executable** | `C:\Program Files (x86)\BleachBit\bleachbit_console.exe` |
| **What It Does** | System cleaner console — free disk space, clear browser data, logs, temp files, with debug output. |
| **Use For** | Disk cleanup, privacy cleaning, temp file removal |

### 71. conhost.exe (Console Host)
| Key | Value |
|---|---|
| **Path** | `C:\WINDOWS\system32\conhost.exe` |
| **What It Does** | Windows console host process — renders the classic console window. Every legacy console app runs through this. |
| **Use For** | Low-level console rendering. Agents don't invoke this directly. |

---

## Admin Elevation Guide (For Agents)

### Method 1: Start-Process with RunAs (Recommended)
```powershell
# Launch an elevated PowerShell and run a command
Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -Command `"your-command-here`""

# Launch elevated and keep window open
Start-Process pwsh -Verb RunAs -ArgumentList "-NoExit -Command `"your-command-here`""
```

### Method 2: gsudo (if installed)
```powershell
# gsudo elevates the current command without new window
gsudo { Stop-Service SomeService }
```

### Method 3: Scheduled Task (for unattended elevation)
```powershell
# Create a task that runs as SYSTEM (highest privilege)
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-File C:\path\to\script.ps1"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
Register-ScheduledTask -TaskName "AegisAdmin" -Action $action -Principal $principal
Start-ScheduledTask -TaskName "AegisAdmin"
```

### Method 4: Run as Different User
```powershell
# Run command as specific user
Start-Process pwsh -Credential (Get-Credential) -ArgumentList "-Command your-command"
```

### Which Tools Need Admin?
| Always Needs Admin | Usually Needs Admin | Never Needs Admin |
|---|---|---|
| sfc, DISM | choco install, netsh (modify), sc (start/stop), reg (HKLM) | git, node, python, npm, cargo, solana, gh, curl, ssh (client), ollama |

---

## Agent Quick Reference

```yaml
# Default shell for all operations:
default_shell: "C:\\Program Files\\PowerShell\\7\\pwsh.exe"

# For Unix-like scripting:
unix_shell: "C:\\Program Files\\Git\\bin\\bash.exe"

# For .NET/C++ builds:
build_shell: "Developer PowerShell for VS 2022"  # via Windows Terminal

# For container operations:
container_runtime: "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
container_compose: "docker compose"  # v5.1.1
container_linux: "wsl.exe"
kubernetes: "C:\\Program Files\\Docker\\Docker\\resources\\bin\\kubectl.exe"  # v1.34.1

# For blockchain:
evm_tools: null  # Foundry (forge/cast/anvil) NOT installed — install via: curl -L https://foundry.paradigm.xyz | bash
solana_cli: "C:\\Users\\natha\\.local\\share\\solana\\install\\releases\\2.1.21\\solana-release\\bin\\solana.exe"
anchor_cli: "C:\\Users\\natha\\.cargo\\bin\\anchor.exe"  # v0.32.1

# For cloud:
gcloud: "C:\\Users\\natha\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"  # v563.0.0
gcloud_shell: "Google Cloud SDK Shell"  # Windows Terminal / Start Menu shortcut

# For AI inference:
llm_runtime: "C:\\Users\\natha\\AppData\\Local\\Programs\\Ollama\\ollama.exe"
llm_api: "http://localhost:11434"

# For databases:
postgresql: "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"  # v18.0

# For OCR:
tesseract: "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"  # v5.4.0

# For package management:
pkg_windows: "winget.exe"
pkg_choco: "C:\\ProgramData\\chocolatey\\bin\\choco.exe"  # needs admin
pkg_node: "C:\\Program Files\\nodejs\\npm.ps1"
pkg_python: "C:\\Program Files\\Python39\\Scripts\\pip.exe"
pkg_rust: "C:\\Users\\natha\\.cargo\\bin\\cargo.exe"

# Python versions (use py -3.X to select):
python_3_9: "C:\\Program Files\\Python39\\python.exe"
python_3_10: "C:\\Users\\natha\\AppData\\Local\\Programs\\Python\\Python310\\python.exe"
python_3_11: "C:\\Users\\natha\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"
python_3_13: "C:\\Python313\\python.exe"
python_3_14: "C:\\Users\\natha\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe"

# Java runtimes:
java_8: "C:\\Program Files\\Java\\jre1.8.0_461\\bin\\java.exe"
java_11: "C:\\Program Files\\Eclipse Adoptium\\jre-11.0.28.6-hotspot\\bin\\java.exe"
java_25: "C:\\Program Files\\Microsoft\\jdk-25.0.2.10-hotspot\\bin\\java.exe"  # primary on PATH

# To elevate any command:
elevate_command: 'Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -Command `"{COMMAND}`""'
```

---

## Missing Tools (Consider Installing)

| Tool | What It Does | Install Command |
|---|---|---|
| **Foundry** (forge/cast/anvil) | EVM smart contract toolkit — compile, test, deploy, interact | `curl -L https://foundry.paradigm.xyz \| bash` then `foundryup` |
| **Terraform** | Infrastructure as code | `choco install terraform` or `winget install Hashicorp.Terraform` |
| **Azure CLI** | Azure cloud management | `winget install Microsoft.AzureCLI` |
| **gsudo** | Sudo for Windows — inline elevation | `winget install gerardog.gsudo` |
| **Ubuntu (WSL)** | Full Linux distro (Docker WSL is running but no Ubuntu) | `wsl --install -d Ubuntu` |

> **Note:** Anchor and kubectl were previously listed as missing — they ARE installed (anchor 0.32.1, kubectl v1.34.1).
