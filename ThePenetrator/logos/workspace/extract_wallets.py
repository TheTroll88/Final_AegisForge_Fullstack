"""
Critical Backup Wallet Extractor
==================================
Extracts wallets from Aegis Treasury Vault using KeePass keybox.
"""
import pykeepass
import json
import os

db_path = r"D:\CRITICAL_BACKUP\keepass\AEGIS_TREASURY_VAULT.kdbx"
key_path = r"D:\CRITICAL_BACKUP\gnupg\S.keyboxd"

print("🔓 Decrypting Vault...")

try:
    # Open KeePass database with keybox
    kp = pykeepass.PyKeePass(db_path, password=None, keyfile=key_path)
    
    print(f"✅ Vault Opened. Found {len(kp.entries)} entries.")
    
    wallets = []
    seeds = []
    
    for entry in kp.entries:
        title = entry.title.lower()
        username = entry.username.lower()
        password = entry.password
        notes = entry.notes.lower() if entry.notes else ""
        
        # Check for wallet info
        if "wallet" in title or "wallet" in username or "wallet" in notes:
            wallets.append({
                "title": entry.title,
                "username": entry.username,
                "note": entry.notes
            })
        
        # Check for seed phrase
        if "seed" in title or "seed" in notes or "12 words" in notes or "24 words" in notes:
            seeds.append({
                "title": entry.title,
                "value": entry.password
            })
    
    print("\n--- WALLET ADDRESSES ---")
    for w in wallets:
        print(f"Title: {w['title']}")
        print(f"User: {w['username']}")
        print(f"Note: {w['note'][:100]}")
        print("-" * 50)
        
except Exception as e:
    print(f"❌ Error: {e}")
