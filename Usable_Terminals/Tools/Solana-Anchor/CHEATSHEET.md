# Solana CLI + Anchor — Cheat Sheet

> **Solana CLI:** `C:\Users\natha\.local\share\solana\install\releases\2.1.21\...\solana.exe`  
> **Anchor CLI:** `C:\Users\natha\.cargo\bin\anchor.exe` (v0.32.1)  
> **SPL Token CLI:** `spl-token` (same Solana install)  
> **Type:** Blockchain CLI tools — Solana network interaction + smart contract framework  
> **AegisForge Role:** ASIG token operations, on-chain signal registry, wallet management

---

## Solana CLI — Network & Wallet

### Configuration

```bash
# Check config
solana config get                          # Show current config (RPC URL, keypair, commitment)
solana config set --url https://api.mainnet-beta.solana.com     # Mainnet
solana config set --url https://api.devnet.solana.com           # Devnet (testing)
solana config set --url https://api.testnet.solana.com          # Testnet
solana config set --url http://localhost:8899                    # Local validator
solana config set --keypair ~/.config/solana/id.json            # Set default keypair

# Networks:
# mainnet-beta — Real SOL, real transactions
# devnet       — Free test SOL, mirrors mainnet features
# testnet      — Stress testing, may be unstable
# localhost    — Local validator (solana-test-validator)
```

### Wallet Operations

```bash
# Keypair management
solana-keygen new                          # Generate new keypair (saves to ~/.config/solana/id.json)
solana-keygen new --outfile wallet.json    # Custom output path
solana-keygen pubkey                       # Show public key of default keypair
solana-keygen pubkey wallet.json           # Show public key of specific file
solana-keygen recover                      # Recover from seed phrase
solana-keygen verify <PUBKEY> wallet.json  # Verify keypair

# Balance
solana balance                             # Balance of default keypair
solana balance <PUBKEY>                    # Balance of any address
solana balance --lamports                  # Balance in lamports (1 SOL = 1B lamports)

# Airdrop (devnet/testnet only)
solana airdrop 2                           # Get 2 SOL (devnet)
solana airdrop 5 <PUBKEY>                  # Airdrop to specific address
```

### Transfers & Transactions

```bash
# Send SOL
solana transfer <RECIPIENT_PUBKEY> 1.5     # Send 1.5 SOL
solana transfer <RECIPIENT> 0.1 --fee-payer wallet.json    # Custom fee payer

# Transaction info
solana confirm <TX_SIGNATURE>              # Check transaction status
solana transaction-history                 # Recent transactions for default wallet
solana transaction-history <PUBKEY>        # History for any address

# Decode transaction
solana decode-transaction <TX_SIGNATURE>   # Full transaction details
```

### Validator & Network

```bash
# Network info
solana cluster-version                     # Cluster software version
solana slot                                # Current slot number
solana epoch-info                          # Current epoch details
solana validators                          # List validators
solana gossip                              # Gossip network nodes
solana block-production                    # Block production stats
solana supply                              # Total supply info

# Local development
solana-test-validator                      # Start local validator (port 8899)
solana-test-validator --reset              # Fresh start (clear ledger)
solana-test-validator --bpf-program <ADDR> <FILE.so>  # Load program at startup
# Runs at: http://localhost:8899 (RPC) + ws://localhost:8900 (WebSocket)

# Logs
solana logs                                # Stream transaction logs (all)
solana logs <PROGRAM_ID>                   # Stream logs for specific program
```

### Program (Smart Contract) Deployment

```bash
# Deploy program
solana program deploy target/deploy/program.so     # Deploy compiled program
solana program show <PROGRAM_ID>                    # Program info
solana program dump <PROGRAM_ID> output.so          # Download deployed program
solana program close <PROGRAM_ID>                   # Close program (reclaim SOL)

# Program buffer (large programs)
solana program write-buffer program.so              # Upload to buffer
solana program deploy --buffer <BUFFER_ADDR>        # Deploy from buffer
```

