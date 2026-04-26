# Active Port Map & Service Endpoints
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** `Get-NetTCPConnection`, `Get-Process`, HTTP probes, Docker inspect
**Classification:** OPERATIONAL — infrastructure topology

---

## 1. Active Listeners (Host)

| Port | Protocol | PID | Process | Service | Bind | Status | Notes |
|------|----------|-----|---------|---------|------|--------|-------|
| 4096 | TCP | 5960 | kilo | Kilo (Bun-based tool) | 0.0.0.0 | **Listening** | Not HTTP-probed yet. Config at `~/.config/kilo/` |
| 5432 | TCP | 6004 | postgres | PostgreSQL | 0.0.0.0 | **Listening** | Not probed yet. Likely from Kind cluster or Docker. |
| 8828 | TCP | 23088 | Code | VS Code DevTools | 127.0.0.1 | **Listening** | VS Code internal (debug/extension) |
| 8829 | TCP | 18872 | Code | VS Code DevTools | 127.0.0.1 | **Listening** | VS Code internal (debug/extension) |
| 9100 | TCP | 13756 | cliproxy | Antigravity CLI Proxy | 0.0.0.0 | **Listening** | Routes to 8317. TLS off. Config at `~/.gemini/antigravity/bin/config.yaml` |
| 11434 | TCP | 20508 | ollama | Ollama LLM server | 0.0.0.0 | **Listening + Verified** | HTTP probed: gemma3:4b loaded (4.3B params, Q4_K_M). API confirmed. |
| 18789 | TCP | 20688 | node | Node.js service | 0.0.0.0 | **Listening** | Not probed yet. Unknown purpose. |
| 54465 | TCP | — | docker | K8s API (Kind) | 127.0.0.1 | **Listening** | Kubernetes API server via Kind. Maps to container port 6443. |
| 62134 | TCP | 18396/13852 | docker | gateway-proxy (socat) | 0.0.0.0 | **Listening (DEAD TARGET)** | Relays to host:62133 which is NOT listening. |

---

## 2. Docker-Forwarded Ports

| Host Port | Container Port | Container | Protocol | Status |
|-----------|---------------|-----------|----------|--------|
| 54465 | 6443 | desktop-control-plane | TCP (HTTPS) | Active — K8s API |
| 62134 | 62134 | gateway-proxy | TCP | Active — but target 62133 is dead |
| 11434 | 11434 | ollama (container) | TCP | **NOT active** — container never started, host ollama owns this port |

---

## 3. VS Code Forwarded Ports (from session context)

| Port | Label | Origin | Notes |
|------|-------|--------|-------|
| 1355 | — | Docker WSL | Portless HTTPS proxy |
| 8317 | — | Docker WSL | Antigravity/cliproxy target |
| 18789 | — | Docker WSL | Node.js service |

---

## 4. Known Docker WSL Internal Services

These run inside Docker Desktop WSL2 and may or may not be accessible from the host:

| Service | Port | Notes |
|---------|------|-------|
| code-server | 8080 | VS Code Web — no-auth configured. Image: `codercom/code-server:4.106.2-39` |
| Portless HTTPS proxy | 1355 | Forwarded via VS Code |
| Pipy service mesh | Various | `flomesh/pipy-repo` — mesh routing |
| PostgreSQL | 5432 | Via Kind cluster or standalone |
| Kilo | 4096 | Bun-based, `~/.config/kilo/` |

---

## 5. Endpoints NOT Yet Probed

| Port | Service | Probe Plan |
|------|---------|-----------|
| 4096 | Kilo | HTTP GET / — check if web interface or API |
| 5432 | PostgreSQL | `psql` connection test — check databases, auth |
| 9100 | Antigravity/cliproxy | HTTP GET / — check proxy routes |
| 18789 | Node.js | HTTP GET / — identify the service |
| 62133 | (should be target) | Not listening — investigate what was supposed to bind here |

---

## 6. Port Conflict Notes

| Issue | Details |
|-------|---------|
| Ollama dual-bind | Host ollama (PID 20508) owns port 11434. Docker container `ollama` maps the same port but was never started. No actual conflict — but container should be removed or the port mapping changed if both are ever needed. |
| gateway-proxy dead relay | Container forwards 62134→62133 but nothing on 62133. Either the intended service was stopped/never started, or the relay config is stale. |

---

*Cross-reference: DOCKER_INVENTORY.md Section 2 (Containers)*
*Cross-reference: K8S_CLUSTER.md for port 54465 K8s API details*
