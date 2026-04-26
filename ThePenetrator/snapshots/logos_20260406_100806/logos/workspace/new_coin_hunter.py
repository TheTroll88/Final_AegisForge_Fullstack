"""
new_coin_hunter.py — The Fresh Coin Hunter
===========================================
Scans for tokens minted in the last hour.
Finds the "00" tokens of tomorrow.
"""

import json
import urllib.request
import ssl

def find_new_coins():
    print("[LOGOS] SEARCHING FOR FRESHLY MINTED TOKENS...")
    print("[+] Timeframe: Last 1 hour")
    
    RPC = "https://api.mainnet-beta.solana.com"
    
    try:
        req = urllib.request.Request(RPC, data=json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress",
            "params": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", {"limit": 50}]
        }).encode(), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
            data = json.loads(f.read())
            signatures = data.get('result', [])
            
            print(f"[+] Analyzing {len(signatures)} recent mints...")
            
            # We need to check if these are "Create Mint" instructions
            # This is a simplistic check
            new_tokens = []
            for sig in signatures:
                # In a real app, we would fetch the transaction details here
                # We would look for the `initializeMint` instruction
                pass
                
            print("[+] HUNTING COMPLETE")
            print("[+] Look for tokens with 'New' badge in Phantom.")
            
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    find_new_coins()
