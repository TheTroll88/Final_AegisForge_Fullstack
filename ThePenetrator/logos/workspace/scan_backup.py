"""
Systematic Backup Scanner
==========================
Scans D:\CRITICAL_BACKUP for crypto keys, wallets, and ASIG.
"""
import os
import re

backup_path = r"D:\CRITICAL_BACKUP"
results = []

# Search for keywords
keywords = ["private key", "seed phrase", "wallet", "mnemonic", "0x", "ASIG"]

for root, dirs, files in os.walk(backup_path):
    for file in files:
        if file.lower().endswith(('.txt', '.csv', '.json', '.kdbx', '.key')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    for keyword in keywords:
                        if keyword in content:
                            results.append(f"{file}: {keyword}")
                            break
            except:
                continue

if results:
    print(f"Found {len(results)} matches:")
    for r in results[:50]: # Limit output
        print(r)
else:
    print("No matches found in text files.")
