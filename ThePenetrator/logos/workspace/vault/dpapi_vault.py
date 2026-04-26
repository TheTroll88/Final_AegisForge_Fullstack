"""DPAPI vault — encrypted secret storage for Logos.

All secrets (API keys, wallet keys, passwords) go in once via store_secret(),
live encrypted on disk, and come out only at runtime via get_secret().
Only Nate's Windows account can decrypt. Nobody else. Nothing in plaintext. Ever.
"""

from __future__ import annotations

import csv
import ctypes
import ctypes.wintypes
import io
import json
import os


# --- Windows DPAPI bindings ---
class DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", ctypes.wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_byte)),
    ]


_crypt32 = ctypes.windll.crypt32
_kernel32 = ctypes.windll.kernel32

VAULT_DIR = os.path.dirname(os.path.abspath(__file__))
_ENTROPY = b"LogosVault_Nate_2026"


def _dpapi_encrypt(plaintext_bytes: bytes) -> bytes:
    """Encrypt bytes using Windows DPAPI CurrentUser scope."""
    blob_in = DATA_BLOB()
    blob_in.cbData = len(plaintext_bytes)
    blob_in.pbData = ctypes.cast(
        ctypes.create_string_buffer(plaintext_bytes, len(plaintext_bytes)),
        ctypes.POINTER(ctypes.c_byte),
    )
    entropy_blob = DATA_BLOB()
    entropy_blob.cbData = len(_ENTROPY)
    entropy_blob.pbData = ctypes.cast(
        ctypes.create_string_buffer(_ENTROPY, len(_ENTROPY)),
        ctypes.POINTER(ctypes.c_byte),
    )
    blob_out = DATA_BLOB()

    ok = _crypt32.CryptProtectData(
        ctypes.byref(blob_in),
        "LogosVault",
        ctypes.byref(entropy_blob),
        None,
        None,
        0,
        ctypes.byref(blob_out),
    )
    if not ok:
        raise OSError(f"DPAPI encrypt failed (error {ctypes.GetLastError()})")

    raw = ctypes.string_at(blob_out.pbData, blob_out.cbData)
    _kernel32.LocalFree(blob_out.pbData)
    return raw


def _dpapi_decrypt(encrypted_bytes: bytes) -> bytes:
    """Decrypt bytes using Windows DPAPI CurrentUser scope."""
    blob_in = DATA_BLOB()
    blob_in.cbData = len(encrypted_bytes)
    blob_in.pbData = ctypes.cast(
        ctypes.create_string_buffer(encrypted_bytes, len(encrypted_bytes)),
        ctypes.POINTER(ctypes.c_byte),
    )
    entropy_blob = DATA_BLOB()
    entropy_blob.cbData = len(_ENTROPY)
    entropy_blob.pbData = ctypes.cast(
        ctypes.create_string_buffer(_ENTROPY, len(_ENTROPY)),
        ctypes.POINTER(ctypes.c_byte),
    )
    blob_out = DATA_BLOB()

    ok = _crypt32.CryptUnprotectData(
        ctypes.byref(blob_in),
        None,
        ctypes.byref(entropy_blob),
        None,
        None,
        0,
        ctypes.byref(blob_out),
    )
    if not ok:
        raise OSError(f"DPAPI decrypt failed (error {ctypes.GetLastError()})")

    raw = ctypes.string_at(blob_out.pbData, blob_out.cbData)
    _kernel32.LocalFree(blob_out.pbData)
    return raw


# ============================================================
#  Secret key management — one-time store, runtime retrieve
# ============================================================

_KEYRING_FILE = os.path.join(VAULT_DIR, "keyring.vault")


def _load_keyring() -> dict:
    """Load and decrypt the keyring. Returns empty dict if not found."""
    if not os.path.isfile(_KEYRING_FILE):
        return {}
    encrypted = open(_KEYRING_FILE, "rb").read()
    if not encrypted:
        return {}
    plaintext = _dpapi_decrypt(encrypted)
    return json.loads(plaintext.decode("utf-8"))


def _save_keyring(keyring: dict):
    """Encrypt and save the keyring to disk."""
    os.makedirs(VAULT_DIR, exist_ok=True)
    plaintext = json.dumps(keyring, indent=2).encode("utf-8")
    encrypted = _dpapi_encrypt(plaintext)
    with open(_KEYRING_FILE, "wb") as f:
        f.write(encrypted)


def store_secret(name: str, value: str):
    """Store a secret in the vault. Overwrites if it exists."""
    keyring = _load_keyring()
    keyring[name] = value
    _save_keyring(keyring)


def get_secret(name: str, default: str = "") -> str:
    """Retrieve a secret from the vault. Returns default if not found."""
    keyring = _load_keyring()
    return keyring.get(name, default)


def delete_secret(name: str) -> bool:
    """Remove a secret from the vault. Returns True if it existed."""
    keyring = _load_keyring()
    if name in keyring:
        del keyring[name]
        _save_keyring(keyring)
        return True
    return False


def list_secrets() -> list[str]:
    """List all secret names in the vault (never values)."""
    return list(_load_keyring().keys())


def has_secret(name: str) -> bool:
    """Check if a secret exists in the vault."""
    return name in _load_keyring()


# ============================================================
#  Password CSV vault (Google Passwords import)
# ============================================================


def read_vault(name: str = "google_passwords") -> list[dict]:
    """Decrypt a vault file and return rows as list of dicts (CSV-style)."""
    vault_path = os.path.join(VAULT_DIR, f"{name}.vault")
    if not os.path.isfile(vault_path):
        raise FileNotFoundError(f"Vault file not found: {vault_path}")

    encrypted = open(vault_path, "rb").read()
    plaintext = _dpapi_decrypt(encrypted)
    text = plaintext.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def search_vault(query: str, name: str = "google_passwords") -> list[dict]:
    """Search vault entries — matches against name/url fields, case-insensitive."""
    q = query.lower()
    rows = read_vault(name)
    return [
        r
        for r in rows
        if q in str(r.get("name", "")).lower() or q in str(r.get("url", "")).lower()
    ]


def list_vault_entries(name: str = "google_passwords") -> list[str]:
    """Return just the site/service names from the vault (no passwords exposed)."""
    rows = read_vault(name)
    return [r.get("name", r.get("url", "unknown")) for r in rows]
