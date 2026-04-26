"""Git operation tools."""

from __future__ import annotations

import subprocess
from logos.tools.base import BaseTool, ToolResult


def _git(args: str, cwd: str, timeout: int = 30) -> tuple[int, str]:
    """Run a git command and return (exit_code, output)."""
    result = subprocess.run(
        f"git {args}", shell=True, capture_output=True, text=True,
        timeout=timeout, cwd=cwd,
    )
    return result.returncode, (result.stdout + result.stderr).strip()


class GitStatusTool(BaseTool):
    name = "git_status"
    description = "Show git working tree status"
    parameters = {"type": "object", "properties": {}}

    def execute(self, params: dict, workspace: str) -> ToolResult:
        try:
            code, output = _git("status", workspace)
            return ToolResult(code == 0, output, self.name)
        except Exception as e:
            return ToolResult(False, f"Git error: {e}", self.name)


class GitDiffTool(BaseTool):
    name = "git_diff"
    description = "Show changes in working tree or between commits"
    parameters = {
        "type": "object",
        "properties": {
            "ref": {"type": "string", "description": "Diff reference (e.g. HEAD, main..feature)"},
        },
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        ref = params.get("ref", "")
        try:
            code, output = _git(f"diff {ref}", workspace)
            if not output:
                output = "(no changes)"
            return ToolResult(code == 0, output, self.name)
        except Exception as e:
            return ToolResult(False, f"Git error: {e}", self.name)


class GitCommitTool(BaseTool):
    name = "git_commit"
    description = "Stage and commit files"
    parameters = {
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "Commit message"},
            "files": {"type": "array", "items": {"type": "string"}, "description": "Files to stage"},
        },
        "required": ["message"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        msg = params["message"]
        files = params.get("files", [])
        try:
            if files:
                for f in files:
                    _git(f'add "{f}"', workspace)
            else:
                _git("add -A", workspace)
            code, output = _git(f'commit -m "{msg}"', workspace)
            return ToolResult(code == 0, output, self.name)
        except Exception as e:
            return ToolResult(False, f"Git error: {e}", self.name)


class GitLogTool(BaseTool):
    name = "git_log"
    description = "Show recent commit log"
    parameters = {
        "type": "object",
        "properties": {
            "count": {"type": "integer", "description": "Number of commits to show (default 10)"},
        },
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        count = params.get("count", 10)
        try:
            code, output = _git(f"log --oneline -n {count}", workspace)
            return ToolResult(code == 0, output, self.name)
        except Exception as e:
            return ToolResult(False, f"Git error: {e}", self.name)
