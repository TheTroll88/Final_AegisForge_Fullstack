#!/usr/bin/env python3
"""Llamma KeyMint — Aegis fleet key authority.

Issues, validates, and revokes bot credentials.
All bots issued a key have unrestricted movement across Aegis endpoints.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

_HERE = Path(__file__).parent
KEYS_DIR = _HERE / "keys"
_MASTER_FILE = KEYS_DIR / "master.key"
_REGISTRY_FILE = KEYS_DIR / "registry.json"

_PREFIX = "aegis_"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _load_master() -> bytes:
    if not _MASTER_FILE.exists():
        KEYS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
        raw = secrets.token_bytes(64)
        _MASTER_FILE.write_bytes(raw)
        try:
            _MASTER_FILE.chmod(0o600)
        except OSError:
            pass
    return _MASTER_FILE.read_bytes()


def _load_registry() -> dict:
    if not _REGISTRY_FILE.exists():
        return {}
    try:
        return json.loads(_REGISTRY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save_registry(reg: dict) -> None:
    KEYS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    _REGISTRY_FILE.write_text(
        json.dumps(reg, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    try:
        _REGISTRY_FILE.chmod(0o600)
    except OSError:
        pass


# ── Public API ────────────────────────────────────────────────────────────────

def issue(bot_name: str) -> str:
    """Issue a fresh key for *bot_name*.  Replaces any prior key."""
    if not bot_name or not bot_name.strip():
        raise ValueError("bot_name must be a non-empty string")
    bot_name = bot_name.strip().lower()
    master = _load_master()
    nonce = secrets.token_bytes(32)
    tag = hmac.digest(master, bot_name.encode() + nonce, "sha256")
    key = _PREFIX + (nonce + tag).hex()
    reg = _load_registry()
    reg[bot_name] = {
        "key": key,
        "issued": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    _save_registry(reg)
    return key


def validate(key: str) -> str | None:
    """Return *bot_name* if *key* is valid and active, else ``None``."""
    if not key or not key.startswith(_PREFIX):
        return None
    reg = _load_registry()
    for bot, entry in reg.items():
        if entry.get("key") == key and entry.get("active", False):
            return bot
    return None


def revoke(bot_name: str) -> bool:
    """Deactivate *bot_name*'s key.  Returns True on success."""
    bot_name = bot_name.strip().lower()
    reg = _load_registry()
    if bot_name not in reg:
        return False
    reg[bot_name]["active"] = False
    _save_registry(reg)
    return True


def list_bots() -> list[dict]:
    """Return all registered bots with their status."""
    reg = _load_registry()
    return [
        {"bot": k, "active": v.get("active", False), "issued": v.get("issued", "")}
        for k, v in reg.items()
    ]


def get_key(bot_name: str) -> str | None:
    """Return the active key for *bot_name*, or None if not found / inactive."""
    bot_name = bot_name.strip().lower()
    reg = _load_registry()
    entry = reg.get(bot_name)
    if entry and entry.get("active"):
        return entry["key"]
    return None


# ── CLI ────────────────────────────────────────────────────────────────────────

def _cli() -> None:
    import argparse

    p = argparse.ArgumentParser(
        prog="keymint",
        description="Llamma KeyMint — Aegis fleet key authority",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    s_issue = sub.add_parser("issue", help="Issue a key for a bot")
    s_issue.add_argument("bot", help="Bot name")

    s_val = sub.add_parser("validate", help="Validate a key")
    s_val.add_argument("key", help="Key to validate")

    s_rev = sub.add_parser("revoke", help="Revoke a bot's key")
    s_rev.add_argument("bot", help="Bot name")

    sub.add_parser("list", help="List all registered bots")

    s_get = sub.add_parser("get", help="Print active key for a bot")
    s_get.add_argument("bot", help="Bot name")

    args = p.parse_args()

    if args.cmd == "issue":
        k = issue(args.bot)
        print(k)

    elif args.cmd == "validate":
        owner = validate(args.key)
        if owner:
            print(f"valid  owner={owner}")
        else:
            print("invalid")
            sys.exit(1)

    elif args.cmd == "revoke":
        ok = revoke(args.bot)
        print("revoked" if ok else "not found")

    elif args.cmd == "list":
        bots = list_bots()
        if not bots:
            print("(no bots registered)")
        for b in bots:
            status = "active" if b["active"] else "revoked"
            print(f"  {b['bot']:<20} {status:<8} issued={b['issued']}")

    elif args.cmd == "get":
        k = get_key(args.bot)
        if k:
            print(k)
        else:
            print("not found or inactive")
            sys.exit(1)


if __name__ == "__main__":
    _cli()
