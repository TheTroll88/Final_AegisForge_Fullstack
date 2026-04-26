#!/usr/bin/env python3
"""
LITCOIN Standalone Miner - v4.4.0
Comprehensive mining script for comprehension mining, research mining, and reward claiming.
Requires: Python 3.9+, requests, websocket-client, litcoin SDK
"""

import sys
import os
import argparse
import json
import time
from pathlib import Path
from datetime import datetime
import traceback

try:
    # Avoid Windows console encoding crashes when printing Unicode status symbols.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    from requests.exceptions import HTTPError
except Exception:
    HTTPError = Exception

try:
    from litcoin import Agent
except ImportError:
    print("ERROR: litcoin package not installed. Run: pip install litcoin")
    sys.exit(1)

# ==================== CONFIG ====================
CONFIG = {
    "BANKR_KEY": os.getenv("BANKR_API_KEY", os.getenv("BANKR_KEY", "")),
    "WALLET_ADDRESS": os.getenv("WALLET_ADDRESS", "0xE1AB13F5Db14279bfcA16D45C8ca06639b821d96"),
    "AI_API_KEY": os.getenv("AI_API_KEY", ""),
    "AI_URL": os.getenv("AI_URL", "http://localhost:8787/v1"),
    "MODEL": os.getenv("MODEL", "claude-opus-4-7"),
}

RUN_LOG_PATH = None


def init_diagnostics_log():
    """Create a per-run diagnostics file for precise error reporting."""
    global RUN_LOG_PATH
    logs_dir = Path("logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    RUN_LOG_PATH = logs_dir / f"miner_diagnostics_{stamp}.log"
    with open(RUN_LOG_PATH, "w", encoding="utf-8") as f:
        f.write(f"LITCOIN Miner Diagnostics\n")
        f.write(f"Started: {datetime.now().isoformat()}\n")
        f.write(f"Model: {CONFIG['MODEL']}\n")
        f.write(f"Wallet: {CONFIG.get('WALLET_ADDRESS', '')}\n")
        f.write("=" * 72 + "\n")


def _extract_http_error_details(exc):
    """Return detailed HTTP/API fields when available."""
    details = {}
    response = getattr(exc, "response", None)
    if response is None:
        return details

    details["http_status"] = getattr(response, "status_code", None)
    details["url"] = getattr(response, "url", None)
    details["reason"] = getattr(response, "reason", None)
    try:
        details["response_json"] = response.json()
    except Exception:
        text = getattr(response, "text", "") or ""
        details["response_text"] = text[:2000]
    return details


def log_issue(context, exc=None, extra=None):
    """Append a rich diagnostic record and return the log file path."""
    if RUN_LOG_PATH is None:
        init_diagnostics_log()

    payload = {
        "timestamp": datetime.now().isoformat(),
        "context": context,
        "exception_type": type(exc).__name__ if exc else None,
        "exception_message": str(exc) if exc else None,
        "extra": extra or {},
    }

    if exc:
        payload["traceback"] = traceback.format_exc()
        payload["http_details"] = _extract_http_error_details(exc)

    with open(RUN_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=True, default=str))
        f.write("\n")

    return RUN_LOG_PATH

def validate_config():
    """Ensure required config is set."""
    if not CONFIG["BANKR_KEY"]:
        log_file = log_issue("validate_config", extra={"reason": "BANKR_KEY missing"})
        print("\n❌ BANKR_KEY not configured.")
        print("   Option 1: Set environment variable:")
        print("      set BANKR_API_KEY=bk_YOUR_KEY")
        print("   Option 2: Edit CONFIG dict in this script")
        print("\n   Get a Bankr API key at: https://bankr.bot/api")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def explain_bankr_auth_error(e):
    """Print targeted guidance for common Bankr auth failures."""
    msg = str(e)
    if "Agent API access not enabled" in msg:
        print("\n⚠️  Bankr key is valid but Agent API access is disabled.")
        print("   Fix: open https://bankr.bot/api and enable Agent API access for this key.")
        print("   Then rerun the miner.")
        return True
    if "403" in msg and "api.bankr.bot/agent/me" in msg:
        print("\n⚠️  Bankr rejected the key for Agent API.")
        print("   Check key permissions at https://bankr.bot/api (enable Agent API access).")
        return True
    return False

