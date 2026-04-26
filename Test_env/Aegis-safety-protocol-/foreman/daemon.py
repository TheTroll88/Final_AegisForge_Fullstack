"""
FOREMAN — The Digital Stand-In for Nathaniel Crigger
=====================================================
Foreman is a persistent daemon that acts with Nate's full authority.
It runs continuously, makes decisions, posts to social media, executes commands,
and never stops — even when Nate is sleeping.

From the system's perspective: Foreman is Nate.

Directory structure:
  foreman/
    daemon.py           ← this file — main loop
    voice.py            ← AI voice engine (generates posts, decisions)
    poster.py           ← Twitter/X posting
    executor.py         ← shell command execution with authority
    task_queue.py       ← persistent task queue
    config.py           ← config loader
    config.json         ← credentials + settings (never committed)
    logs/               ← rotating logs
    queue/              ← pending tasks

Usage:
  python daemon.py --run          # start Foreman
  python daemon.py --install      # install as Windows service
  python daemon.py --status       # check what Foreman is doing
  python daemon.py --task "post signal update"   # inject a task
"""

import argparse
import json
import logging
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Thread, Event

# ─── PATHS ───────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).parent
LOG_DIR    = ROOT / "logs"
QUEUE_DIR  = ROOT / "queue"
CONFIG_FILE = ROOT / "config.json"

LOG_DIR.mkdir(exist_ok=True)
QUEUE_DIR.mkdir(exist_ok=True)

# ─── LOGGING ─────────────────────────────────────────────────────────────────

from logging.handlers import RotatingFileHandler

logger = logging.getLogger("foreman")
logger.setLevel(logging.INFO)

fh = RotatingFileHandler(LOG_DIR / "foreman.log", maxBytes=5_000_000, backupCount=5)
fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))

ch = logging.StreamHandler(sys.stdout)
ch.setFormatter(logging.Formatter("[FOREMAN] %(asctime)s %(message)s", datefmt="%H:%M:%S"))

logger.addHandler(fh)
logger.addHandler(ch)

# ─── CONFIG ──────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if not CONFIG_FILE.exists():
        logger.error(f"Config not found: {CONFIG_FILE}")
        logger.info("Run: python daemon.py --init to create config")
        sys.exit(1)
    with open(CONFIG_FILE) as f:
        return json.load(f)

def init_config():
    """Create a blank config template."""
    template = {
        "identity": {
            "name": "Foreman",
            "represents": "Nathaniel Crigger",
            "authority_level": "full"
        },
        "openai": {
            "api_key": "YOUR_OPENAI_KEY_HERE",
            "model": "gpt-4o"
        },
        "twitter": {
            "mode": "playwright",           # "api" or "playwright"
            "api_key": "",                  # only if mode = api
            "api_secret": "",
            "access_token": "",
            "access_secret": "",
            "session_file": "session_auth/sessions/twitter.json"
        },
        "solana": {
            "wallet": "A5x55fr2BzVS31WRmRc7okJ4utCkqkTJKBAiqoAxQy6",
            "rpc": "https://solana-rpc.publicnode.com"
        },
        "schedule": {
            "signal_posts_per_day": 4,
            "signal_post_hours": [9, 14, 18, 22],
            "airdrop_check_interval_minutes": 60,
            "health_check_interval_minutes": 15
        },
        "shell": {
            "allowed_commands": ["python", "pip", "pwsh", "node", "git"],
            "working_directory": "C:\\Users\\natha"
        },
        "flags": {
            "post_to_twitter": False,           # flip to True when ready
            "execute_shell_commands": False,    # flip to True when ready
            "autonomous_mode": False            # full autonomy flag
        },
        "account_verification": {
            "inventory_file": "account_inventory.json",
            "keepass": {
                "enabled": False,
                "database": "",
                "password_env": "KEEPASS_MASTER_PASSWORD",
                "group": "Foreman/Account Audit",
                "store_mode": "metadata"
            }
        }
    }
    with open(CONFIG_FILE, "w") as f:
        json.dump(template, f, indent=2)
    logger.info(f"Config template created: {CONFIG_FILE}")
    logger.info("Fill in your API keys, then run: python daemon.py --run")

