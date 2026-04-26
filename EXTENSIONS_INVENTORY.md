# AegisForge — VS Code Insiders Extensions Inventory

> **Last updated:** April 2026  
> **Total:** 81 marketplace + 2 built-in (Copilot, Copilot Chat) = **83 extensions**  
> **IDE:** VS Code Insiders  

---

## Built-In (Insiders — not listed by `--list-extensions`)

| Extension | What It Does |
|---|---|
| **GitHub Copilot** | AI-powered code completion — suggests entire lines/blocks as you type. Runs inference via cloud (GPT-4, Claude). |
| **GitHub Copilot Chat** | Conversational AI assistant inside VS Code — explain code, refactor, generate tests, debug, run terminal commands. Currently using Claude Opus 4.6. |

---

## Python (7 extensions)

| ID | Name | What It Does |
|---|---|---|
| `ms-python.python` | Python | Core Python language support — IntelliSense, linting, debugging, formatting, virtualenvs. The foundation for all Python work. |
| `ms-python.vscode-pylance` | Pylance | Fast, feature-rich Python language server. Provides type checking, auto-imports, code navigation, rich hover info. |
| `ms-python.debugpy` | Debugpy | Python debugger — breakpoints, step-through, variable inspection, attach to running processes, remote debug. |
| `ms-python.black-formatter` | Black Formatter | Opinionated Python code formatter. Auto-formats on save to consistent style. |
| `ms-python.isort` | isort | Sorts Python imports alphabetically and by section (stdlib, third-party, local). |
| `ms-python.mypy-type-checker` | Mypy Type Checker | Static type analysis for Python. Catches type errors before runtime. Reads type hints. |
| `ms-python.vscode-python-envs` | Python Environments | Manages virtual environments, conda envs, system Python. Lets you pick interpreters easily. |

## JavaScript / TypeScript (8 extensions)

| ID | Name | What It Does |
|---|---|---|
| `ms-vscode.vscode-typescript-next` | TypeScript Next | Nightly TypeScript language features. Always the latest TS compiler/language service. |
| `dbaeumer.vscode-eslint` | ESLint | JavaScript/TypeScript linter. Catches bugs, enforces code style, auto-fixes on save. |
| `esbenp.prettier-vscode` | Prettier | Multi-language code formatter (JS, TS, CSS, HTML, JSON, MD). Auto-formats on save. |
| `christian-kohler.npm-intellisense` | npm Intellisense | Auto-completes npm module names in import statements. Reads your package.json. |
| `christian-kohler.path-intellisense` | Path Intellisense | Auto-completes file paths as you type. Works in any language. |
| `dsznajder.es7-react-js-snippets` | ES7+ React Snippets | Shorthand snippets for React, Redux, GraphQL — type `rfc` to scaffold a component. |
| `wix.vscode-import-cost` | Import Cost | Shows the size (KB) of each JS/TS import inline. Helps avoid bloated bundles. |
| `styled-components.vscode-styled-components` | Styled Components | Syntax highlighting and IntelliSense for CSS-in-JS (styled-components, emotion). |

## Solidity / Blockchain (4 extensions)

| ID | Name | What It Does |
|---|---|---|
| `juanblanco.solidity` | Solidity | Core Solidity language support — syntax, compilation, error highlighting, go-to-definition. |
| `nomicfoundation.hardhat-solidity` | Hardhat Solidity | Hardhat + Foundry integration — compile, test, deploy contracts. Inline compiler errors. |
| `ackeeblockchain.tools-for-solidity` | Tools for Solidity | Smart contract security tools from Ackee Blockchain — detects vulnerabilities, generates documentation. |
| `trufflesuite-csi.truffle-vscode` | Truffle for VS Code | Truffle Suite integration — compile, migrate, debug Solidity contracts. Network management. |

## Rust (1 extension)

| ID | Name | What It Does |
|---|---|---|
| `rust-lang.rust-analyzer` | rust-analyzer | Full Rust language server — IntelliSense, type inference, refactoring, macro expansion. Also serves Solana/Anchor development. |

## PowerShell (1 extension)

| ID | Name | What It Does |
|---|---|---|
| `ms-vscode.powershell` | PowerShell | PowerShell language support — IntelliSense, debugging, PSScriptAnalyzer, integrated console. Runs both PS 7 and 5.1. |

