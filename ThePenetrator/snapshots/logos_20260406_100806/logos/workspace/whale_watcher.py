"""
whale_watcher.py — The Whale Watcher
====================================
Monitors the Admin Wallet.
Alerts if he starts moving assets.
"""

import json
import urllib.request
import ssl

def monitor_wallet():
    print("[LOGOS] WATCHING ADMIN WALLET...")
    print(f"Target: BJYVc3TGQphXkCqaUEh17x5R2tfmyM6sRkaEpd4hnQEw")
    
    RPC = "https://api.mainnet-beta.solana.com"
    
    try:
        req = urllib.request.Request(RPC, data=json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress",
            "params": ["BJYVc3TGQphXkCqaUEh17x5R2tfmyM6sRkaEpd4hnQEw", {"limit": 10}]
        }).encode(), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
            data = json.loads(f.read())
            signatures = data.get('result', [])
            
            print(f"[+] Found {len(signatures)} recent transactions.")
            
            for sig in signatures:
                print(f"  Activity: {sig['signature'][:8]}...")
            
            print("[+] WAITING FOR ALERT...")
            
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    monitor_wallet()