---

## SPL Token CLI

```bash
# Create tokens
spl-token create-token                     # Create new token mint
spl-token create-account <TOKEN_MINT>      # Create associated token account
spl-token mint <TOKEN_MINT> 1000000        # Mint tokens

# Transfer
spl-token transfer <TOKEN_MINT> 100 <RECIPIENT>    # Send tokens
spl-token transfer <TOKEN_MINT> 100 <RECIPIENT> --fund-recipient  # Create recipient account if needed

# Info
spl-token accounts                         # All token accounts for wallet
spl-token supply <TOKEN_MINT>              # Total supply of token
spl-token balance <TOKEN_MINT>             # Your balance of specific token
spl-token account-info <TOKEN_ACCOUNT>     # Detailed account info

# Token management
spl-token authorize <TOKEN_MINT> mint <NEW_AUTHORITY>  # Change mint authority
spl-token authorize <TOKEN_MINT> mint --disable        # Revoke mint authority (makes supply fixed!)
spl-token burn <TOKEN_ACCOUNT> 100         # Burn tokens
spl-token close <TOKEN_ACCOUNT>            # Close empty token account (reclaim SOL)
```

---

## Anchor Framework

### Project Setup

```bash
# Create new project
anchor init my-project                     # New Anchor project
cd my-project

# Project structure:
# programs/        — Rust smart contract code
# tests/           — TypeScript tests
# migrations/      — Deployment scripts
# app/             — Frontend (optional)
# Anchor.toml      — Project config
```

### Build & Test

```bash
# Build
anchor build                               # Compile all programs
# Output: target/deploy/your_program.so + target/idl/your_program.json

# Test
anchor test                                # Build + start local validator + run tests
anchor test --skip-local-validator         # Run tests against existing validator
anchor test --skip-build                   # Skip rebuild

# Local development
anchor localnet                            # Start local validator with programs deployed

# Deploy
anchor deploy                              # Deploy to configured cluster
anchor deploy --provider.cluster devnet    # Deploy to devnet
anchor deploy --provider.cluster mainnet   # Deploy to mainnet
```

### Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
my_program = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.devnet]
my_program = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### IDL (Interface Description Language)

```bash
# Generate/manage IDL
anchor idl init <PROGRAM_ID> --filepath target/idl/my_program.json
anchor idl upgrade <PROGRAM_ID> --filepath target/idl/my_program.json
anchor idl fetch <PROGRAM_ID>              # Fetch IDL from on-chain
anchor idl erase <PROGRAM_ID>             # Remove on-chain IDL
```

---

## Rustup (Toolchain Manager)

```bash
# Manage Rust toolchains
rustup update                              # Update all toolchains
rustup default stable                      # Use stable Rust
rustup default nightly                     # Use nightly Rust
rustup show                                # Current toolchain info

# Components
rustup component add clippy                # Linter
rustup component add rustfmt               # Formatter
rustup component add rust-analyzer         # LSP server for IDEs

# Targets (cross-compilation)
rustup target add wasm32-unknown-unknown   # WebAssembly
rustup target list --installed             # Installed targets

# Cargo (Rust package manager)
cargo build                                # Build project
cargo build --release                      # Optimized build
cargo test                                 # Run tests
cargo run                                  # Build + run
cargo fmt                                  # Format code
cargo clippy                               # Lint
cargo doc --open                           # Generate + open docs
```

---

## Useful Patterns for AegisForge

```bash
# Quick devnet setup
solana config set --url devnet
solana airdrop 5
solana balance

# Deploy + verify program
anchor build
anchor deploy --provider.cluster devnet
anchor test --skip-local-validator

# Check ASIG token supply (replace with actual mint address)
spl-token supply <ASIG_MINT_ADDRESS>

# Monitor program logs
solana logs <PROGRAM_ID>

# Health check for local validator
curl http://localhost:8899 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```