## Infrastructure as Code (1 extension)

| ID | Name | What It Does |
|---|---|---|
| `hashicorp.terraform` | Terraform | HCL syntax, Terraform validation, auto-complete for providers/resources, plan preview. |

---

## Web & Frontend (5 extensions)

| ID | Name | What It Does |
|---|---|---|
| `bradlc.vscode-tailwindcss` | Tailwind CSS IntelliSense | Auto-completes Tailwind classes, shows CSS on hover, flags conflicts. |
| `formulahendry.auto-close-tag` | Auto Close Tag | Automatically closes HTML/XML tags when you type the opening tag. |
| `formulahendry.auto-rename-tag` | Auto Rename Tag | When you rename an HTML opening tag, the closing tag updates automatically (and vice versa). |
| `ritwickdey.liveserver` | Live Server | Launches a local dev server with live reload — edit HTML/CSS and see changes instantly in browser. |
| `jock.svg` | SVG | SVG preview, minification, and editing. View SVG files directly in the editor. |

---

## API & HTTP (2 extensions)

| ID | Name | What It Does |
|---|---|---|
| `humao.rest-client` | REST Client | Send HTTP requests directly from `.http` files. Test APIs without leaving VS Code. Shows response inline. |
| `rangav.vscode-thunder-client` | Thunder Client | Full GUI REST client (like Postman) inside VS Code — collections, environments, auth, tests. |

## Database (4 extensions)

| ID | Name | What It Does |
|---|---|---|
| `mtxr.sqltools` | SQLTools | Universal database management — connect, browse, query any SQL database from VS Code. |
| `mtxr.sqltools-driver-sqlite` | SQLTools SQLite | SQLite connection driver. Query `.db` files directly. |
| `mtxr.sqltools-driver-pg` | SQLTools PostgreSQL | PostgreSQL connection driver. Connect to Postgres instances. |
| `mtxr.sqltools-driver-mysql` | SQLTools MySQL | MySQL/MariaDB connection driver. |

---

## DevOps & Containers (5 extensions)

| ID | Name | What It Does |
|---|---|---|
| `ms-azuretools.vscode-docker` | Docker | Dockerfile/Compose syntax, build/run/debug containers, image management, container logs. |
| `ms-azuretools.vscode-containers` | Dev Containers | Defines containerized dev environments via `devcontainer.json` — reproducible, isolated setups. |
| `ms-vscode-remote.remote-containers` | Remote - Containers | Develop inside a running Docker container. Full VS Code experience inside the container. |
| `ms-kubernetes-tools.vscode-kubernetes-tools` | Kubernetes | Cluster explorer, pod logs, YAML validation, Helm chart support. kubectl integration. |
| `github.vscode-github-actions` | GitHub Actions | Edit/validate CI/CD workflow YAML. Syntax highlighting, auto-complete for action inputs. |

---

## Remote Development (5 extensions)

| ID | Name | What It Does |
|---|---|---|
| `ms-vscode-remote.remote-ssh` | Remote - SSH | Develop on any remote machine via SSH. Full VS Code on remote filesystems. |
| `ms-vscode-remote.remote-ssh-edit` | Remote - SSH: Editing | Edit SSH config files with IntelliSense. |
| `ms-vscode-remote.remote-wsl` | Remote - WSL | Open any folder inside Windows Subsystem for Linux. Full Linux toolchain. |
| `ms-vscode.remote-explorer` | Remote Explorer | Unified sidebar for all remote connections — SSH hosts, WSL distros, containers, tunnels. |
| `natizyskunk.sftp` | SFTP | Upload/download files to/from remote servers via SFTP. Auto-sync on save. |

---

## Git & Version Control (4 extensions)

| ID | Name | What It Does |
|---|---|---|
| `eamodio.gitlens` | GitLens | Supercharged Git — inline blame, file history, commit search, visual diffs, CodeLens. Also powers GitKraken MCP tools. |
| `mhutchie.git-graph` | Git Graph | Visual branch/commit graph. See all branches, merges, tags in a beautiful timeline. |
| `donjayamanne.githistory` | Git History | View and search git log, file history, compare branches/commits. Visual diff viewer for any past version. |
| `github.vscode-pull-request-github` | GitHub Pull Requests | Create, review, and merge PRs directly in VS Code. Comment on code, resolve threads. |

