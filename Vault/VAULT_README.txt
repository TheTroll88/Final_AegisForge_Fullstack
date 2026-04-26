# ============================================================================
#  AEGISFORGE MASTER VAULT — INDEX & README
#  Created: 2026-04-20 06:12
#  Owner:   Nathaniel Crigger (natha)
#  Access:  YOU, your agents, Claude — no one else
# ============================================================================

## STRUCTURE
`
Vault/
  Api_keys.txt              # All API keys (Venice, OpenAI, OpenRouter, Groq, etc.)
  Passwords.txt             # All passwords (KeePass, wallets, DB)
  PassPhrases.txt           # Seed phrases (kept as-was + consolidated below)
  RPC_Keys.txt              # Blockchain RPC/explorer keys
  SHA_PPK_Keys.txt          # GPG signing keys, RSA public keys
  Telegram.txt              # Telegram wallet seeds + API config
  GitHub_MK.txt             # GPG key setup + Git signing config
  EVM_Wallets/
    evm_private_keys.txt    # 10 EVM private keys + Trust Wallet + Propoy
  Solana_Wallets/
    solana_keypairs.txt     # Nosana + Turbin3 full keypairs
  Seed_Phrases/
    all_seed_phrases.txt    # ALL seed phrases consolidated (6 wallets)
  Bot_Keys/
    keymint_gateway.txt     # KeyMint gateway key + registry reference
  Service_Credentials/
    services_and_passwords.txt  # Logos, DB, KeePass, Telegram API, GPG
  DPAPI_Encrypted/
    dpapi_file_index.txt    # Index of all DPAPI-encrypted files on disk
  KeePass_Refs/
    keepass_index.txt       # All 6 KeePass databases + backup locations
  Vault_Scripts/
    seal_vault.ps1          # DPAPI encryption script (from D:\DataVault)
    unseal_vault.ps1        # DPAPI decryption script
    rotate_venice.ps1       # Venice key rotation
`

## SECURITY
- Folder ACL: restricted to SYSTEM + current user only
- .gitignore: blocks ALL vault contents from any git repo
- DPAPI encryption available via Vault_Scripts/seal_vault.ps1
- OneDrive syncs this folder — consider disabling sync for Vault/

## USAGE
- To add new credentials: create entries in the appropriate file
- To encrypt the vault: run Vault_Scripts\seal_vault.ps1
- To decrypt individual keys: run Vault_Scripts\unseal_vault.ps1
- KeePass databases are the backup — use KeePassXC with master password

## FUTURE
- Agent-specific access via KeyMint role scoping
- Shared vault with encrypted-at-rest individual entries
- Rotation automation for API keys
