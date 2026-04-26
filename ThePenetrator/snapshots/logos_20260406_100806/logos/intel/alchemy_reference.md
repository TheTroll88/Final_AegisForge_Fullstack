# Alchemy RPC & Blockchain Reference — Logos Intel

## API KEY
ZOho1BvxkQjPOjOsnZYFn

## RPC ENDPOINTS (all live, wired into >> CHAIN tool)

| Chain | Alias | Endpoint |
|-------|-------|----------|
| ETH Mainnet | eth, ethereum | https://eth-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| ETH Sepolia | sepolia, eth_sepolia | https://eth-sepolia.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Base Mainnet | base | https://base-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Base Sepolia | base_sepolia | https://base-sepolia.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Polygon | polygon, matic | https://polygon-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Arbitrum | arb, arbitrum | https://arb-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Optimism | opt, optimism | https://opt-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Zora Sepolia | zora | https://zora-sepolia.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Solana Mainnet | sol, solana | https://solana-mainnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |
| Solana Devnet | sol_devnet, solana_devnet | https://solana-devnet.g.alchemy.com/v2/ZOho1BvxkQjPOjOsnZYFn |

## FREE GAS POLICIES (Nate's Alchemy account)
- Zora Sepolia — UNLIMITED gas, zero cost
- ETH Sepolia — sponsored gas, zero cost
- Base Sepolia — sponsored gas, zero cost

Any transaction sent on those three networks costs nothing. No ETH/gas tokens needed.

## SOLANA DEVNET FAUCET
```
>> CHAIN sol_devnet requestAirdrop ["4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow", 1000000000]
```
- 1 SOL = 1,000,000,000 lamports
- Rate-limited: ~2 SOL per request, few requests per day

## WALLETS
- EVM: 0x36A9D523d70AE8b47898bc9B148B929370C3693F
- Solana: 4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow

## KEY SOLANA RPC METHODS
| Method | Purpose | Params |
|--------|---------|--------|
| getBalance | SOL balance | ["address"] |
| getTokenAccountsByOwner | List all SPL token accounts | ["address", {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}] |
| getTransaction | Transaction details | ["signature"] |
| getLatestBlockhash | Fresh blockhash for txns | [] |
| requestAirdrop | Devnet faucet | ["address", lamports] |
| sendTransaction | Submit signed tx | ["base64_encoded_tx"] |
| getAccountInfo | Raw account data | ["address"] |
| getSlot | Current slot number | [] |
| getSignaturesForAddress | Transaction history | ["address"] |
| getTokenAccountBalance | SPL token balance | ["token_account_address"] |
| getMinimumBalanceForRentExemption | Rent exempt minimum | [data_size] |

## KEY EVM RPC METHODS
| Method | Purpose | Params |
|--------|---------|--------|
| eth_getBalance | ETH balance | ["address", "latest"] |
| eth_sendRawTransaction | Submit signed tx | ["signed_tx_hex"] |
| eth_getTransactionByHash | Tx details | ["tx_hash"] |
| eth_getTransactionReceipt | Tx receipt | ["tx_hash"] |
| eth_blockNumber | Latest block | [] |
| eth_call | Read contract (no gas) | [{"to":"addr","data":"calldata"}, "latest"] |
| eth_estimateGas | Estimate gas cost | [{"from":"addr","to":"addr","data":"calldata"}] |
| eth_getCode | Get contract bytecode | ["address", "latest"] |
| alchemy_getTokenBalances | All ERC-20 balances | ["address"] |
| alchemy_getAssetTransfers | Transfer history | [{"fromAddress":"addr","category":["erc20","external"]}] |
| alchemy_simulateAssetChanges | Simulate before sending | [{"from":"addr","to":"addr","value":"hex","data":"calldata"}] |

## USAGE IN LOGOS
All of this is accessed through the >> CHAIN command:
```
>> CHAIN <alias> <method> [params_as_json_array]
```
Examples:
```
>> CHAIN sol getBalance ["4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow"]
>> CHAIN sol_devnet requestAirdrop ["4k24SEzbHyr49mBtYzu4e3K9EBtsuKTdkEN2mdmMkZow", 2000000000]
>> CHAIN eth eth_getBalance ["0x36A9D523d70AE8b47898bc9B148B929370C3693F", "latest"]
>> CHAIN base_sepolia eth_sendRawTransaction ["0xsigned_tx_here"]
>> CHAIN zora eth_blockNumber []
```
