# ============================================================
#  AEGIS AGENT ROUTER — LAUNCH SCRIPT
#  Venice (claude-opus-4-7) behind Aegis-issued keys
#  Run this once. Point all agents at http://localhost:8787
# ============================================================

# --- UPSTREAM: Venice delivers the model -----------------
$env:VENICE_API_KEY  = "VENICE_INFERENCE_KEY_nwySoIIwdf9ibbwZvK0nbyBmpILJ7yawba6Wlwq0oG"

# --- ROUTER AUTH: agents use THIS key as their bearer ----
# Comma-separated keys are supported for rotation windows.
$env:ROUTER_KEYS     = "aegis_1f5ba0bd17dc2da04c4588529e4e72e1d8928fb6eee775eef84daabad4ba3c6a0aa40c3325f43af146d7df879d43f07629d3ea16301bb3e5a176e5d7d0a2a4a4"

# --- PORT -------------------------------------------------
$env:ROUTER_PORT     = "8787"

# --- MODEL LOCK: force claude-opus-4-7 on Venice ---------
# Agents can send any model name — router overrides to this.
$env:FORCE_MODEL     = "claude-opus-4-7"

# --- OLLAMA BRIDGE: point Ollama's cloud calls at this router ----
# In Ollama, set: $env:OLLAMA_CLOUD_BASE_URL = "http://localhost:8787"
# Then Ollama's /v1/messages calls land here → translated → Venice claude-opus-4-7
$env:OLLAMA_CLOUD_BASE_URL = "http://localhost:8787"

# --- TELEGRAM CONTROL PLANE (optional) ----------------------
# If set, router supports /telegram/webhook and /admin/telegram/health-ping.
$env:TELEGRAM_BOT_TOKEN = ""
$env:TELEGRAM_CHAT_ID = ""
$env:TELEGRAM_ADMIN_IDS = ""
$env:TELEGRAM_SIGNING_SECRET = ""

Set-Location $PSScriptRoot
Write-Host ""
Write-Host "  AEGIS ROUTER starting on http://localhost:8787"
Write-Host "  Upstream  : Venice AI"
Write-Host "  Model     : claude-opus-4-7 (Anthropic via Venice)"
Write-Host "  Auth key  : Aegis router key"
Write-Host ""
Write-Host "  Point any agent at:"
Write-Host "    baseURL  = 'http://localhost:8787/v1'"
Write-Host "    apiKey   = (one key from ROUTER_KEYS above)"
Write-Host ""

npx tsx agent_router.ts
