import sqlite3, os

db = sqlite3.connect(r'C:\Users\natha\OneDrive\GitHub\Ollama\db.sqlite')

# Get attachment schema
print('=== ATTACHMENT SCHEMA ===')
for row in db.execute('PRAGMA table_info(attachments)'):
    print(f'  {row}')
print()

# Get ALL messages from Chat 6 - FULL content
print('=== CHAT 6 FULL MESSAGES ===')
chats = [r[0] for r in db.execute('SELECT id FROM chats ORDER BY rowid')]
chat6_id = chats[-1]
print(f'Chat ID: {chat6_id}')
print()
for row in db.execute('SELECT rowid, role, content, model_name, created_at FROM messages WHERE chat_id=? ORDER BY rowid', (chat6_id,)):
    ts = row[4][:19] if row[4] else ''
    model = row[3] or ''
    content = row[2] or '[empty]'
    print(f'--- MSG {row[0]} [{ts}] {row[1].upper()} ({model}) ---')
    print(content[:3000])
    if len(content) > 3000:
        print(f'  ... [{len(content)} total chars]')
    print()

# Now get ALL attachments with full schema
print('=== ALL ATTACHMENTS ===')
cols = [r[1] for r in db.execute('PRAGMA table_info(attachments)')]
print(f'Columns: {cols}')
print()
for row in db.execute('SELECT * FROM attachments ORDER BY rowid'):
    d = dict(zip(cols, row))
    # Print everything except huge content
    for k, v in d.items():
        if k == 'content' or k == 'data':
            val = str(v)[:200] if v else 'NULL'
            print(f'  {k}: {val}...' if v and len(str(v)) > 200 else f'  {k}: {val}')
        else:
            print(f'  {k}: {v}')
    print()

# Search ALL messages for 7333
print('=== SEARCH ALL MESSAGES FOR "7333" ===')
for row in db.execute('SELECT rowid, role, content, model_name FROM messages WHERE content LIKE ?', ('%7333%',)):
    print(f'Row {row[0]} ({row[1]}, {row[3]}):')
    content = row[2] or ''
    # Find context around 7333
    idx = content.find('7333')
    if idx >= 0:
        start = max(0, idx - 100)
        end = min(len(content), idx + 100)
        print(f'  ...{content[start:end]}...')
    print()

# Search for "app" in Chat 6 specifically
print('=== SEARCH CHAT 6 FOR "app" or "server" or "launch" ===')
for row in db.execute("SELECT rowid, role, content FROM messages WHERE chat_id=? AND (content LIKE '%app%' OR content LIKE '%server%' OR content LIKE '%launch%')", (chat6_id,)):
    content = row[2] or ''
    print(f'Row {row[0]} ({row[1]}): {content[:300]}')
    print()

db.close()
