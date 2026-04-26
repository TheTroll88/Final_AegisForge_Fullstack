"""Blockchain query tool — on-chain reads via Alchemy RPC."""

import json
from typing import Optional
import requests
from logos.tools.base import BaseTool, ToolResult

# Chain aliases → config key mapping
CHAIN_ALIASES = {
    "eth": "eth_mainnet", "ethereum": "eth_mainnet", "eth_mainnet": "eth_mainnet",
    "eth_sepolia": "eth_sepolia", "sepolia": "eth_sepolia",
    "base": "base_mainnet", "base_mainnet": "base_mainnet",
    "base_sepolia": "base_sepolia",
    "polygon": "polygon_mainnet", "matic": "polygon_mainnet", "polygon_mainnet": "polygon_mainnet",
    "arb": "arb_mainnet", "arbitrum": "arb_mainnet", "arb_mainnet": "arb_mainnet",
    "opt": "opt_mainnet", "optimism": "opt_mainnet", "opt_mainnet": "opt_mainnet",
    "zora": "zora_sepolia", "zora_sepolia": "zora_sepolia",
    "sol": "solana_mainnet", "solana": "solana_mainnet", "solana_mainnet": "solana_mainnet",
    "sol_devnet": "solana_devnet", "solana_devnet": "solana_devnet",
}


class ChainQueryTool(BaseTool):
    """Query any blockchain via Alchemy RPC — balances, transactions, contract reads, token transfers."""
    name = "chain_query"
    description = "Query blockchain via Alchemy RPC (balances, txns, contracts, tokens)"
    parameters = {
        "type": "object",
        "properties": {
            "chain": {"type": "string", "description": "Chain: eth, base, polygon, arb, opt, zora, sol, or with _sepolia/_devnet suffix"},
            "method": {"type": "string", "description": "RPC method (eth_getBalance, eth_getTransactionByHash, alchemy_getAssetTransfers, etc.)"},
            "params": {"type": "array", "description": "Method params array"},
        },
        "required": ["chain", "method"],
    }

    def __init__(self, alchemy_config: dict = None):
        self._config = alchemy_config or {}

    def _get_rpc_url(self, chain: str) -> Optional[str]:
        chain_key = CHAIN_ALIASES.get(chain.lower().strip())
        if not chain_key:
            return None
        return self._config.get("rpc", {}).get(chain_key)

    def execute(self, params: dict, workspace: str) -> ToolResult:
        chain = params.get("chain", "eth")
        method = params.get("method", "")
        rpc_params = params.get("params", [])

        rpc_url = self._get_rpc_url(chain)
        if not rpc_url:
            available = sorted(set(CHAIN_ALIASES.values()))
            return ToolResult(False, f"Unknown chain '{chain}'. Available: {', '.join(available)}", self.name)

        # Solana uses different RPC format
        is_solana = "solana" in chain.lower() or chain.lower() in ("sol", "sol_devnet")

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": rpc_params,
        }

        try:
            resp = requests.post(
                rpc_url,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            if "error" in data:
                err = data["error"]
                msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                return ToolResult(False, f"RPC error: {msg}", self.name)

            result = data.get("result")
            # Format output nicely
            if isinstance(result, str) and result.startswith("0x") and len(result) <= 66:
                # Likely a hex number — show decimal too
                try:
                    decimal_val = int(result, 16)
                    # If it looks like wei, also show ETH
                    if decimal_val > 10**15:
                        eth_val = decimal_val / 10**18
                        output = f"{result} ({decimal_val} wei = {eth_val:.6f} ETH)"
                    else:
                        output = f"{result} ({decimal_val})"
                except ValueError:
                    output = result
            elif isinstance(result, (dict, list)):
                output = json.dumps(result, indent=2)[:5000]
            elif result is None:
                output = "null (no result — address may not exist or method unsupported)"
            else:
                output = str(result)[:5000]

            return ToolResult(True, f"[{chain}] {method}\n{output}", self.name)

        except requests.exceptions.ConnectionError:
            return ToolResult(False, "Connection failed — check internet", self.name)
        except requests.exceptions.Timeout:
            return ToolResult(False, "RPC request timed out", self.name)
        except Exception as e:
            return ToolResult(False, f"Chain query error: {e}", self.name)
