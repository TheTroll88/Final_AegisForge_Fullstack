import sqlite3, sys

DB = r"C:\Users\natha\OneDrive\GitHub\Ollama\db.sqlite"
SEARCH_TERMS = ["7333", "733", "333", "port", "bridge", "tunnel", "app"]

conn = sqlite3.connect(DB)
c = conn.cursor()

# Get all tables and columns
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]

for term in SEARCH_TERMS:
    print(f"\n{'='*60}")
    print(f"SEARCHING FOR: '{term}'")
    print(f"{'='*60}")
    found = 0
    for t in tables:
        c.execute(f"PRAGMA table_info({t})")
        cols = [(r[1], r[2]) for r in c.fetchall()]
        for col_name, col_type in cols:
            try:
                c.execute(f"SELECT rowid, substr(CAST({col_name} AS TEXT),1,300) FROM {t} WHERE CAST({col_name} AS TEXT) LIKE ?", (f"%{term}%",))
                rows = c.fetchall()
                if rows:
                    for r in rows:
                        found += 1
                        preview = str(r[1])[:200]
                        print(f"  [{t}.{col_name}] rowid={r[0]}: {preview}")
            except Exception as e:
                pass
    if found == 0:
        print("  (no results)")

# Also search attachment data (BLOB)
print(f"\n{'='*60}")
print("SEARCHING ATTACHMENT DATA (BLOB) FOR '7333'")
print(f"{'='*60}")
c.execute("SELECT id, msg_id, name, length(data) FROM attachments")
for row in c.fetchall():
    att_id, msg_id, name, size = row
    c.execute("SELECT data FROM attachments WHERE id=?", (att_id,))
    data = c.fetchone()[0]
    if data:
        # Try as text
        try:
            text = data.decode('utf-8', errors='replace')
            for term in ["7333", "port 7", "port=7", ":7333"]:
                if term.lower() in text.lower():
                    idx = text.lower().index(term.lower())
                    snippet = text[max(0,idx-50):idx+50]
                    print(f"  att_id={att_id} msg_id={msg_id} name={name}: ...{snippet}...")
        except:
            pass
        # Try as raw bytes 
        hex_data = data.hex()
        if "7333" in hex_data:
            idx = hex_data.index("7333")
            print(f"  att_id={att_id} msg_id={msg_id} name={name}: HEX MATCH at offset {idx//2}, context: {hex_data[max(0,idx-20):idx+20]}")

print("\n--- DONE ---")
