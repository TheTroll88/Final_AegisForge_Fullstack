import json
with open(r'C:\Users\natha\.logos\sessions\_autosave.json', encoding='utf-8') as f:
    data = json.load(f)
msgs = data['messages']
print(f"Total messages: {len(msgs)}")
print("=" * 80)
for i, m in enumerate(msgs):
    role = m['role']
    content = m['content'][:1500]
    print(f"--- MSG {i} [{role}] ---")
    print(content)
    print()
