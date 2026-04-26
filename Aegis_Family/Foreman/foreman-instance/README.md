# Foreman Instance

Standalone operational instance for Foreman with:

## Local credential vault generation

- Per-service login/password identity bundle
- Free API provider bootstrap and health checks
- Auditable reports

### Quick Start

```powershell
cd C:\Users\natha\OneDrive\GitHub\Foreman-Instance
python scripts/generate_instance_identity.py
python scripts/bootstrap_free_apis.py
```

#### Output

- runtime/instance_identity.json (non-secret metadata)
- runtime/instance_secrets.json (local secret bundle)
- reports/free_api_status.json (live API checks)

##### Notes

- This repo generates credentials locally.
- Move secrets to KeePassXC after generation.
- Never commit runtime/* secrets.

## Export Secrets to KeePassXC

```powershell
$env:KEEPASS_DB_PATH="C:\path\to\vault.kdbx"
$env:KEEPASS_MASTER_PASSWORD="your-master-password"
$env:KEEPASS_GROUP="Foreman Instance"
$env:DELETE_SECRETS_AFTER_EXPORT="true"
python scripts/export_secrets_to_keepass.py
```

### BaseScan API Key

- Public endpoint checks run without a key.
- Full key-based checks require `BASESCAN_API_KEY` env var.

## Proof of Work Bundle

```powershell
python scripts/generate_instance_identity.py
python scripts/bootstrap_free_apis.py
python scripts/generate_foreman_wallets.py
python scripts/build_proof_of_work.py
```

This emits a manifest in `proof/proof_of_work.json` with per-artifact SHA256 hashes and a single proof hash.

## Social Proof Links

```powershell
python scripts/publish_social_proof.py
```

When X handle exists:

```powershell
$env:FOREMAN_TWITTER_HANDLE="your_handle"
python scripts/publish_social_proof.py
```

Output:

- `social/links.json` (GitHub + Twitter proof links)

## X Signup Checkpoint

```powershell
python scripts/prepare_signup_packet.py
```

Output:

- `social/signup_packet.json`

This packet records that signup form access was achieved and marks the exact manual checkpoint where platform verification is required.
