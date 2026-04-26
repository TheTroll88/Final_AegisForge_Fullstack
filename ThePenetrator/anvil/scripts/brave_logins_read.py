import os
import sqlite3

db = sqlite3.connect(os.path.join(os.environ["TEMP"], "brave_logins.db"))
c = db.cursor()
c.execute(
    "SELECT origin_url, username_value FROM logins WHERE username_value != '' ORDER BY origin_url"
)
rows = c.fetchall()
for r in rows:
    print(f"{r[0]} | {r[1]}")
print(f"--- {len(rows)} saved logins ---")
db.close()
