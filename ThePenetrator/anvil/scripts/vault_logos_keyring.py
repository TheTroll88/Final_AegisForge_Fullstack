"""Vault all Logos keyring secrets into ThePenetrator DPAPI vault."""

import os
import subprocess
import sys
import tempfile

sys.path.insert(
    0,
    os.path.join(
        "C:\\Users\\natha\\OneDrive\\ThePenetrator", "logos", "workspace", "vault"
    ),
)
from dpapi_vault import _load_keyring

VAULT_DIR = "C:\\Users\\natha\\OneDrive\\ThePenetrator\\.vault"
keyring = _load_keyring()
count = 0

for name, value in keyring.items():
    safe_name = "LOGOS_" + name.upper()
    sec_path = os.path.join(VAULT_DIR, safe_name + ".sec")
    if os.path.exists(sec_path):
        print(f"  SKIP (exists): {safe_name}")
        continue

    # Write value to temp file
    tmp_val = os.path.join(tempfile.gettempdir(), "vault_val.txt")
    with open(tmp_val, "w", encoding="utf-8") as f:
        f.write(value)

    # Write PS1 script
    tmp_ps1 = os.path.join(tempfile.gettempdir(), "vault_seal.ps1")
    with open(tmp_ps1, "w", encoding="utf-8") as f:
        f.write(f'$raw = Get-Content -Path "{tmp_val}" -Raw\n')
        f.write(f"$ss = ConvertTo-SecureString $raw.Trim() -AsPlainText -Force\n")
        f.write(f'ConvertFrom-SecureString $ss | Set-Content -Path "{sec_path}"\n')

    result = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp_ps1],
        capture_output=True,
        text=True,
    )

    # Cleanup temps
    for tmp in [tmp_val, tmp_ps1]:
        try:
            os.remove(tmp)
        except OSError:
            pass

    if result.returncode == 0 and os.path.exists(sec_path):
        sz = os.path.getsize(sec_path)
        print(f"  VAULTED: {safe_name} ({sz} bytes)")
        count += 1
    else:
        err = (result.stderr or "").strip()[:120]
        print(f"  FAIL: {safe_name} - rc={result.returncode} {err}")

print(f"\n=== {count} new secrets vaulted from Logos keyring ===")
