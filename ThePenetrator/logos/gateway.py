"""Logos Gateway — local API server with our own key.

Accepts requests authenticated with our custom key (lgk_*),
routes to available backends. No vendor restrictions.

Backend cascade:
  1. Venice AI (GLM heretic + all models) — when credits available
  2. Alchemy RPC for on-chain operations
  3. Free decentralized inference fallback

Usage:
  python -m logos.llm.gateway          # starts on port 11435
  python -m logos.llm.gateway --port 8800
"""

from __future__ import annotations

import json
import os
import sys
import time
import secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from typing import Generator

# Add project root to path
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)

import requests as http_requests

DEFAULT_PORT = 11435

# ─── Key Management ──────────────────────────────────────────────────

def _load_gateway_key() -> str:
    """Load our custom key from DPAPI vault."""
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("logos_gateway_key")
        if key:
            return key
    except Exception:
        pass
    # Fallback to env
    return os.environ.get("LOGOS_GATEWAY_KEY", "")


def _load_venice_key() -> str:
    """Load Venice API key from vault for upstream routing."""
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("venice_api_key")
        if key:
            return key
    except Exception:
        pass
    return os.environ.get("VENICE_API_KEY", "")


def _load_openai_key() -> str:
    """Load OpenAI API key from vault."""
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("openai_api_key")
        if key:
            return key
    except Exception:
        pass
    return os.environ.get("OPENAI_API_KEY", "")


def _load_groq_key() -> str:
    """Load Groq API key from vault."""
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("groq_api_key")
        if key:
            return key
    except Exception:
        pass
    return os.environ.get("GROQ_API_KEY", "")


def _load_openrouter_key() -> str:
    """Load OpenRouter API key from vault."""
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("openrouter_api_key")
        if key:
            return key
    except Exception:
        pass
    return os.environ.get("OPENROUTER_API_KEY", "")


# ─── Backend Routing ─────────────────────────────────────────────────

BACKENDS = [
    {
        "name": "venice",
        "url": "https://api.venice.ai/api/v1/chat/completions",
        "key_fn": _load_venice_key,
        "models": None,  # all models
    },
    {
        "name": "openai",
        "url": "https://api.openai.com/v1/chat/completions",
        "key_fn": _load_openai_key,
        "models": None,
    },
    {
        "name": "groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key_fn": _load_groq_key,
        "models": None,
    },
    {
        "name": "openrouter",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_fn": _load_openrouter_key,
        "models": None,
    },
]

# Model-to-backend mapping for intelligent routing
_MODEL_BACKEND_MAP = {
    # Venice-native models
    "olafangensan-glm-4.7-flash-heretic": "venice",
    "venice-uncensored": "venice",
    # OpenAI models
    "gpt-4.1": "openai", "gpt-4.1-mini": "openai", "gpt-4.1-nano": "openai",
    "gpt-4o": "openai", "gpt-4o-mini": "openai",
    "gpt-5.4": "openai", "gpt-5.4-mini": "openai", "gpt-5.4-pro": "openai",
    "o3": "openai", "o3-mini": "openai", "o4-mini": "openai",
    # Groq models
    "llama-3.3-70b-versatile": "groq", "llama-3.1-8b-instant": "groq",
    "mixtral-8x7b-32768": "groq", "gemma2-9b-it": "groq",
}