---

## Testing (3 extensions)

| ID | Name | What It Does |
|---|---|---|
| `hbenl.vscode-test-explorer` | Test Explorer UI | Universal test runner sidebar — run/debug tests from any framework with adapters. |
| `ms-vscode.test-adapter-converter` | Test Adapter Converter | Bridges old Test Explorer API to the new native Testing API. Backwards compatibility. |
| `ms-playwright.playwright` | Playwright Test | Run Playwright browser tests. Pick locators, record tests, trace viewer, debug in browser. |

---

## Notebooks & Data (6 extensions)

| ID | Name | What It Does |
|---|---|---|
| `ms-toolsai.jupyter` | Jupyter | Run Jupyter notebooks in VS Code. Execute cells, view outputs, variable explorer. |
| `ms-toolsai.jupyter-keymap` | Jupyter Keymap | Jupyter-native keyboard shortcuts (Shift+Enter to run cell, etc.). |
| `ms-toolsai.jupyter-renderers` | Jupyter Renderers | Rich output rendering — plotly, vega, LaTeX, maps, interactive widgets. |
| `ms-toolsai.vscode-jupyter-cell-tags` | Jupyter Cell Tags | Tag cells with metadata (e.g., "parameters" for Papermill). |
| `ms-toolsai.vscode-jupyter-slideshow` | Jupyter Slideshow | Turn notebooks into presentations. Assign slide types to cells. |
| `mechatroner.rainbow-csv` | Rainbow CSV | Colorizes CSV/TSV columns so you can read tabular data at a glance. Supports RBQL queries. |

---

## Security & Quality (2 extensions)

| ID | Name | What It Does |
|---|---|---|
| `sonarsource.sonarlint-vscode` | SonarLint | Real-time code quality and security scanning. Detects bugs, vulnerabilities, code smells across 15+ languages. |
| `anatoliihusakovskyi.file-shield` | File Shield | File integrity monitoring — detects unauthorized changes to critical files. |

---

## Markdown & Documentation (4 extensions)

| ID | Name | What It Does |
|---|---|---|
| `yzhang.markdown-all-in-one` | Markdown All in One | Keyboard shortcuts, auto TOC, list editing, math, auto-preview for Markdown. |
| `bierner.markdown-mermaid` | Markdown Mermaid | Renders Mermaid diagrams (flowcharts, sequence diagrams, ER diagrams) in Markdown preview. |
| `shd101wyy.markdown-preview-enhanced` | Markdown Preview Enhanced | Advanced preview — LaTeX, PlantUML, code chunks, pandoc export, PDF generation. |
| `davidanson.vscode-markdownlint` | markdownlint | Lints Markdown files for style and formatting issues — broken links, inconsistent headers, trailing spaces, line length. |

---

## Productivity & Editor Enhancements (13 extensions)

| ID | Name | What It Does |
|---|---|---|
| `aaron-bond.better-comments` | Better Comments | Color-codes comments: `// !` = red alert, `// ?` = blue question, `// TODO` = orange, `// *` = green highlight. |
| `alefragnani.bookmarks` | Bookmarks | Place bookmarks on lines, jump between them. Persists across sessions. |
| `alefragnani.project-manager` | Project Manager | Save and switch between projects instantly. Sidebar with all your workspaces. |
| `formulahendry.code-runner` | Code Runner | Run any code snippet or file with one click. Supports 50+ languages. |
| `gruntfuggly.todo-tree` | Todo Tree | Scans workspace for TODO, FIXME, HACK, BUG comments. Shows them in a tree sidebar. |
| `usernamehw.errorlens` | Error Lens | Shows errors and warnings inline, right next to the code. No need to hover. |
| `oderwat.indent-rainbow` | Indent Rainbow | Colorizes each indentation level with a different color. Instantly see nesting depth. |
| `britesnow.vscode-toggle-quotes` | Toggle Quotes | Cycle between single quotes, double quotes, and backticks with a keyboard shortcut. |
| `sleistner.vscode-fileutils` | File Utils | Rename, move, duplicate, delete files from the command palette. No mouse needed. |
| `chrmarti.regex` | Regex Previewer | Live-preview regex matches against sample text. Side-by-side regex testing. |
| `ibm.output-colorizer` | Output Colorizer | Adds syntax highlighting to the Output panel. Colored log levels, timestamps. |
| `ms-vsliveshare.vsliveshare` | Live Share | Real-time collaborative editing. Share your workspace with others — they edit in their own VS Code. |
| `ms-vscode.hexeditor` | Hex Editor | View and edit binary files byte-by-byte. Useful for inspecting executables, crypto keys, binary formats. |

