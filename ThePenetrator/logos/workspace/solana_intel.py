"""
solana_intel.py — Asset Intel Collector
=======================================
Fetches token balances and metadata for targets without moving funds.
"""

import json, urllib.request, ssl

targets = [
    "EEkH2ZkoKNfZbyvvd5esPHwiPFx8vSDPKReVeSmR6cX", # Pixel Coin
    "BJYVc3TGQphXkCqaUEh17x5R2tfmyM6sRkaEpd4hnQEw"  # PumpPerps
]

RPC = f"https://solana-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn"

print(f"{'='*30} TARGET INTEL {'='*30}")

for addr in targets:
    print(f"\n--- Wallet: {addr[:8]}... ---")
    
    # 1. SOL Balance
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [addr, {"encoding": "base64"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as f:
        bal = json.loads(f.read())['result']['value']
        print(f"SOL: {bal/1e9:.4f}")
        
        if bal < 1000000:
            print(f"  WARNING: Low balance for fees!")
            
    # 2. Token Accounts
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getTokenAccountsByOwner", 
        "params": [addr, {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}, {"encoding": "jsonParsed"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as f:
        data = json.loads(f.read())
        tokens = data['result']['value']
        
        print(f"TOKENS: {len(tokens)}")
        
        for t in tokens:
            info = t['account']['data']['parsed']['info']
            mint = info['mint']
            bal_str = info['tokenAmount']['uiAmountString']
            dec = info['tokenAmount']['decimals']
            
            # Check if it's a "Pixel Coin" or "PumpPerps" token
            is_target = "Pixel" in mint[:20] or "Pump" in mint[:20]
            status = "[TARGET]" if is_target else "[OTHER]"
            
            print(f"  {status} {mint[:8]}... Bal: {bal_str} (dec: {dec})")

print(f"\n{'='*30} INTEL COMPLETE {'='*30}")
