# VS Code / VS Code Insiders — CLI Cheat Sheet

> **Stable:** `code` → `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code\Code.exe`  
> **Insiders (PRIMARY):** `code-insiders` → `C:\Users\natha\AppData\Local\Programs\Microsoft VS Code Insiders\Code - Insiders.exe`  
> **Extensions:** 83 installed (see EXTENSIONS_INVENTORY.md)  
> **AegisForge Role:** Primary development environment

---

## Opening Files & Folders

```powershell
# Open folder
code .                                     # Current directory (stable)
code-insiders .                            # Current directory (insiders)
code-insiders C:\Users\natha\v4w_website   # Specific folder

# Open files
code-insiders file.txt                     # Open file
code-insiders file.txt:10                  # Open at line 10
code-insiders file1.txt file2.txt          # Multiple files
code-insiders --goto file.txt:10:5         # Line 10, column 5

# Open in existing window
code-insiders -r .                         # Reuse window
code-insiders --add folder/                # Add folder to workspace

# New window
code-insiders -n                           # New empty window
code-insiders -n file.txt                  # New window with file
```

---

## Diff & Merge

```powershell
# Compare files
code-insiders --diff file1.txt file2.txt   # Side-by-side diff
code-insiders --merge file1 file2 base output  # Three-way merge
```

---

## Extension Management

```powershell
# List extensions
code-insiders --list-extensions            # All installed
code-insiders --list-extensions --show-versions   # With versions

# Install/Uninstall
code-insiders --install-extension ms-python.python
code-insiders --install-extension extension.vsix   # From VSIX file
code-insiders --uninstall-extension ms-python.python

# Disable all extensions (troubleshooting)
code-insiders --disable-extensions
```

---

## Piping & Output

```powershell
# Pipe stdin to VS Code
Get-Process | code-insiders -                # Open pipe output as untitled file
git diff | code-insiders -                   # View diff in VS Code
cat log.txt | code-insiders -                # Open file content

# Output reading
code-insiders --status                       # Process info, folders, extensions
code-insiders --verbose                      # Launch with verbose logging
```

---

## Settings & Config

```powershell
# Settings locations (Insiders)
# User: %APPDATA%\Code - Insiders\User\settings.json
# Workspace: .vscode\settings.json

# Open settings
code-insiders --open-settings               # Open settings UI (not available in all versions)
# Or just: Ctrl+, inside VS Code

# Portable mode
# Create "data" folder next to Code.exe for portable installation
```

---

## Useful Flags

| Flag | Description |
|---|---|
| `-n` | New window |
| `-r` | Reuse existing window |
| `-g file:line:col` | Open at position |
| `-d file1 file2` | Diff mode |
| `-w` | Wait for window to close (useful in git config) |
| `--locale=en` | Set language |
| `--log=debug` | Set log level |
| `--disable-extensions` | Safe mode |
| `--user-data-dir path` | Custom user data |
| `--extensions-dir path` | Custom extensions |

---

## Git Integration

```bash
# Set VS Code as git editor
git config --global core.editor "code-insiders --wait"

# Set VS Code as diff tool
git config --global diff.tool vscode
git config --global difftool.vscode.cmd "code-insiders --wait --diff \$LOCAL \$REMOTE"

# Set VS Code as merge tool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd "code-insiders --wait --merge \$REMOTE \$LOCAL \$BASE \$MERGED"
```
