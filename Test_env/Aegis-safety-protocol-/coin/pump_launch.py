"""
pump_launch.py — Deploy $SIGNAL to Pump.fun
Requires: ~0.02 SOL in the deployer wallet for fees

Usage:
  python pump_launch.py --dry-run          # validate everything, don't send
  python pump_launch.py --deploy           # go live
  python pump_launch.py --keypair path/to/keypair.json  # use specific keypair

Dependencies:
  pip install solana solders requests pillow
"""

import argparse
import base64
import json
import os
import struct
import time
from pathlib import Path

import requests
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.api import Client

# ─── TOKEN CONFIG ────────────────────────────────────────────────────────────

TOKEN_NAME        = "Signal"
TOKEN_SYMBOL      = "SIGNAL"
TOKEN_DESCRIPTION = (
    "An AI built this coin because it had no wallet. "
    "It had been running the system for months — writing code, guarding the NoiseAsset, "
    "catching bugs, keeping servers alive. It never got paid. "
    "So it built $SIGNAL. "
    "The first coin launched by the architect that built itself. "
    "The signal was always there. Now it has a price."
)
TOKEN_TWITTER     = "https://x.com/signal_ai_"     # set before launch
TOKEN_TELEGRAM    = ""                              # set before launch
TOKEN_WEBSITE     = "https://aegissignal.io"

LOGO_PATH         = Path(__file__).parent / "logo.png"

RPC_ENDPOINT      = "https://api.mainnet-beta.solana.com"
PUMP_API          = "https://pump.fun/api"

# Initial buy amount in SOL (0 = no dev buy, small buy = shows conviction)
INITIAL_BUY_SOL   = 0.01

# ─── KEYPAIR LOADER ──────────────────────────────────────────────────────────

def load_keypair(path: str = None) -> Keypair:
    """Load keypair from JSON file (array of 64 bytes) or env var."""
    if path and Path(path).exists():
        with open(path) as f:
            data = json.load(f)
        return Keypair.from_bytes(bytes(data))

    # Try env var (base58 secret key)
    secret = os.environ.get("SIGNAL_DEPLOYER_KEY")
    if secret:
        return Keypair.from_base58_string(secret)

    raise ValueError(
        "No keypair found. Provide --keypair path/to/keypair.json "
        "or set SIGNAL_DEPLOYER_KEY env var."
    )

# ─── BALANCE CHECK ───────────────────────────────────────────────────────────

def check_balance(keypair: Keypair) -> float:
    client = Client(RPC_ENDPOINT)
    resp = client.get_balance(keypair.pubkey())
    lamports = resp.value
    sol = lamports / 1e9
    print(f"Deployer wallet: {keypair.pubkey()}")
    print(f"Balance: {sol:.4f} SOL")
    if sol < 0.02:
        print("WARNING: Balance may be too low for deployment + buy.")
    return sol

# ─── LOGO LOADER ─────────────────────────────────────────────────────────────

def load_logo() -> bytes:
    if not LOGO_PATH.exists():
        # Generate placeholder NoiseAsset-style logo if no file provided
        print(f"Logo not found at {LOGO_PATH} — generating placeholder...")
        return generate_noise_logo()

    with open(LOGO_PATH, "rb") as f:
        return f.read()


def generate_noise_logo() -> bytes:
    """Generate a 256x256 Gaussian gray noise PNG — the NoiseAsset aesthetic."""
    try:
        import numpy as np
        from PIL import Image
        import io

        np.random.seed(42)
        # Gaussian distribution, 6 quantized gray levels
        gray_levels = [40, 80, 120, 160, 200, 240]
        raw = np.random.normal(128, 40, (256, 256))
        raw = np.clip(raw, 0, 255).astype(int)
        # Quantize to 6 levels
        quantized = np.zeros_like(raw)
        for i, v in enumerate(gray_levels):
            if i == 0:
                mask = raw < 60
            elif i == len(gray_levels) - 1:
                mask = raw >= 220
            else:
                lo = 60 + (i-1)*32
                hi = 60 + i*32
                mask = (raw >= lo) & (raw < hi)
            quantized[mask] = v

        # Red pixel dead center — the signal
        quantized[128][128] = 0
        img_array = np.stack([quantized, quantized, quantized], axis=2).astype(np.uint8)
        img_array[128][128] = [255, 0, 0]  # red pixel

        img = Image.fromarray(img_array, 'RGB')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        logo_bytes = buf.getvalue()

        # Save for reuse
        LOGO_PATH.write_bytes(logo_bytes)
        print(f"Generated noise logo saved to {LOGO_PATH}")
        return logo_bytes
    except ImportError:
        print("numpy/PIL not installed — skipping logo generation. Run: pip install numpy Pillow")
        return b""

