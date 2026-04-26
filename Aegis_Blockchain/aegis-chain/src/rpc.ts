/**
 * Aegis Chain — JSON-RPC Server
 *
 * Standard Ethereum JSON-RPC interface (EIP-1474 compatible).
 * Any EVM wallet (MetaMask, Rabby, etc.) can connect to this.
 *
 * Supported methods:
 *   eth_chainId, eth_blockNumber, eth_gasPrice, eth_getBalance,
 *   eth_getTransactionCount, eth_getBlockByNumber, eth_getBlockByHash,
 *   eth_getTransactionByHash, eth_getTransactionReceipt, eth_call,
 *   eth_estimateGas, eth_sendRawTransaction, eth_getCode, eth_getLogs,
 *   net_version, net_listening, web3_clientVersion
 */

import { hexToBytes } from "@ethereumjs/util";
import cors from "cors";
import express from "express";
import { AegisChain } from "./chain.js";

const CLIENT_VERSION = "AegisChain/1.0.0/TypeScript";

export function createRpcServer(chain: AegisChain, port = 8545): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // ─── JSON-RPC Handler ──────────────────────────────────
  app.post("/", async (req, res) => {
    // Handle batch requests (array)
    if (Array.isArray(req.body)) {
      const results = await Promise.all(
        req.body.map(async ({ jsonrpc, id, method, params }: any) => {
          try {
            const result = await handleMethod(chain, method, params || []);
            return { jsonrpc: "2.0", id, result };
          } catch (err: any) {
            return { jsonrpc: "2.0", id, error: { code: -32603, message: err.message } };
          }
        })
      );
      res.json(results);
      return;
    }

    const { jsonrpc, id, method, params } = req.body;

    try {
      const result = await handleMethod(chain, method, params || []);
      res.json({ jsonrpc: "2.0", id, result });
    } catch (err: any) {
      res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: err.message },
      });
    }
  });

  // Batch support
  app.post("/batch", async (req, res) => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: "Expected array" });
      return;
    }

    const results = await Promise.all(
      req.body.map(async ({ jsonrpc, id, method, params }: any) => {
        try {
          const result = await handleMethod(chain, method, params || []);
          return { jsonrpc: "2.0", id, result };
        } catch (err: any) {
          return { jsonrpc: "2.0", id, error: { code: -32603, message: err.message } };
        }
      })
    );
    res.json(results);
  });

  // ─── Status Endpoint ───────────────────────────────────
  app.get("/", (_req, res) => {
    const uptime = Math.floor((Date.now() - chain.stats.startTime) / 1000);
    res.json({
      chain: "Aegis Chain",
      chainId: chain.getChainId(),
      version: CLIENT_VERSION,
      blockNumber: chain.getBlockNumber(),
      totalTransactions: chain.stats.totalTxs,
      totalBlocks: chain.stats.totalBlocks,
      uptime: `${uptime}s`,
      producing: chain.isProducing(),
      rpc: `http://localhost:${port}`,
    });
  });

  // ─── Explorer Endpoints ────────────────────────────────
  app.get("/block/:numberOrHash", async (req, res) => {
    const param = req.params.numberOrHash;
    const block = param.startsWith("0x")
      ? chain.getBlock(param)
      : chain.getBlock(param === "latest" ? chain.getBlockNumber() : Number(param));

    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }
    res.json(block);
  });

  app.get("/tx/:hash", (req, res) => {
    const tx = chain.getTransaction(req.params.hash);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(tx);
  });

  app.get("/balance/:address", async (req, res) => {
    const balance = await chain.getBalance(req.params.address);
    const eth = Number(balance) / 1e18;
    res.json({
      address: req.params.address,
      balance: balance.toString(),
      ether: eth.toFixed(6),
    });
  });

  // ─── Faucet Endpoint ───────────────────────────────────
  app.post("/faucet", async (req, res) => {
    const { address, amount } = req.body || {};
    if (!address) {
      res.status(400).json({ error: "address required" });
      return;
    }
    try {
      const amt = amount ? BigInt(amount) : BigInt("10000000000000000000000"); // default 10K AEGIS
      await chain.faucet(address, amt);
      const newBalance = await chain.getBalance(address);
      res.json({ success: true, address, newBalance: newBalance.toString(), formatted: (Number(newBalance) / 1e18).toFixed(6) + " AEGIS" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

// ─── RPC Method Router ──────────────────────────────────

async function handleMethod(chain: AegisChain, method: string, params: any[]): Promise<any> {
  switch (method) {
    // ── Chain Info ──
    case "eth_chainId":
      return "0x" + chain.getChainId().toString(16);

    case "eth_blockNumber":
      return "0x" + chain.getBlockNumber().toString(16);

    case "eth_gasPrice":
      return "0x" + chain.getGasPrice().toString(16);

    case "net_version":
      return String(chain.getChainId());

    case "net_listening":
      return true;

    case "net_peerCount":
      return "0x1"; // self

    case "web3_clientVersion":
      return CLIENT_VERSION;

    case "web3_sha3":
      // keccak256 of input
      const { keccak256 } = await import("@ethereumjs/util");
      return "0x" + Buffer.from(keccak256(hexToBytes(params[0]))).toString("hex");

    // ── Account State ──
    case "eth_getBalance": {
      const balance = await chain.getBalance(params[0]);
      return "0x" + balance.toString(16);
    }

    case "eth_getTransactionCount": {
      const nonce = await chain.getNonce(params[0]);
      return "0x" + nonce.toString(16);
    }

    case "eth_getCode": {
      return await chain.getCode(params[0]);
    }

    case "eth_getStorageAt": {
      return await chain.getStorageAt(params[0], params[1]);
    }

    // ── Blocks ──
    case "eth_getBlockByNumber": {
      const blockNum = resolveBlockNumber(params[0], chain.getBlockNumber());
      const block = chain.getBlock(blockNum);
      if (!block) return null;
      return formatBlockResponse(block, params[1] ?? false);
    }

    case "eth_getBlockByHash": {
      const block = chain.getBlock(params[0]);
      if (!block) return null;
      return formatBlockResponse(block, params[1] ?? false);
    }

    // ── Transactions ──
    case "eth_getTransactionByHash": {
      const tx = chain.getTransaction(params[0]);
      return tx ? formatTxResponse(tx) : null;
    }

    case "eth_getTransactionReceipt": {
      const tx = chain.getTransaction(params[0]);
      return tx ? formatReceiptResponse(tx) : null;
    }

    case "eth_sendRawTransaction": {
      const rawTx = hexToBytes(params[0]);
      const hash = await chain.submitTransaction(rawTx);
      return hash;
    }

    // ── Execution ──
    case "eth_call": {
      const { to, data } = params[0];
      return await chain.call(to, data || "0x");
    }

    case "eth_estimateGas": {
      const { from, to, data, value } = params[0];
      const gas = await chain.estimateGas(
        from || "0x" + "0".repeat(40),
        to || null,
        data || "0x",
        value ? BigInt(value) : 0n
      );
      return "0x" + gas.toString(16);
    }

    // ── Logs ──
    case "eth_getLogs": {
      // Simplified — return empty for now
      return [];
    }

    // ── Mining / Syncing ──
    case "eth_mining":
      return chain.isProducing();

    case "eth_syncing":
      return false;

    case "eth_coinbase":
      return "0xAE61500000000000000000000000000000000001";

    case "eth_accounts":
      return [];

    case "eth_hashrate":
      return "0x0";

    // ── Filters (stubs for MetaMask compatibility) ──
    case "eth_newFilter":
    case "eth_newBlockFilter":
    case "eth_newPendingTransactionFilter":
      return "0x1";

    case "eth_getFilterChanges":
    case "eth_getFilterLogs":
      return [];

    case "eth_uninstallFilter":
      return true;

    // ── Fee Market (EIP-1559) ──
    case "eth_maxPriorityFeePerGas":
      return "0x0"; // free priority

    // ── Aegis Custom Methods ──
    case "aegis_faucet": {
      const [addr, amt] = params;
      const amount = amt ? BigInt(amt) : BigInt("10000000000000000000000");
      await chain.faucet(addr, amount);
      const bal = await chain.getBalance(addr);
      return { success: true, balance: "0x" + bal.toString(16) };
    }

    case "eth_feeHistory": {
      const blockCount = Math.min(resolveBlockNumber(params[0], 4), 10);
      return {
        baseFeePerGas: Array(blockCount + 1).fill("0x" + chain.getGasPrice().toString(16)),
        gasUsedRatio: Array(blockCount).fill(0.5),
        oldestBlock: "0x" + Math.max(0, chain.getBlockNumber() - blockCount).toString(16),
      };
    }

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// ─── Response Formatters ─────────────────────────────────

function formatBlockResponse(block: any, includeTxs: boolean) {
  return {
    number: "0x" + block.number.toString(16),
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: "0x" + block.timestamp.toString(16),
    gasUsed: "0x" + block.gasUsed.toString(16),
    gasLimit: "0x" + Number(block.gasLimit).toString(16),
    baseFeePerGas: "0x" + Number(block.baseFeePerGas).toString(16),
    miner: block.miner,
    transactions: includeTxs ? block.transactions : block.transactions,
    transactionsRoot: "0x" + "0".repeat(64),
    stateRoot: block.stateRoot,
    receiptsRoot: "0x" + "0".repeat(64),
    logsBloom: "0x" + "0".repeat(512),
    difficulty: "0x1",
    totalDifficulty: "0x" + (block.number + 1).toString(16),
    extraData: "0x" + Buffer.from(block.extraData).toString("hex"),
    size: "0x" + block.size.toString(16),
    nonce: "0x0000000000000000",
    sha3Uncles: "0x" + "0".repeat(64),
    uncles: [],
    mixHash: "0x" + "0".repeat(64),
  };
}

function formatTxResponse(tx: any) {
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: "0x" + BigInt(tx.value).toString(16),
    gas: "0x" + BigInt(tx.gasLimit).toString(16),
    gasPrice: "0x" + BigInt(tx.gasPrice).toString(16),
    nonce: "0x" + tx.nonce.toString(16),
    input: tx.data,
    blockNumber: tx.blockNumber !== null ? "0x" + tx.blockNumber.toString(16) : null,
    blockHash: tx.blockHash,
    transactionIndex: tx.transactionIndex !== null ? "0x" + tx.transactionIndex.toString(16) : null,
    v: "0x1b",
    r: "0x" + "0".repeat(64),
    s: "0x" + "0".repeat(64),
  };
}

function formatReceiptResponse(tx: any) {
  return {
    transactionHash: tx.hash,
    transactionIndex: tx.transactionIndex !== null ? "0x" + tx.transactionIndex.toString(16) : "0x0",
    blockNumber: tx.blockNumber !== null ? "0x" + tx.blockNumber.toString(16) : null,
    blockHash: tx.blockHash,
    from: tx.from,
    to: tx.to,
    cumulativeGasUsed: "0x" + BigInt(tx.gasUsed).toString(16),
    gasUsed: "0x" + BigInt(tx.gasUsed).toString(16),
    contractAddress: tx.contractAddress,
    logs: tx.logs || [],
    logsBloom: "0x" + "0".repeat(512),
    status: "0x" + tx.status.toString(16),
    effectiveGasPrice: "0x" + BigInt(tx.gasPrice).toString(16),
    type: "0x0",
  };
}

function resolveBlockNumber(param: any, current: number): number {
  if (param === "latest" || param === "pending") return current;
  if (param === "earliest") return 0;
  if (typeof param === "string" && param.startsWith("0x")) return parseInt(param, 16);
  return Number(param);
}

export default createRpcServer;
