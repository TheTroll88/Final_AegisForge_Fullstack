"""Plutus Bitcoin scanner tool — background process control for Logos."""

import os
import subprocess
import signal
import time
from logos.tools.base import BaseTool, ToolResult

PLUTUS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "plutus")
PLUTUS_SCRIPT = os.path.join(PLUTUS_DIR, "plutus.py")
PID_FILE = os.path.expanduser("~/.logos/plutus.pid")
HITS_FILE = os.path.join(PLUTUS_DIR, "plutus.txt")


class PlutusTool(BaseTool):
    """Control the Plutus Bitcoin brute forcer from Logos."""
    name = "plutus"
    description = "Control Plutus Bitcoin scanner — start, stop, status, hits"
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["start", "stop", "status", "hits"],
                "description": "start/stop/status/hits",
            },
            "cores": {
                "type": "integer",
                "description": "CPU cores to use (default: cpu_count - 1)",
            },
        },
        "required": ["action"],
    }

    def _is_running(self):
        """Check if Plutus is running via PID file."""
        if not os.path.exists(PID_FILE):
            return False, None
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            # Check if process exists (Windows-compatible)
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}", "/NH"],
                capture_output=True, text=True, timeout=5
            )
            if str(pid) in result.stdout:
                return True, pid
            else:
                os.remove(PID_FILE)
                return False, None
        except Exception:
            return False, None

    def _start(self, cores=None):
        """Launch Plutus in background."""
        running, pid = self._is_running()
        if running:
            return ToolResult(True, f"Plutus already running (PID {pid})", self.name)

        if not os.path.exists(PLUTUS_SCRIPT):
            return ToolResult(False, f"Plutus not found at {PLUTUS_SCRIPT}", self.name)

        import multiprocessing
        cpu = cores or max(1, multiprocessing.cpu_count() - 1)

        # Launch as detached background process
        proc = subprocess.Popen(
            ["python", PLUTUS_SCRIPT, "--cpu-count", str(cpu)],
            cwd=PLUTUS_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=0x00000008 | 0x00000200,  # DETACHED + CREATE_NEW_PROCESS_GROUP
        )

        os.makedirs(os.path.dirname(PID_FILE), exist_ok=True)
        with open(PID_FILE, "w") as f:
            f.write(str(proc.pid))

        return ToolResult(True, f"Plutus started — PID {proc.pid}, {cpu} cores, scanning keys...", self.name)

    def _stop(self):
        """Kill Plutus."""
        running, pid = self._is_running()
        if not running:
            return ToolResult(True, "Plutus is not running.", self.name)

        try:
            # Kill process tree (Plutus spawns child workers)
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                capture_output=True, text=True, timeout=10
            )
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
            return ToolResult(True, f"Plutus stopped (PID {pid}).", self.name)
        except Exception as e:
            return ToolResult(False, f"Failed to stop Plutus: {e}", self.name)

    def _status(self):
        """Check Plutus status."""
        running, pid = self._is_running()
        lines = [f"Running: {'yes' if running else 'no'}"]
        if running:
            lines.append(f"PID: {pid}")

        # Check for hits
        hit_count = 0
        if os.path.exists(HITS_FILE):
            with open(HITS_FILE, "r") as f:
                content = f.read()
            # Each hit is a block of 4 lines + blank
            hit_count = content.count("hex private key:")
        lines.append(f"Hits found: {hit_count}")

        return ToolResult(True, "\n".join(lines), self.name)

    def _hits(self):
        """Read found wallets."""
        if not os.path.exists(HITS_FILE):
            return ToolResult(True, "No hits file — nothing found yet.", self.name)
        with open(HITS_FILE, "r") as f:
            content = f.read().strip()
        if not content:
            return ToolResult(True, "Hits file is empty — nothing found yet.", self.name)
        return ToolResult(True, content, self.name)

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "status").lower()
        if action == "start":
            return self._start(params.get("cores"))
        elif action == "stop":
            return self._stop()
        elif action == "status":
            return self._status()
        elif action == "hits":
            return self._hits()
        else:
            return ToolResult(False, f"Unknown action: {action}. Use start/stop/status/hits.", self.name)