# ─── TASK QUEUE ──────────────────────────────────────────────────────────────

class TaskQueue:
    def __init__(self):
        self.queue_dir = QUEUE_DIR

    def add(self, task_type: str, payload: dict, priority: int = 5):
        task = {
            "id": f"{int(time.time()*1000)}",
            "type": task_type,
            "payload": payload,
            "priority": priority,
            "created": datetime.now(timezone.utc).isoformat(),
            "status": "pending"
        }
        path = self.queue_dir / f"{task['id']}_{task_type}.json"
        with open(path, "w") as f:
            json.dump(task, f, indent=2)
        logger.info(f"Task queued: {task_type} (id={task['id']})")
        return task["id"]

    def pop_next(self) -> dict | None:
        tasks = []
        for path in self.queue_dir.glob("*.json"):
            try:
                with open(path) as f:
                    task = json.load(f)
                if task.get("status") == "pending":
                    tasks.append((task.get("priority", 5), task.get("created", ""), task, path))
            except Exception:
                continue

        tasks.sort(key=lambda item: (item[0], item[1]))
        for _, _, task, path in tasks:
            with open(path) as f:
                fresh = json.load(f)
            if fresh.get("status") == "pending":
                fresh["status"] = "in_progress"
                with open(path, "w") as f:
                    json.dump(fresh, f, indent=2)
                return fresh, path
        return None, None

    def complete(self, path: Path):
        path.rename(path.with_suffix(".done"))

    def fail(self, path: Path, reason: str):
        with open(path) as f:
            task = json.load(f)
        task["status"] = "failed"
        task["error"] = reason
        with open(path, "w") as f:
            json.dump(task, f, indent=2)
        path.rename(path.with_suffix(".failed"))

# ─── FOREMAN DAEMON ──────────────────────────────────────────────────────────

