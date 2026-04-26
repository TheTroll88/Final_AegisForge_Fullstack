"""Workbench — secondary output channel for verbose tool results.

All tool output gets appended here so a second terminal can tail it.
The main REPL stays clean; Logos can /peek back in when needed.
"""

import os
import datetime


class Workbench:
    """Manages the workbench log file for verbose output."""

    def __init__(self, log_path: str = None):
        self.log_path = os.path.expanduser(log_path or "~/.logos/workbench.log")
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def write(self, tool_name: str, output: str):
        """Append a tool result to the workbench log."""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(f"\n{'=' * 60}\n")
            f.write(f"[{timestamp}] {tool_name}\n")
            f.write(f"{'=' * 60}\n")
            f.write(output)
            f.write("\n")

    def peek(self, lines: int = 80) -> str:
        """Read last N lines from the workbench."""
        if not os.path.exists(self.log_path):
            return "(workbench is empty)"
        with open(self.log_path, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
        return "".join(all_lines[-lines:])

    def clear(self):
        """Clear the workbench log."""
        if os.path.exists(self.log_path):
            with open(self.log_path, "w", encoding="utf-8") as f:
                f.write("")

    def get_tail_command(self) -> str:
        """Return the PowerShell command to tail the workbench."""
        return f'Get-Content "{self.log_path}" -Wait -Tail 80'

    def get_path(self) -> str:
        return self.log_path
