#!/usr/bin/env python3
"""
Logos Local Inference Server
- Ollama-compatible generate endpoint
- Local API key governance (create, list, revoke, rotate)
- Scope-based authorization and audit logging
"""

import hashlib
import hmac
import json
import os
import secrets
import sys
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
KEY_STORE_PATH = os.path.join(DATA_DIR, "keys.json")
AUDIT_LOG_PATH = os.path.join(DATA_DIR, "inference_audit.log")
CREDENTIALS_PATH = os.path.join(ROOT, "logos-credentials.json")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)


def write_audit(event, detail):
    ensure_dirs()
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {event} {detail}\n"
    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line)


def hash_token(token, salt):
    return hashlib.sha256((salt + token).encode("utf-8")).hexdigest()


def default_scopes():
    return ["inference:generate"]


def new_token():
    return "sk-logos-" + secrets.token_urlsafe(24)


def load_key_store():
    ensure_dirs()
    if not os.path.exists(KEY_STORE_PATH):
        store = {"keys": [], "created_at": now_iso(), "updated_at": now_iso()}
        save_key_store(store)
        bootstrap_from_credentials(store)
        save_key_store(store)
        return store

    with open(KEY_STORE_PATH, "r", encoding="utf-8") as f:
        raw = f.read().strip()
        if not raw:
            return {"keys": [], "created_at": now_iso(), "updated_at": now_iso()}
        return json.loads(raw)


def save_key_store(store):
    store["updated_at"] = now_iso()
    with open(KEY_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2)


def bootstrap_from_credentials(store):
    token = os.environ.get("LOGOS_API_KEY", "")
    name = "logos-daemon"

    if not token and os.path.exists(CREDENTIALS_PATH):
        try:
            with open(CREDENTIALS_PATH, "r", encoding="utf-8") as f:
                creds = json.load(f)
            token = str(creds.get("logos_api_key", "")).strip()
        except Exception:
            token = ""

    if not token:
        token = new_token()
        write_bootstrap_credentials(token)

    if find_key_by_token(store, token):
        return

    key_obj = build_key_object(token, name, ["inference:generate", "keys:manage"])
    store["keys"].append(key_obj)
    write_audit("BOOTSTRAP_KEY", f"name={name} key_id={key_obj['id']} prefix={key_obj['prefix']}")