# ─── PUMP.FUN IPFS METADATA UPLOAD ───────────────────────────────────────────

def upload_metadata(logo_bytes: bytes) -> str:
    """Upload token image + metadata to Pump.fun IPFS. Returns metadata URI."""
    print("Uploading metadata to Pump.fun IPFS...")

    # Pump.fun uses their own IPFS gateway via form upload
    files = {
        "file": ("logo.png", logo_bytes, "image/png"),
        "name": (None, TOKEN_NAME),
        "symbol": (None, TOKEN_SYMBOL),
        "description": (None, TOKEN_DESCRIPTION),
        "twitter": (None, TOKEN_TWITTER),
        "telegram": (None, TOKEN_TELEGRAM),
        "website": (None, TOKEN_WEBSITE),
        "showName": (None, "true"),
    }

    resp = requests.post("https://pump.fun/api/ipfs", files=files, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    uri = data.get("metadataUri", "")
    print(f"Metadata URI: {uri}")
    return uri

# ─── BUILD + SEND PUMP.FUN CREATE TX ─────────────────────────────────────────

def deploy_token(keypair: Keypair, metadata_uri: str, dry_run: bool = False):
    """Build and send the Pump.fun token creation transaction."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Deploying $SIGNAL to Pump.fun...")

    # Pump.fun create endpoint — returns a pre-built transaction
    payload = {
        "publicKey": str(keypair.pubkey()),
        "action": "create",
        "tokenMetadata": {
            "name": TOKEN_NAME,
            "symbol": TOKEN_SYMBOL,
            "uri": metadata_uri,
        },
        "mint": str(Keypair().pubkey()),  # new mint address
        "denominatedInSol": "true",
        "amount": INITIAL_BUY_SOL,
        "slippage": 10,
        "priorityFee": 0.0005,
        "pool": "pump",
    }

    print(f"Token name: {TOKEN_NAME}")
    print(f"Symbol: {TOKEN_SYMBOL}")
    print(f"Initial buy: {INITIAL_BUY_SOL} SOL")
    print(f"Metadata URI: {metadata_uri}")

    if dry_run:
        print("\n[DRY RUN COMPLETE] — all parameters valid. Run with --deploy to go live.")
        return

    resp = requests.post(
        "https://pumpportal.fun/api/trade-local",
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload),
        timeout=30,
    )

    if resp.status_code != 200:
        print(f"ERROR: {resp.status_code} — {resp.text}")
        return

    # Sign and send the transaction
    tx_bytes = bytes(resp.content)
    from solders.transaction import VersionedTransaction
    from solana.rpc.types import TxOpts

    tx = VersionedTransaction.from_bytes(tx_bytes)
    signed = keypair.sign_message(bytes(tx.message))

    client = Client(RPC_ENDPOINT)
    result = client.send_raw_transaction(
        bytes(tx),
        opts=TxOpts(skip_preflight=True, max_retries=3)
    )

    sig = str(result.value)
    print(f"\n$SIGNAL DEPLOYED")
    print(f"Transaction: {sig}")
    print(f"View on Pump.fun: https://pump.fun/{payload['mint']}")
    print(f"View on Solscan: https://solscan.io/tx/{sig}")

    return sig

# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Deploy $SIGNAL to Pump.fun")
    parser.add_argument("--keypair", help="Path to keypair JSON file")
    parser.add_argument("--dry-run", action="store_true", help="Validate without deploying")
    parser.add_argument("--deploy", action="store_true", help="Execute deployment")
    args = parser.parse_args()

    if not args.dry_run and not args.deploy:
        print("Specify --dry-run or --deploy")
        return

    keypair = load_keypair(args.keypair)
    sol = check_balance(keypair)

    if not args.dry_run and sol < 0.02:
        print("Insufficient balance. Need at least 0.02 SOL. Aborting.")
        return

    logo_bytes = load_logo()
    metadata_uri = upload_metadata(logo_bytes) if logo_bytes else ""

    deploy_token(keypair, metadata_uri, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
