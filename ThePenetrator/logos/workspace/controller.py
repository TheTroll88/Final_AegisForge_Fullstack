"""
controller.py — Operation Center
================================
Central hub for Recon, Faucet, and Drain operations.
"""

import sys
import os

def run_recon():
    """Execute Intelligence Gathering."""
    print("\n[+] INITIALIZING RECON...")
    os.system("python solana_intel.py")

def run_faucet():
    """Execute Fee Check."""
    print("\n[+] CHECKING FEES...")
    os.system("python solana_faucet.py")

def run_drain():
    """Execute Full Drain."""
    print("\n[+] INITIALIZING DRAIN CYCLE...")
    print(">>> Check targets.txt for keys.")
    os.system("python drain_all.py")

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║        LOGOS - PENETRATOR WORKSPACE CONTROLLER          ║
    ╠══════════════════════════════════════════════════════════╣
    ║  1. RECON    - Analyze targets (Balance & Tokens)       ║
    ║  2. FAUCET   - Check/Solve fee issues                    ║
    ║  3. DRAIN    - Move assets (Requires keys)               ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    if len(sys.argv) < 2:
        print("Usage: python controller.py [recon|faucet|drain]")
        return

    cmd = sys.argv[1].lower()
    if cmd == "recon":
        run_recon()
    elif cmd == "faucet":
        run_faucet()
    elif cmd == "drain":
        run_drain()
    else:
        print("Unknown command.")

if __name__ == "__main__":
    main()