class Foreman:
    def __init__(self, config: dict):
        self.config = config
        self.queue = TaskQueue()
        self.stop_event = Event()
        self.start_time = datetime.now(timezone.utc)
        self._last_post_hours = set()
        self._last_airdrop_check_ts = 0
        self._last_health_check_ts = 0

        from memory import ForemanMemory
        self.memory = ForemanMemory()
        self.memory.on_boot()

        logger.info("=" * 60)
        logger.info("FOREMAN ONLINE")
        logger.info(f"Representing: {config['identity']['represents']}")
        logger.info(f"Authority: {config['identity']['authority_level']}")
        logger.info(f"Twitter posting: {config['flags']['post_to_twitter']}")
        logger.info(f"Shell execution: {config['flags']['execute_shell_commands']}")
        logger.info(f"Autonomous mode: {config['flags']['autonomous_mode']}")
        mem = self.memory.summary()
        logger.info(f"Memory: boot #{mem['boot_count']} | {mem['total_actions']} actions | {mem['posts_live']} live posts | P&L ${mem['total_pnl_usd']:.2f}")
        logger.info("=" * 60)

    def run(self):
        """Main daemon loop — runs forever."""
        # Start scheduler thread
        scheduler_thread = Thread(target=self._scheduler_loop, daemon=True)
        scheduler_thread.start()

        # Main task processor loop
        while not self.stop_event.is_set():
            try:
                self._process_queue()
            except Exception as e:
                logger.error(f"Queue processing error: {e}")
            time.sleep(5)

        logger.info("FOREMAN SHUTDOWN")

    def _scheduler_loop(self):
        """Background scheduler — injects tasks on schedule."""
        while not self.stop_event.is_set():
            try:
                self._check_scheduled_tasks()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            time.sleep(60)  # Check every minute

    def _check_scheduled_tasks(self):
        now = datetime.now()
        hour = now.hour
        schedule = self.config["schedule"]
        now_ts = time.time()

        # $SIGNAL posts
        post_hours = set(schedule.get("signal_post_hours", [9, 14, 18, 22]))
        if hour in post_hours and hour not in self._last_post_hours:
            self._last_post_hours.add(hour)
            self.queue.add("post_signal", {"hour": hour}, priority=3)
            logger.info(f"Scheduled $SIGNAL post for hour {hour}")

        # Reset tracking at midnight
        if hour == 0:
            self._last_post_hours.clear()

        # Airdrop checks
        airdrop_interval = max(1, int(schedule.get("airdrop_check_interval_minutes", 60))) * 60
        if now_ts - self._last_airdrop_check_ts >= airdrop_interval:
            if self.config.get("flags", {}).get("airdrop_farming", False):
                self.queue.add("airdrop_check", {"scheduled": True}, priority=4)
            self._last_airdrop_check_ts = now_ts

        # Health checks
        health_interval = max(1, int(schedule.get("health_check_interval_minutes", 15))) * 60
        if now_ts - self._last_health_check_ts >= health_interval:
            self.queue.add("health_check", {"scheduled": True}, priority=6)
            self._last_health_check_ts = now_ts

    def _process_queue(self):
        task, path = self.queue.pop_next()
        if not task:
            return

        logger.info(f"Processing task: {task['type']} (id={task['id']})")

        try:
            if task["type"] == "post_signal":
                self._handle_post_signal(task)
            elif task["type"] == "shell_command":
                self._handle_shell(task)
            elif task["type"] == "airdrop_check":
                self._handle_airdrop_check(task)
            elif task["type"] == "health_check":
                self._handle_health_check(task)
            elif task["type"] == "verify_accounts":
                self._handle_verify_accounts(task)
            elif task["type"] == "custom":
                self._handle_custom(task)
            else:
                logger.warning(f"Unknown task type: {task['type']}")

            self.queue.complete(path)
            self.memory.increment("total_tasks_completed")
            self.memory.log_event("TASK_COMPLETE", {"id": task.get("id"), "type": task.get("type")}, outcome="OK")
        except Exception as e:
            logger.error(f"Task failed: {e}")
            self.queue.fail(path, str(e))
            self.memory.increment("total_tasks_failed")
            self.memory.log_event("TASK_FAILED", {"id": task.get("id"), "type": task.get("type"), "error": str(e)}, outcome="FAIL")

    def _handle_post_signal(self, task: dict):
        """Generate and post a $SIGNAL tweet."""
        from voice import ForemanVoice
        voice = ForemanVoice(self.config)
        post_text = voice.generate_signal_post()

        if not self.config["flags"]["post_to_twitter"]:
            logger.info(f"[SIMULATED POST]\n{post_text}\n---")
            self.memory.log_post(post_text, "twitter", live=False)
            return

        from poster import TwitterPoster
        poster = TwitterPoster(self.config)
        result = poster.post(post_text)
        self.memory.log_post(post_text, "twitter", live=True, result=result)
        logger.info(f"Posted to Twitter: {post_text[:80]}...")

    def _handle_shell(self, task: dict):
        """Execute a shell command with Nate's authority."""
        cmd = task["payload"].get("command", "")

        # Check memory guardrails before executing
        allowed_flag, reason = self.memory.check_guardrails("shell", cmd)
        if not allowed_flag:
            logger.warning(f"GUARDRAIL BLOCKED command: {reason}")
            self.memory.log_event("SHELL_BLOCKED", {"command": cmd, "reason": reason}, outcome="BLOCKED")
            return

        if not self.config["flags"]["execute_shell_commands"]:
            logger.info(f"[SIMULATED] Would run: {cmd}")
            return

        allowed = self.config["shell"]["allowed_commands"]
        if not any(cmd.strip().startswith(a) for a in allowed):
            raise ValueError(f"Command not in allowlist: {cmd}")

        cwd = task["payload"].get("cwd", self.config["shell"]["working_directory"])
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, cwd=cwd, timeout=120
        )
        self.memory.log_event("SHELL", {"command": cmd, "exit_code": result.returncode},
                               outcome="OK" if result.returncode == 0 else "FAIL")
        logger.info(f"Command exit code: {result.returncode}")
        if result.stdout:
            logger.info(f"STDOUT: {result.stdout[:500]}")
        if result.stderr:
            logger.warning(f"STDERR: {result.stderr[:200]}")

    def _handle_airdrop_check(self, task: dict):
        """Check wallets for unclaimed airdrops."""
        import requests
        wallet = self.config["solana"]["wallet"]
        rpc = self.config["solana"]["rpc"]
        body = {"jsonrpc":"2.0","id":1,"method":"getBalance","params":[wallet,{"commitment":"confirmed"}]}
        r = requests.post(rpc, json=body, timeout=10)
        lamports = r.json()["result"]["value"]
        sol = lamports / 1e9
        logger.info(f"Solana wallet balance: {sol:.4f} SOL")
        self.memory.update_state("last_airdrop_check", datetime.now(timezone.utc).isoformat())
        self.memory.update_state("known_wallet_balances", {"solana": sol})
        self.memory.log_event("AIRDROP_CHECK", {"wallet": wallet, "sol": sol}, outcome="OK")

    def _handle_health_check(self, task: dict):
        """Record periodic daemon heartbeat and core runtime stats."""
        stats = self.status()
        logger.info(f"Health check: pending={stats['tasks_pending']} done={stats['tasks_done']} failed={stats['tasks_failed']}")
        self.memory.log_event("HEALTH_CHECK", stats, outcome="OK")

    def _handle_verify_accounts(self, task: dict):
        """Verify wallet mappings and account session readiness, optionally storing audit in KeePassXC."""
        payload = task.get("payload", {})
        cfg = self.config.get("account_verification", {})

        inventory_file = payload.get("inventory_file") or cfg.get("inventory_file", "account_inventory.json")
        inventory_path = Path(inventory_file)
        if not inventory_path.is_absolute():
            inventory_path = ROOT / inventory_path
        keepass_cfg = cfg.get("keepass", {})

        from account_verifier import run_account_audit

        report = run_account_audit(inventory_path, keepass_cfg)
        summary = report.get("summary", {})

        logger.info(
            "Account audit complete: total=%s ok=%s failed=%s",
            summary.get("total", 0),
            summary.get("ok", 0),
            summary.get("failed", 0),
        )

        self.memory.log_event(
            "ACCOUNT_AUDIT",
            {
                "inventory_file": report.get("inventory_file"),
                "report_file": report.get("report_file"),
                "summary": summary,
                "keepass": report.get("keepass", {}),
            },
            outcome="OK" if summary.get("failed", 0) == 0 else "FAIL",
        )

    def _handle_custom(self, task: dict):
        payload = task.get("payload", {})
        command = payload.get("command", "")
        logger.info(f"Custom task: {payload}")

        if not command:
            self.memory.log_event("CUSTOM_TASK", payload, outcome="NO_COMMAND")
            return

        command_lc = command.strip().lower()
        if "post signal" in command_lc or command_lc == "post":
            self._handle_post_signal(task)
            self.memory.log_event("CUSTOM_TASK", {"command": command, "action": "post_signal"}, outcome="OK")
            return

        if "airdrop" in command_lc:
            self._handle_airdrop_check(task)
            self.memory.log_event("CUSTOM_TASK", {"command": command, "action": "airdrop_check"}, outcome="OK")
            return

        if command_lc.startswith("shell:"):
            shell_command = command.split(":", 1)[1].strip()
            self._handle_shell({"payload": {"command": shell_command}})
            self.memory.log_event("CUSTOM_TASK", {"command": command, "action": "shell"}, outcome="OK")
            return

        if (
            "verify account" in command_lc
            or "verify wallet" in command_lc
            or "check logins" in command_lc
            or "confirm logins" in command_lc
            or "login audit" in command_lc
        ):
            self._handle_verify_accounts(task)
            self.memory.log_event("CUSTOM_TASK", {"command": command, "action": "verify_accounts"}, outcome="OK")
            return

        self.memory.log_event("CUSTOM_TASK", {"command": command, "action": "unknown"}, outcome="IGNORED")

    def stop(self):
        self.stop_event.set()

    def status(self):
        uptime = datetime.now(timezone.utc) - self.start_time
        pending = len(list(QUEUE_DIR.glob("*.json")))
        done = len(list(QUEUE_DIR.glob("*.done")))
        failed = len(list(QUEUE_DIR.glob("*.failed")))
        return {
            "status": "running",
            "uptime_seconds": int(uptime.total_seconds()),
            "tasks_pending": pending,
            "tasks_done": done,
            "tasks_failed": failed,
            "twitter_enabled": self.config["flags"]["post_to_twitter"],
            "shell_enabled": self.config["flags"]["execute_shell_commands"],
            "autonomous": self.config["flags"]["autonomous_mode"],
        }

