#!/usr/bin/env python3
import os
import subprocess
from datetime import datetime
import json

ROOT = os.path.abspath(os.path.dirname(__file__))
LOG_DIR = os.path.join(ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
TERMINAL_LOG = os.path.join(LOG_DIR, "aegis_terminal.log")
REPLAY_LOG = os.path.join(LOG_DIR, "ghost_replay.log")
DEV_LOG = os.path.join(LOG_DIR, "npm_dev.log")

DEV_PROCESS = None
DEV_LOG_HANDLE = None


def now():
    return datetime.utcnow().isoformat() + "Z"


def write(msg: str):
    line = f"[{now()}] {msg}\n"
    with open(TERMINAL_LOG, "a", encoding="utf-8") as f:
        f.write(line)
    with open(REPLAY_LOG, "a", encoding="utf-8") as f:
        f.write(line)


def run_shell(cmd: str):
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True, cwd=ROOT)
        return out.strip()
    except subprocess.CalledProcessError as e:
        return f"ERROR[{e.returncode}]: {e.output.strip()}"


def detect_dev_command():
    pkg = os.path.join(ROOT, "package.json")
    if os.path.exists(pkg):
        try:
            with open(pkg, "r", encoding="utf-8") as f:
                data = json.load(f)
            scripts = data.get("scripts", {})
            if "dev" in scripts:
                return ["npm", "run", "dev"], "npm run dev"
            if "start" in scripts:
                return ["npm", "start"], "npm start"
        except Exception:
            pass

    webpack_cfg = os.path.join(ROOT, "webpack.config.js")
    if os.path.exists(webpack_cfg):
        return ["npx", "webpack", "serve", "--config", "webpack.config.js", "--mode", "development", "--port", "3000"], "npx webpack serve"

    return None, "No frontend start command found"


def start_dev_server():
    global DEV_PROCESS, DEV_LOG_HANDLE
    if DEV_PROCESS and DEV_PROCESS.poll() is None:
        return "Dev server is already running."

    cmd, label = detect_dev_command()
    if not cmd:
        return label

    DEV_LOG_HANDLE = open(DEV_LOG, "a", encoding="utf-8")
    DEV_LOG_HANDLE.write(f"\n[{now()}] Starting {label}\n")
    DEV_LOG_HANDLE.flush()

    DEV_PROCESS = subprocess.Popen(
        cmd,
        cwd=ROOT,
        stdout=DEV_LOG_HANDLE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=False,
    )
    write(f"Started {label} (pid={DEV_PROCESS.pid})")
    return f"Started {label} in background (pid={DEV_PROCESS.pid})."


def stop_dev_server():
    global DEV_PROCESS, DEV_LOG_HANDLE
    if not DEV_PROCESS or DEV_PROCESS.poll() is not None:
        DEV_PROCESS = None
        if DEV_LOG_HANDLE:
            DEV_LOG_HANDLE.close()
            DEV_LOG_HANDLE = None
        return "npm run dev is not running."

    DEV_PROCESS.terminate()
    try:
        DEV_PROCESS.wait(timeout=8)
    except subprocess.TimeoutExpired:
        DEV_PROCESS.kill()
        DEV_PROCESS.wait(timeout=5)

    write("Stopped npm run dev")
    if DEV_LOG_HANDLE:
        DEV_LOG_HANDLE.write(f"[{now()}] Stopped npm run dev\n")
        DEV_LOG_HANDLE.close()
        DEV_LOG_HANDLE = None

    DEV_PROCESS = None
    return "Stopped npm run dev."


def run_audit():
    script = os.path.join(ROOT, "scripts", "full_audit.ps1")
    if not os.path.exists(script):
        return f"Audit script not found: {script}"
    cmd = f'powershell -ExecutionPolicy Bypass -File "{script}"'
    return run_shell(cmd)


def print_help():
    print("Commands: help, status, dev start, dev stop, dev status, audit, ports, run <cmd>, exit")


def main():
    print("Aegis terminal ready.")
    write("Aegis terminal started")

    while True:
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print(stop_dev_server())
            write("Aegis terminal exited")
            break

        if not line:
            continue

        cmd = line.lower()

        if cmd in ["exit", "quit"]:
            print(stop_dev_server())
            write("Exit command")
            break
        elif cmd in ["help", "?"]:
            print_help()
        elif cmd == "status":
            dev_state = "running" if (DEV_PROCESS and DEV_PROCESS.poll() is None) else "stopped"
            print(f"alive | npm dev: {dev_state}")
        elif cmd in ["dev start", "start dev", "start"]:
            print(start_dev_server())
        elif cmd in ["dev stop", "stop dev", "stop"]:
            print(stop_dev_server())
        elif cmd in ["dev status", "status dev"]:
            dev_state = "running" if (DEV_PROCESS and DEV_PROCESS.poll() is None) else "stopped"
            print(f"npm run dev: {dev_state}")
        elif cmd == "audit":
            print(run_audit())
        elif cmd == "ports":
            print(run_shell("netstat -ano | findstr LISTENING"))
        elif cmd.startswith("run "):
            print(run_shell(line[4:]))
        else:
            print("Unknown command. Type help.")


if __name__ == "__main__":
    main()