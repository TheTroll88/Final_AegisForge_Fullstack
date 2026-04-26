"""Context window management."""

from __future__ import annotations


class ContextManager:
    """Tracks approximate token usage for context budgeting."""

    def __init__(self, max_chars: int = 120000):
        self.max_chars = max_chars

    def estimate_tokens(self, text: str) -> int:
        """Rough token estimate (1 token ≈ 4 chars for English)."""
        return len(text) // 4

    def fits(self, text: str, current_usage: int) -> bool:
        """Check if text fits in the remaining budget."""
        return current_usage + len(text) < self.max_chars

    def message_chars(self, messages: list[dict]) -> int:
        """Count total chars in a message list."""
        return sum(len(m.get("content", "")) for m in messages)
