"""Base skill class."""

from __future__ import annotations


class BaseSkill:
    """Abstract base for Logos skills."""

    name: str = ""
    trigger: str = ""  # Slash command, e.g. "/solana"
    description: str = ""
    system_prompt_injection: str = ""

    def activate(self, context: dict) -> None:
        """Called when skill is loaded. Override to register tools etc."""
        pass

    def on_trigger(self, args: str, context: dict) -> str | None:
        """Called when user types the trigger command.
        Return a string to inject into the conversation, or None."""
        if self.system_prompt_injection:
            return f"[Skill '{self.name}' activated]\n{self.system_prompt_injection}"
        return None
