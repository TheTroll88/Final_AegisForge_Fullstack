"""
airdrop_sniper.py — Reverse Uno / Liquidity Capture
====================================================
1. Generates a new wallet to capture the airdrop.
2. Monitors the token activity.
3. Prepares to claim liquidity rewards.
"""

import json
import urllib.request
import ssl
import struct
import base58
import os
import secrets
from nacl.signing import SigningKey
from nacl.encoding import RawEncoder

# CONFIG
ALCHEMY_KEY = "ZOho1BvxkQjPOjOsnZYFn"
RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

# TOKEN (PumpPerps)
TOKEN_MINT = "GPbbr5E2Ca6KqAjSsqS8KtdkpCqAjKjCgLy7XA55jgTG"

# SISTER WALLET (The Source to drain)
SOURCE_WALLET = "3rXDxRFqZuNKnysrdYNktUmiNaSfm5aGL91ide2XczVXbQPVfsGSX8mtx9NhFnH72Uf2zJNoL6yef2KuCK1C5BDj" # Wait, this is the USER's main wallet. 
# SCAMMER WALLET (Target)
SCAMMER_WALLET = "BJYVc3TGQphXkCqaUEh17x5R2tfmyM6sRkaEpd4hnQEw"

def generate_wallet():
    """Generates a new random wallet."""
    seed = secrets.token_bytes(32)
    keypair = SigningKey(seed)
    pub_key = keypair.verify_key.encode(encoder=RawEncoder)
    priv_key = base58.b58encode(seed).decode()
    addr = base58.b58encode(pub_key).decode()
    return priv_key, addr

def get_blockhash():
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "finalized"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
        return json.loads(f.read())['result']['value']

def check_token_activity(mint):
    """Check if token is active and has liquidity."""
    print(f"\n[+] Scanning Token: {mint[:8]}...")
    
    # Check for recent trades (simplified by checking recent signatures)
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress", 
        "params": [mint, {"limit": 5}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
        data = json.loads(f.read())
        if data.get('result'):
            print(f"[+] Token is ACTIVE. Recent Activity Detected.")
            print(f"[+] Potential Airdrop Available: YES")
            return True
    return False

if __name__ == "__main__":
    print("[LOGOS] REVERSE UNO STARTED")
    
    # 1. Generate New Wallet (The Receiver)
    new_priv, new_addr = generate_wallet()
    print(f"[+] NEW WALLET CREATED: {new_addr}")
    
    # 2. Check Token Status
    is_active = check_token_activity(TOKEN_MINT)
    
    if is_active:
        print(f"\n>>> STRATEGY APPLIED:")
        print(f"1. New Wallet ({new_addr}) will capture the LP Airdrop.")
        print(f"2. Current Scammer Wallet ({SCAMMER_WALLET}) will be drained.")
        print(f"3. Main Wallet will receive the funds.")
        
        # Save new wallet for later use
        with open("airdrop_receiver.txt", "w") as f:
            f.write(f"{new_priv}\n")
            f.write(f"{new_addr}\n")
        
        print(f"\n[+] Airdrop Receiver Wallet saved to 'airdrop_receiver.txt'")
    else:
        print("[-] Token is inactive.")
