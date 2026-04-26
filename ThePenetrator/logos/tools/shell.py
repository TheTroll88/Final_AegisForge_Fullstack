"""Shell command execution tool."""

import os
import subprocess
import sys

from logos.tools.base import BaseTool, ToolResult


class RunCommandTool(BaseTool):
    name = "run_command"
    description = "Run a shell command and return the output. Uses the workspace venv automatically."
    parameters = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Shell command to run"},
            "cwd": {"type": "string", "description": "Working directory (optional)"},
            "timeout": {
                "type": "integer",
                "description": "Timeout in seconds (default 60)",
            },
        },
        "required": ["command"],
    }

    def __init__(self, default_timeout: int = 60):
        self.default_timeout = default_timeout

    def execute(self, params: dict, workspace: str) -> ToolResult:
        cmd = params["command"]
        cwd = params.get("cwd", workspace)
        timeout = params.get("timeout", self.default_timeout)

        # Activate venv by prepending its Scripts dir to PATH
        env = os.environ.copy()
        venv_dir = os.path.join(workspace, ".venv", "Scripts")
        if os.path.isdir(venv_dir):
            env["PATH"] = venv_dir + os.pathsep + env.get("PATH", "")
            env["VIRTUAL_ENV"] = os.path.join(workspace, ".venv")

        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd,
                env=env,
            )
            output = (result.stdout + result.stderr).strip()
            code = result.returncode
            return ToolResult(
                success=(code == 0),
                output=f"[exit {code}]\n{output}" if output else f"[exit {code}]",
                tool_name=self.name,
            )
        except subprocess.TimeoutExpired:
            return ToolResult(False, f"Timed out after {timeout}s: {cmd}", self.name)
        except Exception as e:
            return ToolResult(False, f"Error running '{cmd}': {e}", self.name)
