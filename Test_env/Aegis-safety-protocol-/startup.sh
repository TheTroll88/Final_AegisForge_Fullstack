#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

if pgrep -f "aegis_terminal.py" >/dev/null 2>&1; then
  echo "Aegis ghost already running."
  exit 0
fi

nohup python3 "$ROOT/aegis_terminal.py" > "$LOG_DIR/aegis_terminal_output.log" 2>&1 &
echo "Aegis ghost started. Logs: $LOG_DIR/aegis_terminal_output.log"
