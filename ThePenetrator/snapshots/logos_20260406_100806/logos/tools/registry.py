"""Tool registry — discovers, stores, and dispatches tools."""

from __future__ import annotations

import re
from logos.tools.base import BaseTool, ToolResult


class ToolRegistry:
    """Registry of all available tools."""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        """Register a tool instance."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())

    def list_descriptions(self) -> dict[str, str]:
        return {name: t.description for name, t in self._tools.items()}

    def execute(self, name: str, params: dict, workspace: str) -> ToolResult:
        """Execute a tool by name."""
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(success=False, output=f"Unknown tool: {name}", tool_name=name)
        try:
            return tool.execute(params, workspace)
        except Exception as e:
            return ToolResult(success=False, output=f"Error in {name}: {e}", tool_name=name)

    def to_schemas(self) -> list[dict]:
        """Export all tools as OpenAI function schemas."""
        return [t.to_schema() for t in self._tools.values()]

    def parse_freeform(self, response: str, workspace: str) -> list[ToolResult]:
        """Parse >> commands from freeform LLM output.

        Only matches >> at the actual start of a line (not inside code blocks).
        Caps at 5 tool calls per response to prevent loops.
        """
        results = []
        MAX_CALLS = 5

        # Strip code blocks to avoid false positives from examples
        # But preserve WRITE blocks which ARE intentional
        cleaned = response

        # >> WRITE path\n```\ncontent\n``` — handle first since it contains code blocks
        for m in re.finditer(r"^>> WRITE\s+(.+)\n```(?:\w*)\n([\s\S]*?)```", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("write_file", {
                "path": m.group(1).strip(), "content": m.group(2)
            }, workspace)
            results.append(r)

        # >> EDIT path\nFIND: ...\nREPLACE: ...
        for m in re.finditer(
            r"^>> EDIT\s+(.+)\nFIND:\s*([\s\S]*?)\nREPLACE:\s*([\s\S]*?)(?=\n>> |\n\n|\Z)",
            cleaned, re.MULTILINE,
        ):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("edit_file", {
                "path": m.group(1).strip(),
                "find": m.group(2).strip(),
                "replace": m.group(3).strip(),
            }, workspace)
            results.append(r)

        # >> RUN command
        for m in re.finditer(r"^>> RUN\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("run_command", {"command": m.group(1).strip()}, workspace)
            results.append(r)

        # >> DELETE path
        for m in re.finditer(r"^>> DELETE\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("delete_file", {"path": m.group(1).strip()}, workspace)
            results.append(r)

        # >> SEARCH pattern
        for m in re.finditer(r"^>> SEARCH\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("search_files", {"pattern": m.group(1).strip()}, workspace)
            results.append(r)

        # >> LIST path
        for m in re.finditer(r"^>> LIST\s+(.*)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            path = m.group(1).strip() or "."
            r = self.execute("list_directory", {"path": path}, workspace)
            results.append(r)

        # >> READ path
        for m in re.finditer(r"^>> READ\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("read_file", {"path": m.group(1).strip()}, workspace)
            results.append(r)

        # >> GIT STATUS / DIFF / LOG / COMMIT
        for m in re.finditer(r"^>> GIT\s+(STATUS|DIFF|LOG|COMMIT\s+.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            cmd = m.group(1).strip()
            if cmd == "STATUS":
                r = self.execute("git_status", {}, workspace)
            elif cmd == "DIFF":
                r = self.execute("git_diff", {}, workspace)
            elif cmd == "LOG":
                r = self.execute("git_log", {}, workspace)
            elif cmd.startswith("COMMIT"):
                msg = cmd[7:].strip()
                r = self.execute("git_commit", {"message": msg}, workspace)
            else:
                continue
            results.append(r)

        # >> IMAGE prompt [--model MODEL] [--output FILE]
        for m in re.finditer(r"^>> IMAGE\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            raw = m.group(1).strip()
            params = {"prompt": raw}
            # Parse optional flags
            model_match = re.search(r"--model\s+(\S+)", raw)
            output_match = re.search(r"--output\s+(\S+)", raw)
            if model_match:
                params["model"] = model_match.group(1)
                params["prompt"] = raw[:model_match.start()].strip()
            if output_match:
                params["output"] = output_match.group(1)
                params["prompt"] = params["prompt"].replace(output_match.group(0), "").strip()
            r = self.execute("image_gen", params, workspace)
            results.append(r)

        # >> TTS text [--voice VOICE] [--output FILE]
        for m in re.finditer(r"^>> TTS\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            raw = m.group(1).strip()
            params = {"text": raw}
            voice_match = re.search(r"--voice\s+(\S+)", raw)
            output_match = re.search(r"--output\s+(\S+)", raw)
            if voice_match:
                params["voice"] = voice_match.group(1)
                params["text"] = raw[:voice_match.start()].strip()
            if output_match:
                params["output"] = output_match.group(1)
                params["text"] = params["text"].replace(output_match.group(0), "").strip()
            r = self.execute("tts", params, workspace)
            results.append(r)

        # >> TRANSCRIBE path/to/audio
        for m in re.finditer(r"^>> TRANSCRIBE\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("transcribe", {"path": m.group(1).strip()}, workspace)
            results.append(r)

        # >> EMBED text to embed
        for m in re.finditer(r"^>> EMBED\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("embed", {"text": m.group(1).strip()}, workspace)
            results.append(r)

        # >> BALANCE
        for m in re.finditer(r"^>> BALANCE\s*$", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            r = self.execute("balance", {}, workspace)
            results.append(r)

        # >> CHAIN chain method [params...]
        for m in re.finditer(r"^>> CHAIN\s+(\S+)\s+(\S+)(?:\s+(.+))?", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            chain = m.group(1).strip()
            method = m.group(2).strip()
            raw_params = m.group(3).strip() if m.group(3) else ""
            # Parse params — could be JSON array, JSON object, or space-separated values
            rpc_params = []
            if raw_params:
                try:
                    parsed = __import__("json").loads(raw_params)
                    if isinstance(parsed, list):
                        rpc_params = parsed
                    else:
                        rpc_params = [parsed]
                except Exception:
                    rpc_params = [p.strip() for p in raw_params.split() if p.strip()]
            r = self.execute("chain_query", {"chain": chain, "method": method, "params": rpc_params}, workspace)
            results.append(r)

        # >> WEB_SEARCH query [--scrape]
        for m in re.finditer(r"^>> WEB_SEARCH\s+(.+)", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            raw = m.group(1).strip()
            scrape = "--scrape" in raw
            query = raw.replace("--scrape", "").strip()
            r = self.execute("web_search", {"query": query, "scrape": scrape}, workspace)
            results.append(r)

        # >> TELEGRAM action [args...]
        for m in re.finditer(r"^>> TELEGRAM\s+(\S+)(?:\s+(.+))?", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            action = m.group(1).strip().lower()
            raw_args = m.group(2).strip() if m.group(2) else ""
            params = {"action": action}
            # Parse --limit N
            limit_match = re.search(r"--limit\s+(\d+)", raw_args)
            if limit_match:
                params["limit"] = int(limit_match.group(1))
                raw_args = raw_args[:limit_match.start()].strip() + " " + raw_args[limit_match.end():].strip()
                raw_args = raw_args.strip()
            # Parse --in <target> for search
            in_match = re.search(r"--in\s+(\S+)", raw_args)
            if in_match:
                params["target"] = in_match.group(1)
                raw_args = raw_args[:in_match.start()].strip() + " " + raw_args[in_match.end():].strip()
                raw_args = raw_args.strip()
            # Route remaining args by action
            if action == "setup":
                parts = raw_args.split()
                if len(parts) >= 2:
                    params["api_id"] = parts[0]
                    params["api_hash"] = parts[1]
            elif action in ("read", "info"):
                if raw_args:
                    params["target"] = raw_args.split()[0]
            elif action == "send":
                parts = raw_args.split(None, 1)
                if len(parts) >= 2:
                    params["target"] = parts[0]
                    params["text"] = parts[1]
            elif action == "search":
                if raw_args:
                    params["text"] = raw_args
            r = self.execute("telegram", params, workspace)
            results.append(r)

        # >> PLUTUS action [--cores N]
        for m in re.finditer(r"^>> PLUTUS\s+(\S+)(?:\s+(.+))?", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            action = m.group(1).strip().lower()
            raw_args = m.group(2).strip() if m.group(2) else ""
            params = {"action": action}
            cores_match = re.search(r"--cores\s+(\d+)", raw_args)
            if cores_match:
                params["cores"] = int(cores_match.group(1))
            r = self.execute("plutus", params, workspace)
            results.append(r)

        # >> LAB action
        for m in re.finditer(r"^>> LAB\s+(\S+)(?:\s+(.+))?", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            action = m.group(1).strip().lower()
            params = {"action": action}
            r = self.execute("lab_terminal", params, workspace)
            results.append(r)

        # >> MEMORY action [topic] [content]
        for m in re.finditer(r"^>> MEMORY\s+(\S+)(?:\s+(.+))?", cleaned, re.MULTILINE):
            if len(results) >= MAX_CALLS:
                break
            action = m.group(1).strip().lower()
            raw_args = m.group(2).strip() if m.group(2) else ""
            params = {"action": action}
            if action == "remember":
                parts = raw_args.split(None, 1)
                if len(parts) >= 2:
                    params["topic"] = parts[0]
                    params["content"] = parts[1]
                elif len(parts) == 1:
                    params["topic"] = parts[0]
            elif action in ("recall", "forget"):
                if raw_args:
                    params["topic"] = raw_args.split()[0]
            elif action == "search":
                if raw_args:
                    params["query"] = raw_args
            r = self.execute("learning", params, workspace)
            results.append(r)

        return results
