"""Persistent memory tool — Logos's long-term learning system.

Stores notes, lessons, discoveries, and patterns to ~/.logos/memory/.
Survives across sessions. Logos can remember, recall, and search his own knowledge.
"""

import os
import json
import re
from datetime import datetime, timezone
from logos.tools.base import BaseTool, ToolResult

MEMORY_DIR = os.path.expanduser("~/.logos/memory")


class LearningTool(BaseTool):
    """Persistent memory — remember, recall, search, and list learned knowledge."""
    name = "learning"
    description = "Long-term memory: store/recall/search/list notes that persist across sessions"
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["remember", "recall", "search", "list", "forget"],
                "description": "remember=save, recall=read, search=grep, list=show all, forget=delete"
            },
            "topic": {"type": "string", "description": "Topic/filename (no extension needed)"},
            "content": {"type": "string", "description": "Content to remember (for 'remember' action)"},
            "query": {"type": "string", "description": "Search query (for 'search' action)"},
        },
        "required": ["action"],
    }

    def __init__(self):
        os.makedirs(MEMORY_DIR, exist_ok=True)

    def _topic_path(self, topic: str) -> str:
        # Sanitize: only allow alphanumeric, dash, underscore
        safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', topic.strip())
        return os.path.join(MEMORY_DIR, f"{safe}.md")

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "").lower()

        if action == "remember":
            return self._remember(params)
        elif action == "recall":
            return self._recall(params)
        elif action == "search":
            return self._search(params)
        elif action == "list":
            return self._list()
        elif action == "forget":
            return self._forget(params)
        else:
            return ToolResult(False, f"Unknown action '{action}'. Use: remember, recall, search, list, forget", self.name)

    def _remember(self, params: dict) -> ToolResult:
        topic = params.get("topic", "").strip()
        content = params.get("content", "").strip()
        if not topic:
            return ToolResult(False, "Need a topic name to remember under.", self.name)
        if not content:
            return ToolResult(False, "Need content to remember.", self.name)

        path = self._topic_path(topic)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        # Append to existing or create new
        entry = f"\n\n## [{timestamp}]\n{content}"
        if os.path.exists(path):
            with open(path, "a", encoding="utf-8") as f:
                f.write(entry)
            return ToolResult(True, f"Appended to memory: {topic}", self.name)
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# Memory: {topic}{entry}")
            return ToolResult(True, f"New memory created: {topic}", self.name)

    def _recall(self, params: dict) -> ToolResult:
        topic = params.get("topic", "").strip()
        if not topic:
            return self._list()

        path = self._topic_path(topic)
        if not os.path.exists(path):
            return ToolResult(False, f"No memory found for '{topic}'.", self.name)

        with open(path, encoding="utf-8") as f:
            content = f.read()
        return ToolResult(True, content, self.name)

    def _search(self, params: dict) -> ToolResult:
        query = params.get("query", "").strip().lower()
        if not query:
            return ToolResult(False, "Need a search query.", self.name)

        hits = []
        for fname in os.listdir(MEMORY_DIR):
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(MEMORY_DIR, fname)
            with open(fpath, encoding="utf-8") as f:
                content = f.read()
            if query in content.lower():
                # Find matching lines for context
                for i, line in enumerate(content.split("\n")):
                    if query in line.lower():
                        hits.append(f"[{fname}] L{i+1}: {line.strip()}")

        if not hits:
            return ToolResult(True, f"No memories match '{query}'.", self.name)
        return ToolResult(True, f"Found {len(hits)} matches:\n" + "\n".join(hits[:20]), self.name)

    def _list(self) -> ToolResult:
        files = [f for f in os.listdir(MEMORY_DIR) if f.endswith(".md")]
        if not files:
            return ToolResult(True, "Memory is empty. Use 'remember' to start learning.", self.name)

        entries = []
        for fname in sorted(files):
            fpath = os.path.join(MEMORY_DIR, fname)
            size = os.path.getsize(fpath)
            mtime = datetime.fromtimestamp(os.path.getmtime(fpath)).strftime("%Y-%m-%d %H:%M")
            topic = fname.replace(".md", "")
            entries.append(f"  {topic:30s} {size:>6d}b  {mtime}")

        return ToolResult(True, f"Memory topics ({len(entries)}):\n" + "\n".join(entries), self.name)

    def _forget(self, params: dict) -> ToolResult:
        topic = params.get("topic", "").strip()
        if not topic:
            return ToolResult(False, "Need a topic name to forget.", self.name)

        path = self._topic_path(topic)
        if not os.path.exists(path):
            return ToolResult(False, f"No memory found for '{topic}'.", self.name)

        os.remove(path)
        return ToolResult(True, f"Forgot: {topic}", self.name)
