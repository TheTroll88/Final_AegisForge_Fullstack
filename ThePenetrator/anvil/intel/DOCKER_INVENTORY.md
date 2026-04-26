# Docker Infrastructure Inventory
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** Docker Desktop v4.67.0 (build 222858), WSL2 backend
**Classification:** SENSITIVE — contains credential references and infrastructure topology

---

## 1. Docker Desktop Metadata

| Field | Value |
|-------|-------|
| Version | 4.67.0 |
| Build | 222858 |
| Channel | stable |
| Engine | com.docker.service (LocalSystem) |
| Backend | WSL2 |
| Service Binary | `C:\Program Files\Docker\Docker\com.docker.service` |
| CLI Binary | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` |
| Data Root | WSL2 (`\\wsl$\docker-desktop-data\`) |

---

## 2. Containers (7 total)

### 2a. ollama
| Field | Value |
|-------|-------|
| Image | `ollama/ollama:latest` |
| Status | **Created** (never started) |
| Ports | 11434:11434 (mapped but not active) |
| Restart | no |
| Notes | Container exists but was never started. Host ollama is already running on 11434 (PID 20508, gemma3:4b loaded) |

### 2b. gateway-proxy
| Field | Value |
|-------|-------|
| Image | `alpine/socat:latest` |
| Status | **Up** |
| Command | `socat TCP-LISTEN:62134,fork,reuseaddr TCP:host.docker.internal:62133` |
| Ports | 62134 (container) → host:62133 |
| Network | `tools-net` (only member) |
| Restart | `unless-stopped` |
| Created | 2026-04-11 |
| Logs | Empty (no traffic) |
| **ISSUE** | **Port 62133 is NOT listening on host** — relay target is dead. Container is running but forwarding to nothing. |

### 2c. kind-cloud-provider
| Field | Value |
|-------|-------|
| Image | `docker/desktop-cloud-provider-kind:v0.5.0` |
| Status | **Up** |
| Restart | always |
| Notes | Kubernetes cloud provider for Docker Desktop Kind cluster |

### 2d. kind-registry-mirror
| Field | Value |
|-------|-------|
| Image | `docker/desktop-containerd-registry-mirror:v0.0.3` |
| Status | **Up (healthy)** |
| Restart | always |
| Notes | Registry mirror for Kind cluster image pulls |

### 2e. desktop-control-plane
| Field | Value |
|-------|-------|
| Image | `kindest/node:v1.34.3` |
| Status | **Up** |
| Ports | `127.0.0.1:54465` → 6443 (Kubernetes API) |
| K8s Version | v1.34.3 |
| Restart | on-failure |
| Notes | Single-node Kind cluster. Hosts kube-system pods (coredns, etcd, kindnet, kube-proxy, kube-scheduler, controller-manager, local-path-provisioner) |

### 2f. welcome-to-docker
| Field | Value |
|-------|-------|
| Image | `docker/welcome-to-docker:latest` |
| Status | **Exited** (5 days ago as of 2026-04-12) |
| Restart | no |
| Notes | Docker onboarding demo container. Safe to remove if desired. |

### 2g. presearch-node
| Field | Value |
|-------|-------|
| Image | `presearch/node:latest` |
| Status | **Restarting** (crash loop) |
| Restart | unless-stopped |
| Env | `REGISTRATION_CODE=5d100407b32d57f4902d74fad850ea64` (**VAULTED** → `PRESEARCH_REGISTRATION_CODE.sec`) |
| **ISSUE** | Version too old: running v1.2.53, server requires v1.4.4-testnet minimum. Endless restart loop with "Please update your node" error. |
| **FIX** | `docker pull presearch/node:latest` then `docker restart presearch-node` — OR stop if Presearch is abandoned. |

---

## 3. Images (29 total)

| # | Repository | Tag | Image ID | Size | Notes |
|---|-----------|-----|----------|------|-------|
| 1 | `alpine/socat` | latest | — | ~10 MB | Used by gateway-proxy |
| 2 | `ollama/ollama` | latest | — | 9.89 GB | Ollama server image (never started as container) |
| 3 | `mcp/playwright` | latest | — | ~1.5 GB | MCP Playwright browser automation (2 tags) |
| 4 | `mcp/playwright` | (second tag) | — | ~1.5 GB | Duplicate/older tag |
| 5 | `jesulonimii/portless-extension` | 1.0.0 | — | ~200 MB | Docker Desktop Portless extension |
| 6 | `solscope` | latest | `9e1dead2815e` | 2.3 GB | **ElizaOS SolScope agent** — Nosana bounty build |
| 7 | `thetroll888/solscope` | latest | `9e1dead2815e` | 2.3 GB | Same image, Docker Hub tag |
| 8 | `ghcr.io/thetroll88/solscope` | latest | `9e1dead2815e` | 2.3 GB | Same image, GHCR tag |
| 9 | `thetroll888/solscope` | (older build) | `03a4f081410a` | 2.3 GB | Older SolScope build |
| 10 | `node` | 24-slim | — | ~200 MB | Node.js 24 slim base |
| 11 | `egekocabas/mailhog` | 1.0.0 | — | ~50 MB | MailHog Docker extension |
| 12 | `welcome-to-docker` | latest | — | ~20 MB | Docker onboarding (local tag) |
| 13 | `herbhall/runbooks` | 0.2.4 | — | ~100 MB | Docker Desktop runbooks extension |
| 14 | `mcp/fetch` | latest | — | ~50 MB | MCP fetch server |
| 15 | `ubuntu` | 22.04 | — | ~77 MB | Ubuntu base image |
| 16 | `alpine` | latest | — | ~7 MB | Alpine base image |
| 17 | `aluedeke/mobile-docker-extension` | 0.5.0 | — | ~100 MB | Mobile Docker extension |
| 18 | `kindest/node` | v1.34.3 | — | ~1 GB | Kind K8s node (in use by desktop-control-plane) |
| 19 | `docker/desktop-cloud-provider-kind` | v0.5.0 | — | ~50 MB | Kind cloud provider |
| 20 | `envoyproxy/envoy` | v1.36.4 | — | ~150 MB | Envoy proxy |
| 21 | `docker/desktop-containerd-registry-mirror` | v0.0.3 | — | ~30 MB | Registry mirror |
| 22 | `mochoa/coder-docker-extension` | 4.106.2-39 | — | ~200 MB | Coder Docker extension |
| 23 | `codercom/code-server` | 4.106.2-39 | — | 1.04 GB | VS Code Web (code-server) |
| 24 | `presearch/node` | latest | — | ~500 MB | Presearch node (crash-looping) |
| 25 | `docker/welcome-to-docker` | latest | — | ~20 MB | Docker onboarding (hub tag) |
| 26 | `mcp/memory` | latest | — | ~50 MB | MCP memory server |
| 27 | `flomesh/pipy-repo` | latest | — | ~30 MB | Pipy service mesh repo |
| 28 | `curlimages/curl` | 8.10.1 | — | ~15 MB | Curl utility image |
| 29 | `flomesh/pipy-docker-ext` | 0.90.0-124 | — | ~50 MB | Pipy Docker extension |
| 30 | `uffizzi/docker-desktop-extension` | 0.2.1 | — | ~100 MB | Uffizzi extension |

---

## 4. Networks (11 total)

| # | Name | Driver | Scope | Members | Notes |
|---|------|--------|-------|---------|-------|
| 1 | `bridge` | bridge | local | Default containers | Default Docker bridge |
| 2 | `host` | host | local | — | Host networking |
| 3 | `none` | null | local | — | No networking |
| 4 | `kind` | bridge | local | desktop-control-plane, kind-cloud-provider, kind-registry-mirror | Kind cluster network |
| 5 | `tools-net` | bridge | local | gateway-proxy (ONLY member) | Custom network for relay tools |
| 6-11 | Extension networks | bridge | local | Various Docker Desktop extensions | mailhog, pipy, portless, coder, mobile, uffizzi |

---

## 5. Volumes (8 total)

| # | Name | Driver | Mountpoint | Contents | Notes |
|---|------|--------|------------|----------|-------|
| 1 | (anonymous 1) | local | — | Kind cluster data + etcd WAL | Used by desktop-control-plane |
| 2 | (anonymous 2) | local | — | Kind cluster logs | Used by desktop-control-plane |
| 3 | `claude-memory` | local | — | `index.js` only (MCP memory server) | **No data written** — server never received memory writes |
| 4 | `ollama` | local | — | **Empty** | Container never started, no models pulled into Docker |
| 5 | `mailhog` | local | — | MailHog data | Docker extension state |
| 6 | `pipy_data` | local | — | Pipy config | Service mesh state |
| 7 | `portless-state` | local | — | Portless HTTPS proxy state | Extension state |
| 8 | `coder_data` | local | — | VS Code Server data | code-server workspace state |

---

## 6. Docker Credentials

| # | Credential | Store | User | Status | Vault File |
|---|-----------|-------|------|--------|-----------|
| 1 | Docker Hub PAT | `docker-credential-desktop` | `thetroll888` | **VAULTED** | `DOCKER_HUB_PAT.sec` |
| 2 | GHCR OAuth Token | `docker-credential-desktop` | `TheTroll88` | **VAULTED** | `GHCR_OAUTH_TOKEN.sec` |
| 3 | Token seed | `.docker/.token_seed` | — | In config | `RjwsB7jz...BcA==` (base64) |
| 4 | Presearch Registration Code | Container env var | — | **VAULTED** | `PRESEARCH_REGISTRATION_CODE.sec` |

---

## 7. Docker Config Files

| File | Location | Contents |
|------|----------|----------|
| `config.json` | `~/.docker/config.json` | credsStore: "desktop", auth entries for docker.io + ghcr.io |
| `daemon.json` | Docker Desktop settings | WSL2 backend config |
| `mcp/config.json` | `~/.docker/mcp/` | MCP catalog (fetch, memory, playwright servers) |
| `.token_seed` | `~/.docker/.token_seed` | Registry auth seed (base64) |

---

## 8. Docker Desktop Extensions Installed

| Extension | Image | Purpose |
|-----------|-------|---------|
| Portless | `jesulonimii/portless-extension:1.0.0` | HTTPS proxy without ports |
| MailHog | `egekocabas/mailhog:1.0.0` | Email testing |
| Runbooks | `herbhall/runbooks:0.2.4` | Operational runbooks |
| Mobile | `aluedeke/mobile-docker-extension:0.5.0` | Mobile dev tools |
| Coder | `mochoa/coder-docker-extension:4.106.2-39` | VS Code Web in Docker |
| Pipy | `flomesh/pipy-docker-ext:0.90.0-124` | Service mesh |
| Uffizzi | `uffizzi/docker-desktop-extension:0.2.1` | Environments |

---

## 9. Known Issues

| Issue | Severity | Details | Recommended Fix |
|-------|----------|---------|----------------|
| gateway-proxy dead target | **Medium** | Port 62133 not listening on host. Relay forwards to nothing. | Investigate what should listen on 62133, or stop container |
| presearch-node crash loop | **Low** | Version v1.2.53 too old (needs v1.4.4-testnet) | `docker pull presearch/node:latest` + restart, or stop if abandoned |
| ollama container never started | **Info** | Container created but host ollama is already serving on 11434 | Remove container if unneeded (host service is preferred) |
| claude-memory empty | **Info** | MCP memory volume has server code but no data | Expected if memory MCP was never used |

---

*Cross-reference: MASTER_CREDENTIAL_INVENTORY.md Section 6 (Docker / Container Credentials)*
*Cross-reference: K8S_CLUSTER.md for Kubernetes findings*
*Cross-reference: ELIZAOS_SOLSCOPE.md for SolScope image deep-dive*
