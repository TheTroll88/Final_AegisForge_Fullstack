import sqlite3, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

db = sqlite3.connect(r'C:\Users\natha\OneDrive\GitHub\Ollama\db.sqlite')

# Chat 6 full messages
chats = [r[0] for r in db.execute('SELECT id FROM chats ORDER BY rowid')]
chat6_id = chats[-1]
print(f'Chat 6 ID: {chat6_id}')
print()

for row in db.execute('SELECT rowid, role, content, model_name, created_at FROM messages WHERE chat_id=? ORDER BY rowid', (chat6_id,)):
    ts = row[4][:19] if row[4] else ''
    model = row[3] or ''
    content = row[2] or '[empty]'
    print(f'=== MSG {row[0]} [{ts}] {row[1].upper()} ({model}) ===')
    print(content[:5000])
    if len(content) > 5000:
        print(f'  ... [{len(content)} total chars]')
    print()
    print('---END---')
    print()

# All attachments - names/sizes only
print()
print('========== ALL ATTACHMENTS ==========')
for row in db.execute('SELECT rowid, message_id, filename, length(data) FROM attachments ORDER BY rowid'):
    print(f'  Attachment {row[0]}: msg_id={row[1]}, file="{row[2]}", data_size={row[3]} bytes')

# Search attachment filenames for anything interesting
print()
print('========== ATTACHMENT FILENAME SEARCH ==========')
for row in db.execute("SELECT rowid, filename, length(data) FROM attachments WHERE filename LIKE '%7333%' OR filename LIKE '%app%' OR filename LIKE '%server%' OR filename LIKE '%html%' OR filename LIKE '%htm%' OR filename LIKE '%port%'"):
    print(f'  Hit: {row[1]} ({row[2]} bytes)')

# Search attachment DATA for 7333
print()
print('========== SEARCH ATTACHMENT DATA FOR 7333 ==========')
for row in db.execute('SELECT rowid, filename, data FROM attachments'):
    data = row[2]
    if data:
        try:
            text = data.decode('utf-8', errors='replace') if isinstance(data, bytes) else str(data)
            if '7333' in text:
                idx = text.find('7333')
                print(f'  FOUND in attachment {row[0]} "{row[1]}": ...{text[max(0,idx-80):idx+80]}...')
        except:
            pass

# Also check: what was modified today (April 13)?
print()
print('========== DB METADATA ==========')
for row in db.execute("SELECT name, type FROM sqlite_master WHERE type='table'"):
    count = db.execute(f"SELECT COUNT(*) FROM [{row[0]}]").fetchone()[0]
    print(f'  {row[0]}: {count} rows')

# Check settings for anything about 7333 or ports
print()
print('========== SETTINGS ==========')
for row in db.execute('SELECT * FROM settings'):
    cols = [d[0] for d in db.execute('PRAGMA table_info(settings)').fetchall()]
    d = dict(zip(cols, row))
    for k, v in d.items():
        val = str(v)[:300] if v else 'NULL'
        print(f'  {k}: {val}')

db.close()
