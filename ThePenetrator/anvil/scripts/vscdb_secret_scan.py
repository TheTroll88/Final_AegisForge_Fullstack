"""Scan VS Code state.vscdb files for exposed secrets in terminal buffers."""

import glob
import os
import re
import sqlite3

VAULT_PATTERNS = [
    (r"sk-proj-[A-Za-z0-9_-]{20,}", "OpenAI project key"),
    (r"sk-or-v1-[a-f0-9]{64}", "OpenRouter key"),
    (r"VENICE_ADMIN_KEY_[A-Za-z0-9_-]{30,}", "Venice admin key"),
    (r"gho_[A-Za-z0-9]{36}", "GitHub OAuth token"),
    (r"ghp_[A-Za-z0-9]{36}", "GitHub PAT"),
    (r"gsk_[A-Za-z0-9]{40,}", "Groq API key"),
    (r"sk-ant-[A-Za-z0-9_-]{40,}", "Anthropic key"),
    (r"xai-[A-Za-z0-9]{40,}", "xAI key"),
    (r"hf_[A-Za-z0-9]{30,}", "HuggingFace token"),
    (r"eyJhbGciOi[A-Za-z0-9_-]{50,}", "JWT token"),
    (r"AKIA[A-Z0-9]{16}", "AWS access key"),
]

ws_storage = os.path.join(os.environ["APPDATA"], "Code", "User", "workspaceStorage")
vscdb_files = sorted(
    glob.glob(os.path.join(ws_storage, "*", "state.vscdb")),
    key=os.path.getsize,
    reverse=True,
)[:10]

findings = []
for dbpath in vscdb_files:
    wsid = os.path.basename(os.path.dirname(dbpath))
    size_mb = os.path.getsize(dbpath) / 1048576
    try:
        db = sqlite3.connect(f"file:{dbpath}?mode=ro", uri=True)
        cursor = db.cursor()
        cursor.execute("SELECT key, value FROM ItemTable WHERE value IS NOT NULL")
        for key, value in cursor.fetchall():
            if not isinstance(value, str):
                continue
            for pattern, label in VAULT_PATTERNS:
                matches = re.findall(pattern, value)
                for m in matches:
                    preview = m[:25] + "..." + m[-8:]
                    findings.append((wsid[:12], label, preview, key[:50]))
        db.close()
    except Exception as e:
        print(f"ERR {wsid[:12]}: {e}")

print(f"Scanned {len(vscdb_files)} databases")
if findings:
    print(f"\n=== {len(findings)} EXPOSED SECRETS FOUND ===")
    seen = set()
    for ws, label, preview, loc in findings:
        sig = f"{label}:{preview}"
        if sig not in seen:
            seen.add(sig)
            print(f"  [{label}] {preview}")
            print(f"    in ws:{ws} key:{loc}")
else:
    print("No secrets found in terminal buffers.")
