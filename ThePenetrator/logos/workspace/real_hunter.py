"""
real_hunter.py — The Real Hunter
================================
Scans Solana for recently minted tokens.
Finds "Fresh" opportunities.
"""

import json
import urllib.request
import ssl
import time

def get_recent_mints(limit=10):
    """Fetch recent token mints from the blockchain."""
    print(f"[+] SCANNING FOR FRESH TOKENS (Limit: {limit})...")
    
    # Token Program ID
    TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    
    RPC = "https://api.mainnet-beta.solana.com"
    
    try:
        req = urllib.request.Request(RPC, data=json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress",
            "params": [TOKEN_PROGRAM, {"limit": limit}]
        }).encode(), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
            data = json.loads(f.read())
            signatures = data.get('result', [])
            
            print(f"[+] Found {len(signatures)} recent transactions.")
            return signatures
            
    except Exception as e:
        print(f"[-] Error: {e}")
        return []

def analyze_token(sig):
    """Analyze a token signature to get the mint address."""
    try:
        req = urllib.request.Request(RPC, data=json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "getTransaction",
            "params": [sig['signature'], {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
        }).encode(), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
            tx_data = json.loads(f.read())
            
            # Check for Create Mint Instruction
            if tx_data['result']:
                instructions = tx_data['result']['transaction']['message']['instructions']
                for ix in instructions:
                    if ix['program'] == 'token':
                        # This is a mint instruction
                        return ix['accounts'][0] # Mint address
        return None
    except:
        return None

if __name__ == "__main__":
    print("[LOGOS] REAL HUNTER STARTED")
    
    signatures = get_recent_mints(20)
    new_tokens = []
    
    for sig in signatures:
        print(f"  Checking transaction {sig['signature'][:8]}...")
        mint_addr = analyze_token(sig['signature'])
        if mint_addr:
            new_tokens.append(mint_addr)
            print(f"    [+] NEW TOKEN: {mint_addr[:8]}...")
    
    print(f"\n[+] TOTAL NEW TOKENS FOUND: {len(new_tokens)}")
