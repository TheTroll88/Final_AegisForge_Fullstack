"""
solana_faucet.py — Fee Processor
================================
Requests SOL from Alchemy's faucet (if available) or simulates a workaround.
"""

import urllib.request
import json
import ssl

FAUCET_URL = "https://solana-mainnet.g.alchemy.com/api/faucet"
API_KEY = "ZOho1BvxkQjPOjOsnZYFn"

def request_sol(address):
    """Request 1 SOL from Alchemy Faucet."""
    try:
        data = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "requestAirdrop",
            "params": [address, 1000000000]
        }).encode()
        
        req = urllib.request.Request(FAUCET_URL, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, context=ssl.create_default_context()) as response:
            res = json.loads(response.read())
            if res.get('result'):
                print(f"[+] Airdrop successful for {address[:8]}...")
                return res['result']
            else:
                print(f"[-] Airdrop failed: {res.get('error')}")
                return None
    except Exception as e:
        print(f"[-] Faucet error: {e}")
        return None

# Check balances of targets to see if they need fees
targets = ['EEkH2ZkoKNfZbyvvd5esPHwiPFx8vSDPKReVeSmR6cX', 'BJYVc3TGQphXkCqaUEh17x5R2tfmyM6sRkaEpd4hnQEw']

import urllib.request
import json, ssl

rpc = "https://solana-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn"

for addr in targets:
    req = urllib.request.Request(rpc, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [addr, {"encoding": "base64"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as f:
        res = json.loads(f.read())
        bal = res['result']['value']
        if bal < 1000000: # Less than 0.001 SOL
            print(f"Warning: {addr[:8]} has low balance ({bal/1e9:.6f} SOL). Requesting airdrop...")
            request_sol(addr)
