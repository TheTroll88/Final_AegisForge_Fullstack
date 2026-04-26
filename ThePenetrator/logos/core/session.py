"""Session management — save/restore conversations."""

from __future__ import annotations

import json
import os
from datetime import datetime


class Session:
    """Manages conversation history and persistence."""

    def __init__(
        self,
        history_dir: str = "~/.logos/sessions",
        max_messages: int = 200,
        max_context_tokens: int = 0,
    ):
        self.history_dir = os.path.expanduser(history_dir)
        self.max_messages = max_messages
        self.max_context_tokens = max_context_tokens  # 0 = no limit
        self.messages: list[dict] = []
        self.system_prompt: str = ""

    def set_system(self, prompt: str):
        self.system_prompt = prompt
        # Ensure system message is first
        if self.messages and self.messages[0].get("role") == "system":
            self.messages[0]["content"] = prompt
        else:
            self.messages.insert(0, {"role": "system", "content": prompt})

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        # Trim if over limit (keep system message)
        while len(self.messages) > self.max_messages + 1:
            # Remove the oldest non-system message
            for i, m in enumerate(self.messages):
                if m["role"] != "system":
                    self.messages.pop(i)
                    break
        # Auto-save after every assistant response
        if role == "assistant":
            self._autosave()

    def clear(self):
        """Clear all non-system messages."""
        self.messages = [m for m in self.messages if m["role"] == "system"]

    def get_messages(self) -> list[dict]:
        if not self.max_context_tokens or self.max_context_tokens <= 0:
            return list(self.messages)
        # Estimate tokens (~4 chars per token) and trim oldest non-system messages
        budget = self.max_context_tokens
        result = []
        # Always include system message first
        for m in self.messages:
            if m["role"] == "system":
                budget -= len(m.get("content", "")) // 4
                result.append(m)
                break
        # Walk backwards from newest, adding messages until budget exhausted
        non_system = [m for m in self.messages if m["role"] != "system"]
        selected = []
        for m in reversed(non_system):
            cost = len(m.get("content", "")) // 4
            if cost > budget:
                break
            budget -= cost
            selected.append(m)
        selected.reverse()
        result.extend(selected)
        return result

    def save(self, name: str | None = None) -> str:
        """Save session to disk. Returns the file path."""
        os.makedirs(self.history_dir, exist_ok=True)
        if name is None:
            name = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(self.history_dir, f"{name}.json")
        data = {
            "name": name,
            "saved_at": datetime.now().isoformat(),
            "messages": [m for m in self.messages if m["role"] != "system"],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return filepath

    def load(self, name: str) -> bool:
        """Load a saved session by name."""
        filepath = os.path.join(self.history_dir, f"{name}.json")
        if not os.path.exists(filepath):
            return False
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.clear()
        for msg in data.get("messages", []):
            self.messages.append(msg)
        return True

    def _autosave(self):
        """Silently persist current session for crash recovery."""
        try:
            os.makedirs(self.history_dir, exist_ok=True)
            filepath = os.path.join(self.history_dir, "_autosave.json")
            data = {
                "name": "_autosave",
                "saved_at": datetime.now().isoformat(),
                "message_count": len(
                    [m for m in self.messages if m["role"] != "system"]
                ),
                "messages": [m for m in self.messages if m["role"] != "system"],
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass  # Never crash Logos over a save failure

    def has_autosave(self) -> bool:
        """Check if an autosave exists."""
        return os.path.exists(os.path.join(self.history_dir, "_autosave.json"))

    def resume_autosave(self) -> int:
        """Load autosave if it exists. Returns message count loaded."""
        filepath = os.path.join(self.history_dir, "_autosave.json")
        if not os.path.exists(filepath):
            return 0
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            msgs = data.get("messages", [])
            for msg in msgs:
                self.messages.append(msg)
            return len(msgs)
        except Exception:
            return 0

    def list_sessions(self) -> list[str]:
        """List saved session names."""
        if not os.path.isdir(self.history_dir):
            return []
        return [
            f[:-5] for f in sorted(os.listdir(self.history_dir)) if f.endswith(".json")
        ]