---

## Data Formats (6 extensions)

| ID | Name | What It Does |
|---|---|---|
| `redhat.vscode-yaml` | YAML | YAML language support — validation, auto-complete, schema association (K8s, Docker, CI/CD). |
| `redhat.vscode-xml` | XML | XML language support — validation, formatting, XSD/DTD schemas, XPath evaluation. |
| `zainchen.json` | JSON | Enhanced JSON editing — validation, formatting, tree view, schema support. |
| `mikestead.dotenv` | DotENV | Syntax highlighting for `.env` files. Colorizes key-value pairs. |
| `tamasfe.even-better-toml` | Even Better TOML | TOML language support — for Cargo.toml, pyproject.toml, config files. Schema validation. |
| `editorconfig.editorconfig` | EditorConfig | Reads `.editorconfig` files and enforces consistent coding styles across editors (indent, charset, newlines). |

---

## Quick Restore Command

```powershell
@(
    "aaron-bond.better-comments","ackeeblockchain.tools-for-solidity","alefragnani.bookmarks",
    "alefragnani.project-manager","anatoliihusakovskyi.file-shield","bierner.markdown-mermaid",
    "bradlc.vscode-tailwindcss","britesnow.vscode-toggle-quotes","christian-kohler.npm-intellisense",
    "christian-kohler.path-intellisense","chrmarti.regex","dbaeumer.vscode-eslint",
    "dsznajder.es7-react-js-snippets","eamodio.gitlens","editorconfig.editorconfig",
    "esbenp.prettier-vscode","formulahendry.auto-close-tag","formulahendry.auto-rename-tag",
    "formulahendry.code-runner","github.vscode-github-actions","github.vscode-pull-request-github",
    "gruntfuggly.todo-tree","hashicorp.terraform","hbenl.vscode-test-explorer",
    "humao.rest-client","ibm.output-colorizer","jock.svg","juanblanco.solidity",
    "mechatroner.rainbow-csv","mhutchie.git-graph","mikestead.dotenv",
    "ms-azuretools.vscode-containers","ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools","ms-playwright.playwright",
    "ms-python.black-formatter","ms-python.debugpy","ms-python.isort",
    "ms-python.mypy-type-checker","ms-python.python","ms-python.vscode-pylance",
    "ms-python.vscode-python-envs","ms-toolsai.jupyter","ms-toolsai.jupyter-keymap",
    "ms-toolsai.jupyter-renderers","ms-toolsai.vscode-jupyter-cell-tags",
    "ms-toolsai.vscode-jupyter-slideshow","ms-vscode-remote.remote-containers",
    "ms-vscode-remote.remote-ssh","ms-vscode-remote.remote-ssh-edit",
    "ms-vscode-remote.remote-wsl","ms-vscode.hexeditor","ms-vscode.powershell",
    "ms-vscode.remote-explorer","ms-vscode.test-adapter-converter",
    "ms-vscode.vscode-typescript-next","ms-vsliveshare.vsliveshare",
    "mtxr.sqltools","mtxr.sqltools-driver-mysql","mtxr.sqltools-driver-pg",
    "mtxr.sqltools-driver-sqlite","natizyskunk.sftp","nomicfoundation.hardhat-solidity",
    "oderwat.indent-rainbow","rangav.vscode-thunder-client","redhat.vscode-xml",
    "redhat.vscode-yaml","ritwickdey.liveserver","rust-lang.rust-analyzer",
    "shd101wyy.markdown-preview-enhanced","sleistner.vscode-fileutils",
    "sonarsource.sonarlint-vscode","styled-components.vscode-styled-components",
    "tamasfe.even-better-toml","trufflesuite-csi.truffle-vscode","usernamehw.errorlens",
    "wix.vscode-import-cost","yzhang.markdown-all-in-one","zainchen.json"
) | ForEach-Object { code-insiders --install-extension $_ --force }
```
