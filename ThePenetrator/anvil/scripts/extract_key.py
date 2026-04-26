import os
import re
import sqlite3

dbpath = os.path.join(
    os.environ["APPDATA"],
    "Code",
    "User",
    "workspaceStorage",
    "15d509d0abeef3c01c5c29df18d9bf61",
    "state.vscdb",
)
db = sqlite3.connect(f"file:{dbpath}?mode=ro", uri=True)
c = db.cursor()
c.execute("SELECT value FROM ItemTable WHERE key='history.entries'")
val = c.fetchone()[0]
db.close()
keys = set(re.findall(r"sk-proj-[A-Za-z0-9_-]{20,}", val))
for k in keys:
    print(k)
    print(f"LEN={len(k)}")
