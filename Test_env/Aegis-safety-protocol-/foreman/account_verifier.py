"""
Account and wallet verification pipeline for Foreman.

What this does:
- Verifies expected wallet addresses from provided secrets
- Verifies web session readiness from Playwright storage_state files
- Writes a signed audit report to reports/
- Optionally stores the report in KeePassXC via keepassxc-cli

This module is intentionally explicit and auditable.
No secrets are logged in plaintext.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from eth_account import Account
from solders.keypair import Keypair

ROOT = Path(__file__).parent
REPORTS_DIR = ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


@dataclass
class AuditResult:
    ok: bool
    kind: str
    name: str
    expected: str
    observed: str
    details: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "kind": self.kind,
            "name": self.name,
            "expected": self.expected,
            "observed": self.observed,
            "details": self.details,
        }


def _norm_addr(value: str) -> str:
    return (value or "").strip().lower()


def _safe_obs(value: str) -> str:
    if not value:
        return ""
    value = value.strip()
    if len(value) <= 12:
        return value
    return f"{value[:8]}...{value[-4:]}"


def _load_inventory(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"account inventory not found: {p}")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _evm_from_private_key(private_key: str) -> str:
    acct = Account.from_key(private_key)
    return acct.address


def _evm_from_mnemonic(mnemonic: str, account_index: int = 0) -> str:
    Account.enable_unaudited_hdwallet_features()
    path = f"m/44'/60'/0'/0/{account_index}"
    acct = Account.from_mnemonic(mnemonic, account_path=path)
    return acct.address


def _solana_from_secret(secret_value: str) -> str:
    raw = secret_value.strip()
    if raw.startswith("[") and raw.endswith("]"):
        data = json.loads(raw)
        kp = Keypair.from_bytes(bytes(data))
        return str(kp.pubkey())

    # Assume base58-encoded secret bytes
    kp = Keypair.from_base58_string(raw)
    return str(kp.pubkey())


def _verify_wallet(item: dict[str, Any]) -> AuditResult:
    kind = item.get("kind", "")
    name = item.get("name", "wallet")
    expected = item.get("expected_address", "")

    required = bool(item.get("required", True))
    secret = item.get("secret", "")
    if not secret and item.get("secret_env"):
        import os

        secret = os.environ.get(item["secret_env"], "")

    if not secret:
        details = "missing secret"
        if not required:
            return AuditResult(True, kind, name, expected, "", f"optional item skipped: {details}")
        return AuditResult(False, kind, name, expected, "", details)

    observed = ""
    details = ""

    try:
        if kind == "evm_wallet":
            secret_type = item.get("secret_type", "private_key")
            if secret_type == "mnemonic":
                observed = _evm_from_mnemonic(secret, int(item.get("account_index", 0)))
            else:
                observed = _evm_from_private_key(secret)

        elif kind == "solana_wallet":
            observed = _solana_from_secret(secret)
        else:
            return AuditResult(False, kind, name, expected, "", "unsupported wallet kind")

        ok = _norm_addr(observed) == _norm_addr(expected)
        details = "wallet mapping verified" if ok else "derived address does not match expected"
        return AuditResult(ok, kind, name, expected, _safe_obs(observed), details)

    except Exception as e:
        return AuditResult(False, kind, name, expected, "", f"verification error: {e}")


def _verify_web_session(item: dict[str, Any]) -> AuditResult:
    name = item.get("name", "account")
    expected = item.get("site", "")
    required = bool(item.get("required", True))
    session_file = Path(item.get("session_file", ""))

    if not session_file.is_absolute():
        session_file = ROOT / session_file

    if not session_file.exists():
        if not required:
            return AuditResult(True, "web_session", name, expected, "missing", "optional session not found")
        return AuditResult(False, "web_session", name, expected, "missing", "session file not found")

    # Lightweight local validation: ensure cookies/localStorage exist in storage state.
    try:
        with open(session_file, encoding="utf-8") as f:
            state = json.load(f)

        cookies = state.get("cookies", [])
        origins = state.get("origins", [])
        cookie_count = len(cookies)
        origin_count = len(origins)

        ok = cookie_count > 0 or origin_count > 0
        details = f"storage_state present (cookies={cookie_count}, origins={origin_count})"
        return AuditResult(ok, "web_session", name, expected, "present", details)
    except Exception as e:
        return AuditResult(False, "web_session", name, expected, "invalid", f"session parse error: {e}")


def _maybe_store_keepass(report: dict[str, Any], keepass_cfg: dict[str, Any]) -> dict[str, Any]:
    if not keepass_cfg.get("enabled", False):
        return {"attempted": False, "ok": False, "details": "disabled"}

    cli = shutil.which("keepassxc-cli")
    if not cli:
        return {"attempted": True, "ok": False, "details": "keepassxc-cli not found"}

    db_path = keepass_cfg.get("database", "")
    password_env = keepass_cfg.get("password_env", "KEEPASS_MASTER_PASSWORD")
    group = keepass_cfg.get("group", "Foreman/Account Audit")
    store_mode = keepass_cfg.get("store_mode", "metadata")

    import os

    master = os.environ.get(password_env, "")
    if not master:
        return {"attempted": True, "ok": False, "details": f"missing env var {password_env}"}

    ts = report.get("timestamp_utc", datetime.now(timezone.utc).isoformat())
    title = f"{group}/Audit {ts}"

    if store_mode == "full":
        notes = json.dumps(report, indent=2)
    else:
        notes = json.dumps(
            {
                "timestamp_utc": report.get("timestamp_utc"),
                "summary": report.get("summary"),
                "report_file": report.get("report_file"),
            },
            indent=2,
        )

    cmd = [
        cli,
        "add",
        "-q",
        "-u",
        "foreman",
        "--url",
        "foreman://account-audit",
        "--notes",
        notes,
        "--password-prompt",
        db_path,
        title,
    ]

    proc = subprocess.run(cmd, input=f"{master}\n", text=True, capture_output=True)
    if proc.returncode == 0:
        return {"attempted": True, "ok": True, "details": "entry saved"}

    return {
        "attempted": True,
        "ok": False,
        "details": f"keepassxc-cli failed: {proc.stderr.strip() or proc.stdout.strip()}",
    }


def run_account_audit(inventory_path: str | Path, keepass_cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    data = _load_inventory(inventory_path)
    items = data.get("items", [])

    results: list[AuditResult] = []
    for item in items:
        kind = item.get("kind", "")
        if kind in {"evm_wallet", "solana_wallet"}:
            results.append(_verify_wallet(item))
        elif kind == "web_session":
            results.append(_verify_web_session(item))
        else:
            results.append(
                AuditResult(False, kind or "unknown", item.get("name", "unknown"), "", "", "unsupported item kind")
            )

    ok_count = sum(1 for r in results if r.ok)
    fail_count = len(results) - ok_count

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    digest = hashlib.sha256(json.dumps([r.to_dict() for r in results], sort_keys=True).encode("utf-8")).hexdigest()

    report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "inventory_file": str(inventory_path),
        "summary": {
            "total": len(results),
            "ok": ok_count,
            "failed": fail_count,
            "integrity_sha256": digest,
        },
        "results": [r.to_dict() for r in results],
    }

    report_path = REPORTS_DIR / f"account_audit_{ts}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    report["report_file"] = str(report_path)

    keepass_status = _maybe_store_keepass(report, keepass_cfg or {})
    report["keepass"] = keepass_status

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report
