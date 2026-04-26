"""ANSI terminal output formatting."""

# ANSI color codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"

BOLD_CYAN = f"{BOLD}{CYAN}"
BOLD_WHITE = f"{BOLD}{WHITE}"
BOLD_RED = f"{BOLD}{RED}"
BOLD_GREEN = f"{BOLD}{GREEN}"
BOLD_YELLOW = f"{BOLD}{YELLOW}"
DIM_YELLOW = f"{DIM}{YELLOW}"
DIM_GRAY = f"{DIM}{WHITE}"


class Formatter:
    """Terminal output formatter with ANSI colors."""

    def __init__(self, color: bool = True, prompt_symbol: str = "Logos>",
                 user_symbol: str = "You>"):
        self.color = color
        self.prompt_symbol = prompt_symbol
        self.user_symbol = user_symbol

    def _c(self, code: str, text: str) -> str:
        if not self.color:
            return text
        return f"{code}{text}{RESET}"

    def logo(self):
        """Print the Logos startup banner."""
        banner = r"""
  _
 | |    ___   __ _  ___  ___
 | |   / _ \ / _` |/ _ \/ __|
 | |__| (_) | (_| | (_) \__ \
 |_____\___/ \__, |\___/|___/
              |___/
"""
        print(self._c(BOLD_CYAN, banner))

    def agent_prompt(self):
        """Print the agent prompt prefix."""
        print(f"\n{self._c(BOLD_CYAN, self.prompt_symbol)} ", end="", flush=True)

    def user_prompt(self) -> str:
        """Print user prompt and get input."""
        try:
            return input(f"\n{self._c(BOLD_WHITE, self.user_symbol)} ").strip()
        except (KeyboardInterrupt, EOFError):
            print()
            return "/quit"

    def tool_exec(self, tool_name: str):
        """Print tool execution notice."""
        print(f"  {self._c(DIM_YELLOW, f'[{tool_name}]')}", flush=True)

    def tool_result(self, result: str, max_preview: int = 300):
        """Print tool result preview."""
        preview = result[:max_preview]
        if len(result) > max_preview:
            preview += "..."
        print(f"  {self._c(DIM_GRAY, preview)}", flush=True)

    def error(self, msg: str):
        """Print error message."""
        print(f"  {self._c(BOLD_RED, f'[ERROR] {msg}')}")

    def success(self, msg: str):
        """Print success message."""
        print(f"  {self._c(BOLD_GREEN, msg)}")

    def info(self, msg: str):
        """Print info message."""
        print(f"  {self._c(DIM_GRAY, msg)}")

    def divider(self):
        print(self._c(DIM_GRAY, "-" * 55))

    def stream_token(self, token: str):
        """Print a single streamed token."""
        print(token, end="", flush=True)

    def stream_end(self):
        """End a streamed response."""
        print()
