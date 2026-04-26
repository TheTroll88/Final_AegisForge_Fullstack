"""Minimal terminal formatter for the Logos CLI."""

from __future__ import annotations

import sys


class Formatter:
    """Lightweight console formatter used by the interactive CLI."""

    def __init__(
        self,
        color: bool = True,
        prompt_symbol: str = "Logos>",
        user_symbol: str = "You>",
    ):
        self.color = color
        self.prompt_symbol = prompt_symbol
        self.user_symbol = user_symbol

    def _print(self, message: str = ""):
        print(message)

    def logo(self):
        self._print("=== Logos ===")

    def info(self, message: str):
        self._print(message)

    def success(self, message: str):
        self._print(message)

    def error(self, message: str):
        self._print(message)

    def divider(self):
        self._print("-" * 60)

    def user_prompt(self) -> str:
        try:
            return input(f"{self.user_symbol} ").strip()
        except EOFError:
            return "/quit"

    def agent_prompt(self):
        sys.stdout.write(f"{self.prompt_symbol} ")
        sys.stdout.flush()

    def stream_token(self, token: str):
        sys.stdout.write(token)
        sys.stdout.flush()

    def stream_end(self):
        sys.stdout.write("\n")
        sys.stdout.flush()

    def tool_exec(self, tool_name: str):
        self._print(f"[tool:{tool_name}]")

    def tool_result(self, output: str):
        if output:
            self._print(output)
