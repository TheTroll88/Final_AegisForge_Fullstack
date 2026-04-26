"""Ollama SQLite database cracker — dumps all tables with schema + data."""
import sqlite3
import json
import sys
import os

DB_PATH = r"C:\Users\natha\OneDrive\GitHub\Ollama\db.sqlite"

def dump_db(db_path):
    if not os.path.exists(db_path):
        print(f"ERROR: {db_path} not found")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]

    print(f"=== DATABASE: {db_path} ===")
    print(f"Tables: {len(tables)}\n")

    for table in tables:
        cur.execute(f"PRAGMA table_info([{table}])")
        cols = cur.fetchall()
        col_names = [c[1] for c in cols]
        col_types = [f"{c[1]} ({c[2]})" for c in cols]

        cur.execute(f"SELECT count(*) FROM [{table}]")
        count = cur.fetchone()[0]

        print(f"{'='*60}")
        print(f"TABLE: {table}  ({count} rows)")
        print(f"COLUMNS: {', '.join(col_types)}")
        print(f"{'='*60}")

        if count == 0:
            print("  (empty)\n")
            continue

        # Limit large tables
        limit = 50 if count > 50 else count
        cur.execute(f"SELECT * FROM [{table}] LIMIT {limit}")
        rows = cur.fetchall()

        for i, row in enumerate(rows):
            print(f"\n--- Row {i+1} ---")
            for col_name in col_names:
                val = row[col_name]
                if isinstance(val, str) and len(val) > 2000:
                    val = val[:2000] + f"... [TRUNCATED, total {len(row[col_name])} chars]"
                print(f"  {col_name}: {val}")

        if count > limit:
            print(f"\n  ... ({count - limit} more rows not shown)")
        print()

    conn.close()

if __name__ == "__main__":
    dump_db(DB_PATH)