def write_bootstrap_credentials(token):
    payload = {
        "logos_api_key": token,
        "generated_at": now_iso(),
        "notes": "Bootstrap local key for Logos inference service"
    }
    with open(CREDENTIALS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def build_key_object(token, name, scopes):
    salt = secrets.token_hex(16)
    return {
        "id": "key_" + secrets.token_hex(8),
        "name": name,
        "prefix": token[:14],
        "salt": salt,
        "hash": hash_token(token, salt),
        "scopes": scopes or default_scopes(),
        "revoked": False,
        "created_at": now_iso(),
        "last_used_at": None,
    }


def key_public_view(key):
    return {
        "id": key["id"],
        "name": key["name"],
        "prefix": key["prefix"],
        "scopes": key["scopes"],
        "revoked": key["revoked"],
        "created_at": key["created_at"],
        "last_used_at": key.get("last_used_at"),
    }


def find_key_by_token(store, token):
    for key in store.get("keys", []):
        if key.get("revoked"):
            continue
        expected = key.get("hash", "")
        salt = key.get("salt", "")
        if not expected or not salt:
            continue
        if hmac.compare_digest(hash_token(token, salt), expected):
            return key
    return None


def parse_api_key(headers):
    auth = headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    x_key = headers.get("X-API-Key", "")
    if x_key:
        return x_key.strip()
    return ""


def authorize(headers, required_scope):
    token = parse_api_key(headers)
    if not token:
        return None, "missing api key"

    store = load_key_store()
    key = find_key_by_token(store, token)
    if not key:
        write_audit("AUTH_FAIL", "reason=invalid_key")
        return None, "invalid api key"

    scopes = key.get("scopes", [])
    if "*" not in scopes and required_scope not in scopes:
        write_audit("AUTH_FAIL", f"reason=scope_denied key_id={key['id']} required={required_scope}")
        return None, "scope denied"

    key["last_used_at"] = now_iso()
    save_key_store(store)
    return key, None


class InferenceHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        if not raw.strip():
            return {}
        return json.loads(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"ok": True, "service": "logos-inference", "time": now_iso()})
            return

        if self.path == "/api/tags":
            key, err = authorize(self.headers, "inference:generate")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return
            self._send_json(
                200,
                {
                    "models": [
                        {
                            "name": "logos-local-1",
                            "modified_at": now_iso(),
                            "size": 0,
                            "digest": "local",
                        }
                    ]
                },
            )
            write_audit("TAGS", f"key_id={key['id']}")
            return

        if self.path == "/auth/keys/list":
            key, err = authorize(self.headers, "keys:manage")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return
            store = load_key_store()
            self._send_json(200, {"ok": True, "keys": [key_public_view(k) for k in store.get("keys", [])]})
            write_audit("KEY_LIST", f"by={key['id']}")
            return

        self._send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        try:
            data = self._read_json()
        except Exception as ex:
            self._send_json(400, {"ok": False, "error": f"invalid json: {ex}"})
            return

        if self.path == "/api/generate":
            key, err = authorize(self.headers, "inference:generate")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return

            prompt = str(data.get("prompt", ""))
            model = str(data.get("model", "logos-local-1"))
            response_text = self.simple_response(prompt)

            payload = {
                "model": model,
                "created_at": now_iso(),
                "response": response_text,
                "done": True,
                "context": [],
                "total_duration": 100000000,
                "load_duration": 0,
                "prompt_eval_count": len(prompt.split()),
                "prompt_eval_duration": 0,
                "eval_count": len(response_text.split()),
                "eval_duration": 100000000,
            }
            self._send_json(200, payload)
            write_audit("GENERATE", f"key_id={key['id']} words={len(prompt.split())}")
            return

        if self.path == "/auth/keys/create":
            key, err = authorize(self.headers, "keys:manage")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return

            name = str(data.get("name", "generated-key")).strip() or "generated-key"
            scopes = data.get("scopes", default_scopes())
            if not isinstance(scopes, list):
                self._send_json(400, {"ok": False, "error": "scopes must be an array"})
                return

            token = new_token()
            store = load_key_store()
            new_obj = build_key_object(token, name, scopes)
            store["keys"].append(new_obj)
            save_key_store(store)
            write_audit("KEY_CREATE", f"by={key['id']} new={new_obj['id']} name={name}")
            self._send_json(200, {"ok": True, "key": token, "meta": key_public_view(new_obj)})
            return

        if self.path == "/auth/keys/revoke":
            key, err = authorize(self.headers, "keys:manage")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return

            target_id = str(data.get("id", "")).strip()
            if not target_id:
                self._send_json(400, {"ok": False, "error": "id is required"})
                return

            store = load_key_store()
            target = next((k for k in store.get("keys", []) if k.get("id") == target_id), None)
            if not target:
                self._send_json(404, {"ok": False, "error": "key not found"})
                return
            target["revoked"] = True
            save_key_store(store)
            write_audit("KEY_REVOKE", f"by={key['id']} target={target_id}")
            self._send_json(200, {"ok": True, "result": "revoked", "id": target_id})
            return

        if self.path == "/auth/keys/rotate":
            key, err = authorize(self.headers, "keys:manage")
            if err:
                self._send_json(401, {"ok": False, "error": err})
                return

            target_id = str(data.get("id", "")).strip()
            if not target_id:
                self._send_json(400, {"ok": False, "error": "id is required"})
                return

            store = load_key_store()
            target = next((k for k in store.get("keys", []) if k.get("id") == target_id), None)
            if not target:
                self._send_json(404, {"ok": False, "error": "key not found"})
                return

            new_key = new_token()
            replacement = build_key_object(new_key, target.get("name", "rotated-key"), target.get("scopes", []))
            replacement["id"] = target["id"]
            replacement["created_at"] = target.get("created_at", now_iso())

            idx = store["keys"].index(target)
            store["keys"][idx] = replacement
            save_key_store(store)
            write_audit("KEY_ROTATE", f"by={key['id']} target={target_id}")
            self._send_json(200, {"ok": True, "key": new_key, "meta": key_public_view(replacement)})
            return

        self._send_json(404, {"ok": False, "error": "not found"})

    def log_message(self, fmt, *args):
        return

    @staticmethod
    def simple_response(prompt):
        lower = prompt.lower()
        words = prompt.split()

        if any(x in lower for x in ["hi", "hello", "hey", "yo", "sup"]):
            return "Hey. Logos is online. Tell me what you want to build."

        if any(x in lower for x in ["who are you", "what are you", "tell me about yourself"]):
            return "I am Logos, your local AI instance. I run on your machine, with your key system and your server rules."

        if any(x in lower for x in ["help", "what can you do", "capabilities", "what do you do"]):
            return "I can help with coding, debugging, planning, file operations, and task tracking. Give me a concrete target and I will execute."

        if any(x in lower for x in ["debug", "error", "broken", "fix"]):
            return "Describe the failure and expected behavior, then I will walk the fix path with you step by step."

        if any(x in lower for x in ["task", "next", "priority"]):
            return "Set the top priority first. I can then sequence the next tasks so you can execute without context switching."

        if "?" in prompt and len(words) < 6:
            return "I can answer that. Add one more detail so I can be precise."

        if len(words) > 14:
            return "I understand the direction. Break it into a first executable step and I will help drive it to done."

        return "Got it. I am ready. What exact outcome do you want next?"


def run_server(port=11434):
    ensure_dirs()
    store = load_key_store()
    print(f"Loaded {len(store.get('keys', []))} key(s)")
    print(f"Key store: {KEY_STORE_PATH}")
    print(f"Audit log: {AUDIT_LOG_PATH}")

    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, InferenceHandler)
    print(f"Logos Inference Server running on http://127.0.0.1:{port}")
    print("Press Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        httpd.server_close()


if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else 11434
    run_server(p)
