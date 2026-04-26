"""Targeted queries against Ollama's SQLite database."""
import sqlite3
import json

DB_PATH = r"C:\Users\natha\OneDrive\GitHub\Ollama\db.sqlite"

def main():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row

    # 1. Tables overview
    print("=== TABLES ===")
    tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    for t in tables:
        name = t["name"]
        count = db.execute(f"SELECT COUNT(*) FROM [{name}]").fetchone()[0]
        print(f"  {name}: {count} rows")

    print("\n=== USERS ===")
    for r in db.execute("SELECT * FROM users"):
        d = dict(r)
        print(json.dumps(d, indent=2, default=str))

    print("\n=== SETTINGS ===")
    for r in db.execute("SELECT * FROM settings"):
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, str) and len(v) > 300:
                d[k] = v[:300] + "...[TRUNCATED]"
        print(json.dumps(d, indent=2, default=str))

    # Get schemas first
    print("\n=== SCHEMAS ===")
    for t in tables:
        name = t["name"]
        cols = db.execute(f"PRAGMA table_info([{name}])").fetchall()
        col_names = [c["name"] for c in cols]
        print(f"  {name}: {col_names}")

    print("\n=== CHATS (summary) ===")
    for r in db.execute("SELECT * FROM chats ORDER BY rowid DESC"):
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, str) and len(v) > 300:
                d[k] = v[:300] + "...[TRUNCATED]"
        print(json.dumps(d, indent=2, default=str))

    print("\n=== MESSAGES (first 500 chars of content each) ===")
    # Get column names for messages
    msg_cols = [c["name"] for c in db.execute("PRAGMA table_info(messages)").fetchall()]
    print(f"  Columns: {msg_cols}")
    
    content_col = "content" if "content" in msg_cols else msg_cols[2] if len(msg_cols) > 2 else None
    role_col = "role" if "role" in msg_cols else None
    
    for r in db.execute(f"SELECT * FROM messages ORDER BY rowid"):
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, str) and len(v) > 500:
                d[k] = v[:500] + "...[TRUNCATED]"
            elif isinstance(v, bytes) and len(v) > 500:
                d[k] = str(v[:500]) + "...[TRUNCATED]"
        print(json.dumps(d, indent=2, default=str))

    print("\n=== TOOL_CALLS ===")
    for r in db.execute("SELECT * FROM tool_calls LIMIT 50"):
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, (str, bytes)) and len(str(v)) > 300:
                d[k] = str(v)[:300] + "...[TRUNCATED]"
        print(json.dumps(d, indent=2, default=str))

    print("\n=== ATTACHMENTS (metadata only) ===")
    att_cols = [c["name"] for c in db.execute("PRAGMA table_info(attachments)").fetchall()]
    print(f"  Columns: {att_cols}")
    if "filename" in att_cols:
        for r in db.execute("SELECT id, message_id, filename, LENGTH(data) as data_size FROM attachments"):
            print(json.dumps(dict(r), indent=2, default=str))
    else:
        for r in db.execute("SELECT *, LENGTH(data) as data_size FROM attachments LIMIT 20"):
            d = dict(r)
            if "data" in d:
                d["data"] = f"[{len(d['data']) if d['data'] else 0} bytes]"
            print(json.dumps(d, indent=2, default=str))

    print("\n=== SQLITE_SEQUENCE ===")
    for r in db.execute("SELECT * FROM sqlite_sequence"):
        print(json.dumps(dict(r), indent=2, default=str))

    db.close()

if __name__ == "__main__":
    main()
