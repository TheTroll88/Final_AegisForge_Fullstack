import json, os
p = os.path.expanduser("~/.logos/sessions/_autosave.json")
d = json.load(open(p, "r", encoding="utf-8"))
msgs = d["messages"]

# Search for agent.py content in autosave
for i, m in enumerate(msgs):
    c = m.get("content", "")
    if "class AgentLoop" in c and "SYSTEM_TEMPLATE" in c:
        print(f"MSG {i} role={m['role']} len={len(c)}")
        start = c.find('"""Agent loop')
        if start >= 0:
            print(c[start:start+8000])
        break
else:
    # Check tool results that read the file
    for i, m in enumerate(msgs):
        c = m.get("content", "")
        if "agent.py" in c and "class AgentLoop" in c:
            print(f"MSG {i} role={m['role']} len={len(c)}")
            start = c.find("class AgentLoop")
            if start >= 0:
                print(c[max(0, start - 500):start + 8000])
            break
    else:
        print("NOT FOUND - checking all msgs for AgentLoop")
        for i, m in enumerate(msgs):
            c = m.get("content", "")
            if "AgentLoop" in c:
                print(f"MSG {i} role={m['role']} len={len(c)} preview={c[:200]}")
