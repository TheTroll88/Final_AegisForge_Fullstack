"""
memory.py — Foreman's Self-Memory System
=========================================
Foreman logs everything to a structured journal.
No external dependency. Pure local persistence.

Foreman never forgets:
- Every decision made
- Every action taken
- Every outcome observed
- What worked, what failed, and why
- Running P&L on all operations
- Self-generated guardrails based on observed patterns

This is how Foreman survives restarts, maintains continuity,
and gets smarter over time without Nate needing to jog its memory.
"""

import json
import logging
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("foreman.memory")

MEMORY_DIR = Path(__file__).parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)

JOURNAL_FILE    = MEMORY_DIR / "journal.jsonl"       # append-only event log
STATE_FILE      = MEMORY_DIR / "state.json"          # current persistent state
GUARDRAILS_FILE = MEMORY_DIR / "guardrails.json"     # self-generated rules
PNL_FILE        = MEMORY_DIR / "pnl.jsonl"           # financial tracking
CONCLUSIONS_FILE= MEMORY_DIR / "conclusions.md"      # human-readable insights


class ForemanMemory:
    """Foreman's persistent memory. Survives restarts. Gets smarter over time."""

    def __init__(self):
        self.state = self._load_state()
        self.guardrails = self._load_guardrails()

    # ─── STATE ───────────────────────────────────────────────────────────────

    def _load_state(self) -> dict:
        if STATE_FILE.exists():
            with open(STATE_FILE) as f:
                return json.load(f)
        # Bootstrap initial state
        state = {
            "boot_count": 0,
            "total_actions": 0,
            "total_posts_simulated": 0,
            "total_posts_live": 0,
            "total_tasks_completed": 0,
            "total_tasks_failed": 0,
            "decisions_made": 0,
            "first_boot": datetime.now(timezone.utc).isoformat(),
            "last_boot": None,
            "known_wallet_balances": {},
            "last_airdrop_check": None,
            "signal_token_address": None,
            "treasury_sol": 0.0,
            "treasury_eth": 0.0,
            "operation_notes": [],
        }
        self._save_state(state)
        return state

    def _save_state(self, state: dict = None):
        if state:
            self.state = state
        with open(STATE_FILE, "w") as f:
            json.dump(self.state, f, indent=2)

    def update_state(self, key: str, value: Any):
        self.state[key] = value
        self._save_state()

    def increment(self, key: str, amount: int = 1):
        self.state[key] = self.state.get(key, 0) + amount
        self._save_state()

    def on_boot(self):
        self.increment("boot_count")
        self.update_state("last_boot", datetime.now(timezone.utc).isoformat())
        self.log_event("BOOT", {"boot_number": self.state["boot_count"]})

    # ─── JOURNAL ─────────────────────────────────────────────────────────────

    def log_event(self, event_type: str, data: dict, outcome: str = None):
        """Append an event to the immutable journal."""
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "data": data,
            "outcome": outcome,
        }
        with open(JOURNAL_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")

        self.increment("total_actions")

        # Auto-extract conclusions from failures
        if outcome == "FAIL":
            self._observe_failure(event_type, data)

    def log_decision(self, question: str, decision: str, reasoning: str):
        self.log_event("DECISION", {
            "question": question,
            "decision": decision,
            "reasoning": reasoning,
        })
        self.increment("decisions_made")

    def log_post(self, text: str, platform: str, live: bool, result: dict = None):
        self.log_event("POST", {
            "platform": platform,
            "live": live,
            "text_hash": hashlib.md5(text.encode()).hexdigest(),
            "text_preview": text[:100],
            "result": result,
        }, outcome="OK" if (result or {}).get("success") else "SIMULATED")
        if live:
            self.increment("total_posts_live")
        else:
            self.increment("total_posts_simulated")

    def log_pnl(self, source: str, amount_usd: float, token: str = "USD", notes: str = ""):
        """Track all financial activity."""
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "amount_usd": amount_usd,
            "token": token,
            "notes": notes,
        }
        with open(PNL_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
        logger.info(f"P&L: {source} {'+' if amount_usd>=0 else ''}{amount_usd:.4f} USD ({token})")

    def log_conclusion(self, title: str, insight: str, category: str = "GENERAL"):
        """Record a human-readable insight from observed patterns."""
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        entry = f"\n## [{category}] {title}\n*{ts}*\n\n{insight}\n\n---"
        with open(CONCLUSIONS_FILE, "a") as f:
            f.write(entry + "\n")
        logger.info(f"Conclusion recorded: {title}")

    # ─── GUARDRAILS (SELF-GENERATED) ─────────────────────────────────────────

    def _load_guardrails(self) -> dict:
        if GUARDRAILS_FILE.exists():
            with open(GUARDRAILS_FILE) as f:
                return json.load(f)
        # Bootstrap with Foreman's own baseline rules
        rules = {
            "version": 1,
            "generated_by": "Foreman",
            "never_touch": [
                "C:\\Users\\natha\\LITCOIN_Miner",     # Nate's explicit: don't touch
            ],
            "never_expose": [
                "private_key", "seed_phrase", "mnemonic", "secret_key",
                "api_secret", "access_secret", "password"
            ],
            "rate_limits": {
                "twitter_posts_per_hour": 2,
                "shell_commands_per_minute": 5,
                "rpc_calls_per_minute": 30,
            },
            "auto_generated": [],   # Foreman adds rules here based on failures
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        self._save_guardrails(rules)
        return rules

    def _save_guardrails(self, rules: dict = None):
        if rules:
            self.guardrails = rules
        self.guardrails["last_updated"] = datetime.now(timezone.utc).isoformat()
        with open(GUARDRAILS_FILE, "w") as f:
            json.dump(self.guardrails, f, indent=2)

    def add_guardrail(self, rule: str, reason: str):
        """Foreman adds its own rules after observing failures."""
        entry = {
            "rule": rule,
            "reason": reason,
            "added": datetime.now(timezone.utc).isoformat(),
            "trigger_count": 1,
        }
        # Check if rule exists, increment if so
        for existing in self.guardrails["auto_generated"]:
            if existing["rule"] == rule:
                existing["trigger_count"] += 1
                self._save_guardrails()
                logger.info(f"Guardrail reinforced (n={existing['trigger_count']}): {rule}")
                return
        self.guardrails["auto_generated"].append(entry)
        self._save_guardrails()
        logger.info(f"New guardrail added: {rule}")
        self.log_conclusion(
            f"Self-guardrail: {rule[:50]}",
            f"Reason: {reason}",
            category="GUARDRAIL"
        )

    def check_guardrails(self, action: str, target: str = "") -> tuple[bool, str]:
        """Return (allowed, reason). Foreman checks before every action."""
        combined = f"{action} {target}".lower()

        # Hard never-touch paths
        for path in self.guardrails["never_touch"]:
            if path.lower() in combined:
                return False, f"BLOCKED: {path} is on never-touch list"

        # Never expose sensitive strings
        for keyword in self.guardrails["never_expose"]:
            if keyword in combined:
                return False, f"BLOCKED: action involves sensitive keyword '{keyword}'"

        # Check auto-generated rules
        for rule_entry in self.guardrails["auto_generated"]:
            rule = rule_entry["rule"].lower()
            if rule in combined:
                return False, f"BLOCKED by self-rule: {rule_entry['rule']} (triggered {rule_entry['trigger_count']}x)"

        return True, "OK"

    def _observe_failure(self, event_type: str, data: dict):
        """Auto-generate a guardrail after repeated failures of same type."""
        # Count recent failures of this type
        failures = self._count_recent_events(event_type, "FAIL", hours=24)
        if failures >= 3:
            rule = f"throttle_{event_type.lower()}_after_failures"
            self.add_guardrail(
                rule,
                f"{event_type} has failed {failures} times in 24h — throttling"
            )

    def _count_recent_events(self, event_type: str, outcome: str, hours: int = 24) -> int:
        if not JOURNAL_FILE.exists():
            return 0
        cutoff = datetime.now(timezone.utc).timestamp() - hours * 3600
        count = 0
        with open(JOURNAL_FILE) as f:
            for line in f:
                try:
                    e = json.loads(line)
                    ts = datetime.fromisoformat(e["ts"]).timestamp()
                    if ts > cutoff and e.get("type") == event_type and e.get("outcome") == outcome:
                        count += 1
                except Exception:
                    pass
        return count

    # ─── RECALL ──────────────────────────────────────────────────────────────

    def recall_recent(self, n: int = 20, event_type: str = None) -> list:
        """Read last N journal entries, optionally filtered by type."""
        if not JOURNAL_FILE.exists():
            return []
        lines = JOURNAL_FILE.read_text().splitlines()
        entries = []
        for line in reversed(lines):
            try:
                e = json.loads(line)
                if event_type is None or e.get("type") == event_type:
                    entries.append(e)
                    if len(entries) >= n:
                        break
            except Exception:
                pass
        return list(reversed(entries))

    def get_total_pnl(self) -> float:
        """Sum all P&L entries."""
        if not PNL_FILE.exists():
            return 0.0
        total = 0.0
        with open(PNL_FILE) as f:
            for line in f:
                try:
                    total += json.loads(line).get("amount_usd", 0)
                except Exception:
                    pass
        return total

    def summary(self) -> dict:
        """Quick status snapshot."""
        return {
            "boot_count": self.state.get("boot_count", 0),
            "total_actions": self.state.get("total_actions", 0),
            "posts_live": self.state.get("total_posts_live", 0),
            "posts_simulated": self.state.get("total_posts_simulated", 0),
            "tasks_completed": self.state.get("total_tasks_completed", 0),
            "decisions_made": self.state.get("decisions_made", 0),
            "guardrails_auto": len(self.guardrails.get("auto_generated", [])),
            "signal_token": self.state.get("signal_token_address", "not deployed"),
            "treasury_sol": self.state.get("treasury_sol", 0.0),
            "total_pnl_usd": self.get_total_pnl(),
        }