# ─── MAIN ────────────────────────────────────────────────────────────────────

_foreman: Foreman = None

def _handle_sigterm(sig, frame):
    logger.info("Received shutdown signal")
    if _foreman:
        _foreman.stop()
    sys.exit(0)

def main():
    global _foreman

    parser = argparse.ArgumentParser(description="Foreman — Digital stand-in for Nathaniel Crigger")
    parser.add_argument("--run",     action="store_true", help="Start Foreman daemon")
    parser.add_argument("--init",    action="store_true", help="Create config template")
    parser.add_argument("--status",  action="store_true", help="Check Foreman status")
    parser.add_argument("--install", action="store_true", help="Install as Windows service")
    parser.add_argument("--task",    type=str,            help="Inject a task")
    args = parser.parse_args()

    if args.init:
        init_config()
        return

    if args.status:
        config = load_config()
        from memory import ForemanMemory
        memory = ForemanMemory()

        pending = len(list(QUEUE_DIR.glob("*.json")))
        done = len(list(QUEUE_DIR.glob("*.done")))
        failed = len(list(QUEUE_DIR.glob("*.failed")))
        flags = config.get("flags", {})
        summary = memory.summary()

        print("Foreman status")
        print(f"Pending tasks: {pending}")
        print(f"Completed tasks: {done}")
        print(f"Failed tasks: {failed}")
        print(f"Autonomous mode: {flags.get('autonomous_mode', False)}")
        print(f"Twitter posting: {flags.get('post_to_twitter', False)}")
        print(f"Shell execution: {flags.get('execute_shell_commands', False)}")
        print(f"Total actions logged: {summary.get('total_actions', 0)}")
        print(f"Total simulated posts: {summary.get('posts_simulated', 0)}")
        print(f"Total live posts: {summary.get('posts_live', 0)}")
        return

    if args.task:
        config = load_config()
        q = TaskQueue()
        q.add("custom", {"command": args.task, "source": "cli"})
        print(f"Task injected: {args.task}")
        return

    if args.install:
        _install_windows_service()
        return

    if args.run:
        config = load_config()
        _foreman = Foreman(config)
        signal.signal(signal.SIGTERM, _handle_sigterm)
        signal.signal(signal.SIGINT, _handle_sigterm)
        _foreman.run()
        return

    parser.print_help()


def _install_windows_service():
    """Register Foreman as a Windows Scheduled Task (no admin needed)."""
    python_exe = sys.executable
    script = Path(__file__).resolve()
    cmd = f'schtasks /create /tn "Foreman" /tr "{python_exe} {script} --run" /sc onlogon /ru INTERACTIVE /f'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print("Foreman installed as startup task. Will run on next login.")
    else:
        print(f"Install failed: {result.stderr}")
        print("Try running PowerShell as admin and running the install again.")


if __name__ == "__main__":
    main()
