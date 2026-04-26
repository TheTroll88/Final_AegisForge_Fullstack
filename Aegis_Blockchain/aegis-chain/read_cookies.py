import sqlite3
import os

cookie_path = os.path.expanduser(r'~\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Cookies')
try:
    conn = sqlite3.connect(f'file:{cookie_path}?mode=ro', uri=True, timeout=3)
    c = conn.cursor()
    c.execute("SELECT host_key, name, length(encrypted_value) as ev_len FROM cookies WHERE host_key LIKE '%github%' OR host_key LIKE '%solana%' LIMIT 30")
    rows = c.fetchall()
    print(f'Success! Found {len(rows)} cookies')
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print(f'Error: {e}')