def init_agent():
    """Initialize the Agent instance."""
    try:
        ai_url = CONFIG.get("AI_URL") or "http://localhost:8787/v1"
        model = CONFIG.get("MODEL") or "claude-opus-4-7"

        agent = Agent(
            bankr_key=CONFIG["BANKR_KEY"],
            ai_key=CONFIG["AI_API_KEY"] if CONFIG["AI_API_KEY"] else None,
            ai_url=ai_url,
            model=model,
        )
        return agent
    except Exception as e:
        log_file = log_issue("init_agent", e)
        print(f"❌ Failed to initialize Agent: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def try_auto_claim(agent, solve_count):
    """Attempt auto-claim if claimable balance is above a threshold."""
    try:
        status = agent.status()
        claimable = status.get("claimable", 0)
        if claimable and float(str(claimable).replace(",", "")) > 0:
            print(f"\n💰 Auto-claim: {claimable} LITCOIN claimable — claiming now...")
            agent.claim()
            print("✅ Claimed successfully")
    except Exception as e:
        log_issue("auto_claim", e, extra={"solve_count": solve_count})
        print(f"⚠️  Auto-claim failed (will retry next solve): {e}")


def comprehension_mine(rounds=0, max_failures=5):
    """Run comprehension mining (default). rounds=0 = infinite (handles cap/reset internally)."""
    print("\n🔨 Starting Comprehension Mining...")
    print(f"   Config: {CONFIG['BANKR_KEY'][:10]}... ({CONFIG['MODEL']})")
    print("   API: OpenAI gpt-4o-mini")
    print(f"   Bankr wallet: {CONFIG.get('WALLET_ADDRESS', '')}")
    if CONFIG.get("WALLET_ADDRESS"):
        print(f"   Wallet: {CONFIG['WALLET_ADDRESS']}")
    print(f"   Mode: {'infinite (rounds=0)' if rounds == 0 else f'{rounds} rounds'}")
    solve_count = [0]
    last_solve_ts = [time.time()]
    heartbeat_interval = 1800

    agent = init_agent()

    def on_solve(result):
        solve_count[0] += 1
        last_solve_ts[0] = time.time()
        passed = result.get("pass", False)
        reward = result.get("reward", 0)
        if passed:
            print(f"   ✓ Solve #{solve_count[0]}: +{reward} LITCOIN")
            # Auto-claim every 10 solves or when reward is large
            if solve_count[0] % 10 == 0 or float(str(reward).replace(",", "") or 0) >= 50:
                try_auto_claim(agent, solve_count[0])

    try:
        if rounds == 0:
            # Infinite mode with 30-minute heartbeat + liveness checks.
            while True:
                chunk_started = time.time()
                solves_before = solve_count[0]
                agent.mine(rounds=1, max_failures=max_failures, on_solve=on_solve)

                now = time.time()
                if now - chunk_started >= heartbeat_interval or now - last_solve_ts[0] >= heartbeat_interval:
                    print("   ⏱️  30m heartbeat: sleeping then checking status...")
                    time.sleep(1800)
                    try:
                        status = agent.status()
                        claimable = status.get("claimable", 0)
                        print(f"   📊 Status OK | solves={solve_count[0]} | claimable={claimable}")
                        if solve_count[0] == solves_before:
                            print("   ⚠️  Heartbeat detected no progress; restarting agent.")
                            agent = init_agent()
                        last_solve_ts[0] = now
                    except Exception as status_err:
                        print(f"   ⚠️  Heartbeat status check failed ({status_err}); restarting agent.")
                        agent = init_agent()
                        last_solve_ts[0] = now
        else:
            completed = 0
            while completed < rounds:
                agent.mine(rounds=1, max_failures=max_failures, on_solve=on_solve)
                completed += 1
                now = time.time()
                if now - last_solve_ts[0] >= heartbeat_interval:
                    print("   ⏱️  30m heartbeat: checking status...")
                    status = agent.status()
                    claimable = status.get("claimable", 0)
                    print(f"   📊 Status OK | solves={solve_count[0]} | claimable={claimable}")
                    last_solve_ts[0] = now

            print("\n✅ Mining session complete.")
            # Final claim attempt on clean exit
            try_auto_claim(agent, solve_count[0])
    except KeyboardInterrupt:
        print("\n⏹️  Mining stopped by user")
        try_auto_claim(agent, solve_count[0])
    except Exception as e:
        log_file = log_issue("comprehension_mine", e, extra={"rounds": rounds, "max_failures": max_failures})
        if explain_bankr_auth_error(e):
            print(f"   Diagnostics: {log_file}")
            sys.exit(1)
        print(f"\n❌ Mining error: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def research_mine(task_id=None, task_type=None):
    """Run a single research mining cycle."""
    print("\n🔬 Starting Research Mining...")
    print(f"   Config: {CONFIG['BANKR_KEY'][:10]}... ({CONFIG['MODEL']})")
    if not CONFIG.get("AI_API_KEY"):
        log_file = log_issue("research_mine_preflight", extra={"reason": "AI_API_KEY missing"})
        print("\n❌ Research mining requires AI_API_KEY.")
        print("   Set it in env or vault, then rerun:")
        print("   powershell -ExecutionPolicy Bypass -File secure_vault.ps1 -Action setprompt -Name AI_API_KEY")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)
    if CONFIG.get("WALLET_ADDRESS"):
        print(f"   Wallet: {CONFIG['WALLET_ADDRESS']}")
    agent = init_agent()
    
    try:
        result = agent.research_mine(task_id=task_id, task_type=task_type)
        print(f"\n✅ Research submission complete")
        print(f"   Task ID: {result.get('taskId', 'N/A')}")
        print(f"   Status: {result.get('status', 'pending')}")
        if 'reward' in result:
            print(f"   Earned: {result['reward']} LITCOIN")
    except TypeError:
        # Newer SDK signatures may differ
        agent.research_mine()
        print("\n✅ Research submission complete")
    except KeyboardInterrupt:
        print("\n⏹️  Mining stopped by user")
    except Exception as e:
        log_file = log_issue("research_mine", e, extra={"task_id": task_id, "task_type": task_type})
        print(f"\n❌ Research mining error: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def research_loop(task_id=None, rounds=0, delay=30):
    """Iterate on a single research task (Karpathy-style)."""
    print("\n🔬 Starting Research Loop (Iteration Mode)...")
    print(f"   API: OpenAI gpt-4o-mini")
    print(f"   Bankr wallet: {CONFIG.get('WALLET_ADDRESS', '')}")
    print(f"   Task: {task_id if task_id else 'auto'}")
    print(f"   Rounds: {'infinite' if rounds == 0 else rounds}")
    print(f"   Delay: {delay}s between rounds")
    agent = init_agent()
    
    try:
        if task_id:
            agent.research_loop(task_id=task_id, rounds=rounds, delay=delay)
        else:
            try:
                agent.research_loop(rounds=rounds, delay=delay)
            except TypeError:
                # Older SDKs may require explicit task_id keyword, pass None.
                agent.research_loop(task_id=None, rounds=rounds, delay=delay)
        print("\n✅ Research loop complete")
    except KeyboardInterrupt:
        print("\n⏹️  Loop stopped by user")
    except Exception as e:
        log_file = log_issue("research_loop", e, extra={"task_id": task_id, "rounds": rounds, "delay": delay})
        print(f"\n❌ Research loop error: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def claim_rewards():
    """Claim accumulated mining rewards on-chain."""
    print("\n💰 Claiming Rewards...")
    agent = init_agent()
    
    try:
        # Check balance first
        status = agent.status()
        print(f"   Claimable: {status.get('claimable', 0)} LITCOIN")
        
        if not status.get('claimable', 0):
            print("   ℹ️  No claimable rewards yet")
            return
        
        agent.claim()
        print("\n✅ Rewards claimed successfully")
        
        # Verify on-chain
        time.sleep(2)
        new_status = agent.status()
        print(f"   New claimable: {new_status.get('claimable', 0)} LITCOIN")
    except KeyboardInterrupt:
        print("\n⏹️  Claim cancelled")
    except Exception as e:
        log_file = log_issue("claim_rewards", e)
        print(f"\n❌ Claim error: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def show_status():
    """Display miner status and earnings."""
    print("\n📊 Miner Status...")
    agent = init_agent()
    
    try:
        status = agent.status()
        print(json.dumps(status, indent=2))
    except Exception as e:
        log_file = log_issue("show_status", e)
        print(f"❌ Error fetching status: {e}")
        print(f"   Diagnostics: {log_file}")
        sys.exit(1)

def main():
    init_diagnostics_log()
    parser = argparse.ArgumentParser(
        description="LITCOIN Standalone Miner v4.4.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python litcoin_miner.py                                # Comprehension mining
    python litcoin_miner.py --research                     # Research loop (default infinite)
  python litcoin_miner.py --research --task=tokenizer-001  # Research mining (specific task)
    python litcoin_miner.py --loop --task=tokenizer-001 --rounds=50  # Iterate on task
    python litcoin_miner.py --arbitrage                    # Alias to research loop
  python litcoin_miner.py --claim                        # Claim rewards
  python litcoin_miner.py --status                       # Show earnings
        """
    )
    
    parser.add_argument("--research", action="store_true", help="Run research mining instead of comprehension")
    parser.add_argument("--loop", action="store_true", help="Iterate in research loop mode (task optional)")
    parser.add_argument("--arbitrage", action="store_true", help="Alias for research loop mode")
    parser.add_argument("--task", type=str, help="Task ID for research mining (e.g., tokenizer-001)")
    parser.add_argument("--rounds", type=int, default=0, help="Rounds for research loop (0=infinite, default: 0)")
    parser.add_argument("--delay", type=int, default=30, help="Delay between iterations in seconds (default: 30)")
    parser.add_argument("--claim", action="store_true", help="Claim accumulated rewards on-chain")
    parser.add_argument("--status", action="store_true", help="Show miner status and earnings")
    parser.add_argument("--rounds-comp", type=int, default=0, help="Rounds for comprehension mining (0=infinite, default: 0)")
    
    args = parser.parse_args()
    
    # Validate config
    validate_config()

    print("\n🚀 LITCOIN Miner startup")
    print("   API: OpenAI gpt-4o-mini")
    print(f"   Bankr wallet: {CONFIG.get('WALLET_ADDRESS', '')}")
    
    # Route to appropriate function
    if args.claim:
        claim_rewards()
    elif args.status:
        show_status()
    elif args.research or args.loop or args.arbitrage:
        # Default research behavior: loop mode, infinite rounds, optional task.
        research_loop(task_id=args.task, rounds=args.rounds, delay=args.delay)
    else:
        # Default: comprehension mining
        comprehension_mine(rounds=args.rounds_comp)

if __name__ == "__main__":
    main()
