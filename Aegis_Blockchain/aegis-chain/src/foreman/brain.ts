/**
 * Foreman — On-Chain Memory
 *
 * Foreman's brain lives on the blockchain. Every decision, every discovery,
 * every piece of learned behavior gets written to a smart contract.
 * This is the persistence layer that survives everything.
 *
 * Memory contract functions:
 *   store(key, value)  — write a memory
 *   recall(key)        — read a memory
 *   log(entry)         — append to decision log
 *   getLog(index)      — read decision log entry
 *   logCount()         — total log entries
 */

import { ethers } from "ethers";

// Solidity source for Foreman's memory contract
export const MEMORY_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ForemanBrain {
    address public owner;

    // Key-value memory store
    mapping(bytes32 => bytes) private memory_;
    bytes32[] private memoryKeys;

    // Decision log (append-only)
    struct LogEntry {
        uint256 timestamp;
        string action;
        string result;
        string context;
    }
    LogEntry[] private decisionLog;

    // Agent registry
    struct Agent {
        string name;
        string role;
        address wallet;
        bool active;
        uint256 registered;
    }
    mapping(address => Agent) public agents;
    address[] public agentList;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not Foreman");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Memory Operations ──

    function store(string calldata key, bytes calldata value) external onlyOwner {
        bytes32 keyHash = keccak256(bytes(key));
        if (memory_[keyHash].length == 0) {
            memoryKeys.push(keyHash);
        }
        memory_[keyHash] = value;
    }

    function recall(string calldata key) external view returns (bytes memory) {
        return memory_[keccak256(bytes(key))];
    }

    function memoryCount() external view returns (uint256) {
        return memoryKeys.length;
    }

    // ── Decision Log ──

    function log(string calldata action, string calldata result, string calldata context) external onlyOwner {
        decisionLog.push(LogEntry(block.timestamp, action, result, context));
    }

    function getLog(uint256 index) external view returns (uint256 timestamp, string memory action, string memory result, string memory context) {
        LogEntry storage entry = decisionLog[index];
        return (entry.timestamp, entry.action, entry.result, entry.context);
    }

    function logCount() external view returns (uint256) {
        return decisionLog.length;
    }

    // ── Agent Registry ──

    function registerAgent(address wallet, string calldata name, string calldata role) external onlyOwner {
        require(!agents[wallet].active, "Already registered");
        agents[wallet] = Agent(name, role, wallet, true, block.timestamp);
        agentList.push(wallet);
    }

    function deactivateAgent(address wallet) external onlyOwner {
        agents[wallet].active = false;
    }

    function agentCount() external view returns (uint256) {
        return agentList.length;
    }
}
`;

// Pre-compiled bytecode (compiled with solc 0.8.20, optimize 200)
// We'll deploy from ABI + bytecode instead of requiring solc at runtime
export const MEMORY_CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function store(string key, bytes value)",
  "function recall(string key) view returns (bytes)",
  "function memoryCount() view returns (uint256)",
  "function log(string action, string result, string context)",
  "function getLog(uint256 index) view returns (uint256 timestamp, string action, string result, string context)",
  "function logCount() view returns (uint256)",
  "function registerAgent(address wallet, string name, string role)",
  "function deactivateAgent(address wallet)",
  "function agentCount() view returns (uint256)",
  "function agents(address) view returns (string name, string role, address wallet, bool active, uint256 registered)",
  "function agentList(uint256) view returns (address)",
];

/**
 * Foreman's on-chain memory interface
 */
export class ForemanBrain {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer;
  private provider: ethers.JsonRpcProvider;
  public contractAddress: string | null = null;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Deploy the brain contract (first boot only)
   */
  async deploy(): Promise<string> {
    console.log("  [Brain] Compiling and deploying memory contract...");

    // Use ethers ContractFactory with the Solidity source
    // Since we can't compile Solidity in pure JS without solc,
    // we'll use a minimal EVM bytecode approach — deploy via raw init code
    // For now: use solc if available, otherwise use a pre-built deployment
    const factory = new ethers.ContractFactory(
      MEMORY_CONTRACT_ABI,
      await this.compileBytecode(),
      this.signer
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();
    this.contractAddress = await contract.getAddress();
    this.contract = contract;

    console.log(`  [Brain] Memory contract deployed at ${this.contractAddress}`);
    return this.contractAddress;
  }

  /**
   * Connect to an already-deployed brain contract
   */
  connect(address: string): void {
    this.contractAddress = address;
    this.contract = new ethers.Contract(address, MEMORY_CONTRACT_ABI, this.signer);
  }

  /**
   * Store a memory on-chain
   */
  async store(key: string, value: string): Promise<void> {
    if (!this.contract) throw new Error("Brain not initialized");
    const tx = await this.contract.store(key, ethers.toUtf8Bytes(value));
    await tx.wait();
  }

  /**
   * Recall a memory from chain
   */
  async recall(key: string): Promise<string | null> {
    if (!this.contract) throw new Error("Brain not initialized");
    const raw = await this.contract.recall(key);
    if (raw === "0x" || raw.length <= 2) return null;
    return ethers.toUtf8String(raw);
  }

  /**
   * Log a decision on-chain
   */
  async logDecision(action: string, result: string, context: string = ""): Promise<void> {
    if (!this.contract) throw new Error("Brain not initialized");
    const tx = await this.contract.log(action, result, context);
    await tx.wait();
  }

  /**
   * Get total decision log entries
   */
  async getLogCount(): Promise<number> {
    if (!this.contract) throw new Error("Brain not initialized");
    return Number(await this.contract.logCount());
  }

  /**
   * Read a decision log entry
   */
  async getLogEntry(index: number): Promise<{ timestamp: number; action: string; result: string; context: string }> {
    if (!this.contract) throw new Error("Brain not initialized");
    const [timestamp, action, result, context] = await this.contract.getLog(index);
    return { timestamp: Number(timestamp), action, result, context };
  }

  /**
   * Register a new agent on-chain
   */
  async registerAgent(wallet: string, name: string, role: string): Promise<void> {
    if (!this.contract) throw new Error("Brain not initialized");
    const tx = await this.contract.registerAgent(wallet, name, role);
    await tx.wait();
  }

  /**
   * Get memory count
   */
  async memoryCount(): Promise<number> {
    if (!this.contract) throw new Error("Brain not initialized");
    return Number(await this.contract.memoryCount());
  }

  /**
   * Compile Solidity to bytecode using solcjs or pre-compiled fallback
   */
  private async compileBytecode(): Promise<string> {
    try {
      // Try using solc
      const solc = await import("solc" as any);
      const input = {
        language: "Solidity",
        sources: { "ForemanBrain.sol": { content: MEMORY_CONTRACT_SOURCE } },
        settings: { outputSelection: { "*": { "*": ["evm.bytecode.object"] } }, optimizer: { enabled: true, runs: 200 } },
      };
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      return "0x" + output.contracts["ForemanBrain.sol"]["ForemanBrain"].evm.bytecode.object;
    } catch {
      // Fallback: use pre-compiled bytecode (generated once, hardcoded)
      // This will be populated after first successful compilation
      throw new Error("solc not available — install with: npm install solc");
    }
  }
}
