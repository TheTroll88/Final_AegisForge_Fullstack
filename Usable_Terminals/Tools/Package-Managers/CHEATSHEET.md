# Package Managers — Cheat Sheet
## winget, Chocolatey (choco), npm, pip, cargo

> **winget:** `winget.exe` (built-in Windows 11)  
> **Chocolatey:** `C:\ProgramData\chocolatey\bin\choco.exe` (needs admin)  
> **npm:** see Node-npm/ folder for full reference  
> **pip:** see Python/ folder for full reference  
> **cargo:** `C:\Users\natha\.cargo\bin\cargo.exe` (Rust)

---

## winget (Windows Package Manager)

```powershell
# Search & install
winget search "visual studio"              # Search packages
winget install Microsoft.VisualStudioCode  # Install by ID
winget install -e --id Git.Git            # Exact match install
winget install --accept-source-agreements --accept-package-agreements Docker.DockerDesktop

# List & manage
winget list                                # All installed packages
winget list --upgrade-available            # Packages with updates
winget upgrade --all                       # Update everything
winget upgrade Microsoft.PowerShell        # Update specific package
winget uninstall Docker.DockerDesktop      # Uninstall

# Info
winget show Git.Git                        # Package details
winget source list                         # List sources (msstore, winget)

# Export/Import (for setting up new machines)
winget export -o packages.json             # Export installed packages
winget import -i packages.json             # Install from list
```

---

## Chocolatey (choco)

> Requires admin (elevated) terminal for most operations.

```powershell
# Search & install (admin required)
choco search nodejs                        # Search packages
choco install nodejs-lts -y                # Install (auto-confirm)
choco install git python3 -y               # Install multiple
choco install terraform --version=1.8.0    # Specific version

# List & manage
choco list --local-only                    # Installed packages (legacy)
choco list                                 # Installed packages (new syntax)
choco outdated                             # Packages with updates
choco upgrade all -y                       # Upgrade everything
choco upgrade nodejs-lts -y               # Upgrade specific
choco uninstall nodejs-lts -y             # Uninstall

# Info
choco info nodejs-lts                      # Package details
choco source list                          # List sources
choco config list                          # Configuration

# Pin (prevent auto-upgrade)
choco pin add -n=python3                   # Pin package version
choco pin list                             # List pinned packages
choco pin remove -n=python3               # Unpin
```

---

## cargo (Rust Package Manager)

```bash
# Create project
cargo init my-project                      # Create in current directory
cargo new my-project                       # Create new directory

# Build & run
cargo build                                # Debug build
cargo build --release                      # Optimized release build
cargo run                                  # Build + run
cargo run -- arg1 arg2                     # Build + run with arguments
cargo check                                # Check compilation without building (fast)

# Dependencies
cargo add serde                            # Add dependency (Cargo.toml)
cargo add serde --features derive          # Add with features
cargo add tokio -F full                    # Add with features (short form)
cargo remove serde                         # Remove dependency
cargo update                               # Update dependencies

# Testing & quality
cargo test                                 # Run all tests
cargo test test_name                       # Run specific test
cargo test -- --nocapture                  # Show println! output
cargo bench                                # Run benchmarks
cargo clippy                               # Linter
cargo fmt                                  # Format code
cargo doc --open                           # Generate docs + open browser

# Install CLI tools
cargo install --git https://github.com/user/tool  # Install from git
cargo install ripgrep                      # Install published crate as CLI
cargo install-update -a                    # Update all installed binaries (needs cargo-update)

# Info
cargo tree                                 # Dependency tree
cargo tree -d                              # Show duplicate dependencies
cargo metadata --format-version 1          # Machine-readable project info
```

---

## Comparison: Which Package Manager for What?

| Need | Use | Example |
|---|---|---|
| Install Windows apps | winget | `winget install Git.Git` |
| Install dev tools (admin) | choco | `choco install terraform -y` |
| JavaScript packages | npm | `npm install express` |
| Python packages | pip | `pip install flask` |
| Rust packages/tools | cargo | `cargo install ripgrep` |

---

## Quick Reference

```powershell
# winget update everything
winget upgrade --all --accept-source-agreements

# choco update everything (admin)
choco upgrade all -y

# npm update project dependencies
npm update

# pip update all (careful — may break things)
pip list --outdated --format=json | python -c "import json,sys; [print(p['name']) for p in json.load(sys.stdin)]" | ForEach-Object { pip install -U $_ }

# cargo update project dependencies
cargo update
```