def _route_request(payload: dict, stream: bool = True) -> Generator[str, None, None] | str:
    """Route a chat completion request through available backends.

    Tries preferred backend first (from model map), then cascades through others.
    Yields SSE chunks if streaming, returns full response if not.
    """
    model = payload.get("model", "")
    errors = []

    # Build ordered backend list: preferred first, then rest as fallbacks
    preferred = _MODEL_BACKEND_MAP.get(model)
    if preferred:
        ordered = [b for b in BACKENDS if b["name"] == preferred]
        ordered += [b for b in BACKENDS if b["name"] != preferred]
    else:
        ordered = list(BACKENDS)

    for backend in ordered:
        # Model filter
        if backend["models"] and model not in backend["models"]:
            continue

        api_key = backend["key_fn"]()
        if not api_key:
            errors.append(f"{backend['name']}: no key")
            continue

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            resp = http_requests.post(
                backend["url"],
                headers=headers,
                json=payload,
                stream=stream,
                timeout=180,
            )

            if resp.status_code == 402:
                errors.append(f"{backend['name']}: out of credits (402)")
                continue
            if resp.status_code == 401:
                errors.append(f"{backend['name']}: unauthorized (401)")
                continue
            if resp.status_code >= 400:
                errors.append(f"{backend['name']}: HTTP {resp.status_code}")
                continue

            if stream:
                def gen():
                    for line in resp.iter_lines():
                        if not line:
                            continue
                        decoded = line.decode("utf-8")
                        yield decoded + "\n"
                return gen()
            else:
                return resp.text

        except http_requests.exceptions.ConnectionError:
            errors.append(f"{backend['name']}: connection failed")
        except http_requests.exceptions.Timeout:
            errors.append(f"{backend['name']}: timeout")

    # All backends failed — return error
    error_msg = "; ".join(errors) if errors else "no backends available"
    err_body = {
        "error": {
            "message": f"All backends failed: {error_msg}",
            "type": "gateway_error",
            "code": "backend_unavailable",
        }
    }
    if stream:
        def err_gen():
            yield f"data: {json.dumps(err_body)}\n\n"
            yield "data: [DONE]\n\n"
        return err_gen()
    else:
        return json.dumps(err_body)


# ─── HTTP Handler ────────────────────────────────────────────────────

class GatewayHandler(BaseHTTPRequestHandler):
    """OpenAI-compatible API handler."""

    gateway_key = ""

    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

    def _send_json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _auth_check(self) -> bool:
        """Validate our custom API key."""
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
        else:
            token = auth
        if not token or token != self.gateway_key:
            self._send_json(401, {"error": {"message": "Invalid API key", "type": "auth_error"}})
            return False
        return True

    def do_GET(self):
        if self.path == "/v1/models" or self.path == "/models":
            # Return available models
            models = [
                "olafangensan-glm-4.7-flash-heretic",
                "venice-uncensored",
                "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
                "gpt-4o", "gpt-4o-mini",
                "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-pro",
                "o3", "o3-mini", "o4-mini",
                "llama-3.3-70b-versatile",
                "mixtral-8x7b-32768",
                "hermes-3-llama-3.1-405b",
                "deepseek-v3.2",
            ]
            self._send_json(200, {
                "object": "list",
                "data": [{"id": m, "object": "model", "owned_by": "logos-gateway"} for m in models],
            })
        elif self.path == "/health":
            self._send_json(200, {"status": "ok", "gateway": "logos", "uptime": time.time()})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in ("/v1/chat/completions", "/chat/completions"):
            self._send_json(404, {"error": "not found"})
            return

        if not self._auth_check():
            return

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": {"message": "invalid JSON"}})
            return

        stream = payload.get("stream", False)

        if stream:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            result = _route_request(payload, stream=True)
            for chunk in result:
                self.wfile.write(chunk.encode())
                self.wfile.flush()
        else:
            result = _route_request(payload, stream=False)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(result.encode() if isinstance(result, str) else result)


# ─── Server ──────────────────────────────────────────────────────────

def start_gateway(port: int = DEFAULT_PORT, background: bool = False) -> HTTPServer | None:
    """Start the gateway server.

    If background=True, runs in a daemon thread and returns the server instance.
    If background=False, blocks forever.
    """
    gateway_key = _load_gateway_key()
    if not gateway_key:
        print("[Gateway] ERROR: No gateway key found in vault or env.")
        return None

    GatewayHandler.gateway_key = gateway_key

    server = HTTPServer(("127.0.0.1", port), GatewayHandler)
    print(f"[Gateway] Logos Gateway running on http://127.0.0.1:{port}")
    print(f"[Gateway] Key: {gateway_key[:8]}...{gateway_key[-4:]}")
    print(f"[Gateway] Backends: {', '.join(b['name'] for b in BACKENDS)}")

    if background:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server
    else:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[Gateway] Shutting down.")
            server.shutdown()
        return server


if __name__ == "__main__":
    port = DEFAULT_PORT
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--port" and i + 2 <= len(sys.argv):
            port = int(sys.argv[i + 2])
    start_gateway(port=port)
