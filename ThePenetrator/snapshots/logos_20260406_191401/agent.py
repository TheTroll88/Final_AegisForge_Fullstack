"""Agent loop — orchestrates LLM calls, tool parsing, and session management."""

from logos.llm.client import LLMClient
from logos.tools.registry import ToolRegistry
from logos.core.session import Session
from logos.output.formatter import Formatter
from logos.output.workbench import Workbench


SYSTEM_TEMPLATE = """{identity}

{custom_rules}

TOOLS — use these by putting >> at the START of a new line:

>> READ path/to/file
>> WRITE path/to/file
```
content goes here
```

>> EDIT path/to/file
FIND: exact text to find
REPLACE: replacement text

>> DELETE path/to/file
>> RUN command_here
>> SEARCH regex_pattern [--glob *.py]
>> LIST path [--recursive]

>> GIT STATUS
>> GIT DIFF [ref]
>> GIT LOG [count]
>> GIT COMMIT message

>> IMAGE prompt [--model MODEL] [--output file.png]
>> TTS text [--voice VOICE] [--output file.mp3]
>> TRANSCRIBE path/to/audio.mp3
>> EMBED text_to_embed
>> BALANCE
>> WEB_SEARCH query [--scrape]

>> CHAIN chain method [params_json]
  Chains: eth, base, polygon, arb, opt, zora, sol (with _mainnet/_sepolia/_devnet)
  Methods: eth_getBalance, eth_getTransactionByHash, alchemy_getAssetTransfers, etc.

>> PLUTUS start|stop|status|hits [--cores N]
>> TELEGRAM setup|login|status|chats|read|search|send|info [args...]
>> LAB claim|balance|status
>> MEMORY remember|recall|search|list|forget [topic] [content]

COMMAND RULES:
1. >> must be at the VERY START of a line (column 0, no indentation)
2. Multi-line blocks (WRITE, EDIT) use their own delimiters
3. Max 5 tool calls per response
4. Tool results appear inline — use them to inform your next action
5. When a tool fails, diagnose and retry with corrective action
"""


class AgentLoop:
    """Orchestrates conversation between user, LLM, and tools."""

    def __init__(self, client: LLMClient, registry: ToolRegistry, session: Session,
                 fmt: Formatter, model: str, workspace: str, workbench: Workbench = None):
        self.client = client
        self.registry = registry
        self.session = session
        self.fmt = fmt
        self.model = model
        self.workspace = workspace
        self.workbench = workbench or Workbench()

    def build_system_prompt(self, config: dict, tree: str, contents: str) -> str:
        """Build the system prompt from SYSTEM_TEMPLATE + config + workspace context."""
        identity = config.get("agent", {}).get("identity", "You are Logos.")

        custom_rules_list = config.get("custom_rules", [])
        if custom_rules_list:
            custom_rules = "\n".join(f"- {rule}" for rule in custom_rules_list)
        else:
            custom_rules = ""

        sys_prompt = SYSTEM_TEMPLATE.format(
            identity=identity,
            custom_rules=custom_rules,
        )

        # Append workspace tree
        if tree:
            sys_prompt += f"\n\n== WORKSPACE ==\n{tree}"

        # Append file contents (unless lazy-loaded)
        if contents and not contents.startswith("(Files loaded"):
            sys_prompt += f"\n\n== FILE CONTENTS ==\n{contents}"

        return sys_prompt

    def run_turn(self):
        """Execute one agent turn: stream LLM response, parse and run tools, log results."""
        messages = self.session.get_messages()

        # Stream LLM response
        self.fmt.agent_prompt()
        full_response = ""

        try:
            for token in self.client.chat_stream(messages, self.model):
                self.fmt.stream_token(token)
                full_response += token
        except Exception as e:
            self.fmt.error(f"LLM error: {e}")
            return

        self.fmt.stream_end()

        # Parse >> commands and execute tools
        results = self.registry.parse_freeform(full_response, self.workspace)

        for result in results:
            self.fmt.tool_exec(result.tool_name)
            self.fmt.tool_result(result.output)
            self.workbench.write(result.tool_name, result.output)

        # Save assistant response to session
        self.session.add("assistant", full_response)

        # If tools ran, feed results back for a follow-up turn
        if results:
            tool_summary = "\n".join(
                f"[{r.tool_name}] {'OK' if r.success else 'FAILED'}: {r.output[:500]}"
                for r in results
            )
            self.session.add("user", f"[TOOL RESULTS]\n{tool_summary}")
            self.run_turn()
