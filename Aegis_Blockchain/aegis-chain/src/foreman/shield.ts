/**
 * AEGIS SHIELD — Honeypot & Threat Detection Engine
 * ==================================================
 * Born from studying a real scammer's operation.
 * Every detection rule comes from an actual observed attack pattern.
 *
 * Plugs into Foreman's autonomy engine as a signal generator.
 * Can also run standalone as a wallet guardian.
 *
 * Detection capabilities:
 *   - Freeze authority analysis (HONEYPOT-001, 004, 005)
 *   - Mass airdrop pattern recognition (HONEYPOT-002)
 *   - Missing metadata flagging (HONEYPOT-003)
 *   - Bot transaction fingerprinting (HONEYPOT-006)
 *   - Unsolicited airdrop alerting (HONEYPOT-007)
 */

// ─── Types ───────────────────────────────────────────────

export interface ThreatReport {
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "WARNING" | "INFO";
  title: string;
  description: string;
  evidence: Record<string, any>;
  timestamp: number;
  walletAffected?: string;
  recommendation: string;
}

export interface TokenProfile {
  mint: string;
  name?: string;
  symbol?: string;
  supply: string;
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  hasMetadata: boolean;
  metadataUri?: string;
  source?: string;          // who sent it to us
  receivedAt?: number;
  amountReceived?: string;
}

export interface TransactionFingerprint {
  sender: string;
  instructionCount: number;
  instructionOrder: string[];  // e.g. ["ComputeBudget", "CreateATA", "Transfer"]
  fee: number;
  txVersion: "legacy" | "v0";
  signerCount: number;
  timing?: number;  // seconds since last tx from same sender
}

export interface ShieldConfig {
  solanaRpc: string;
  monitoredWallets: string[];
  trustedSenders: string[];
  tokenAllowlist: string[];     // known-good mints
  tokenBlocklist: string[];     // known-bad mints (auto-populated)
  alertCallback?: (report: ThreatReport) => void;
  pollIntervalMs: number;
}

// ─── Shield Engine ───────────────────────────────────────

export class AegisShield {
  private config: ShieldConfig;
  private knownThreats: Map<string, ThreatReport[]> = new Map();
  private senderHistory: Map<string, { count: number; firstSeen: number; lastSeen: number }> = new Map();
  private fingerprintCache: Map<string, TransactionFingerprint[]> = new Map();
  private running = false;

  constructor(config: Partial<ShieldConfig> & { solanaRpc: string }) {
    this.config = {
      monitoredWallets: [],
      trustedSenders: [],
      tokenAllowlist: [],
      tokenBlocklist: [],
      pollIntervalMs: 30_000,
      ...config,
    };
  }

  // ─── Core Analysis Methods ─────────────────────────────

  /**
   * HONEYPOT-001 + HONEYPOT-004: Check if a token has active freeze authority
   */
  async analyzeFreeze(mint: string): Promise<ThreatReport[]> {
    const reports: ThreatReport[] = [];

    try {
      const res = await this.rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
      const info = res?.value?.data?.parsed?.info;
      if (!info) return reports;

      const freezeAuth = info.freezeAuthority;
      const mintAuth = info.mintAuthority;

      // HONEYPOT-001: Active freeze authority
      if (freezeAuth && freezeAuth !== "11111111111111111111111111111111") {
        // Check if freeze authority is a funded wallet (not just a PDA)
        const freezeBalance = await this.rpc("getBalance", [freezeAuth]);
        const freezeSol = (freezeBalance?.value ?? 0) / 1e9;

        reports.push({
          ruleId: "HONEYPOT-001",
          severity: freezeSol > 0.1 ? "CRITICAL" : "HIGH",
          title: "Active Freeze Authority Detected",
          description: `Token ${mint.slice(0, 12)}... has freeze authority ${freezeAuth.slice(0, 12)}... with ${freezeSol.toFixed(2)} SOL`,
          evidence: { mint, freezeAuthority: freezeAuth, freezeBalance: freezeSol, mintAuthority: mintAuth },
          timestamp: Date.now(),
          recommendation: "DO NOT interact with this token. Freeze authority can lock your tokens at any time.",
        });
      }

      // HONEYPOT-004: Mint authority renounced but freeze kept
      if (!mintAuth && freezeAuth) {
        reports.push({
          ruleId: "HONEYPOT-004",
          severity: "CRITICAL",
          title: "Classic Honeypot Pattern: Mint Revoked, Freeze Active",
          description: "Mint authority was renounced (looks safe) but freeze authority is still active (the trap)",
          evidence: { mint, mintAuthority: null, freezeAuthority: freezeAuth },
          timestamp: Date.now(),
          recommendation: "HONEYPOT CONFIRMED. This is the most common honeypot pattern.",
        });
      }
    } catch (e: any) {
      // RPC error — don't false-positive
    }

    return reports;
  }

  /**
   * HONEYPOT-005: Check if multiple mints share the same freeze authority
   */
  async analyzeSharedFreeze(mints: string[]): Promise<ThreatReport[]> {
    const reports: ThreatReport[] = [];
    const freezeMap: Map<string, string[]> = new Map();

    for (const mint of mints) {
      try {
        const res = await this.rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
        const fa = res?.value?.data?.parsed?.info?.freezeAuthority;
        if (fa) {
          const existing = freezeMap.get(fa) ?? [];
          existing.push(mint);
          freezeMap.set(fa, existing);
        }
      } catch {}
    }

    for (const [fa, associatedMints] of freezeMap) {
      if (associatedMints.length >= 2) {
        reports.push({
          ruleId: "HONEYPOT-005",
          severity: "CRITICAL",
          title: `Shared Freeze Authority Across ${associatedMints.length} Mints`,
          description: `Freeze authority ${fa.slice(0, 12)}... controls ${associatedMints.length} different token mints — scam factory`,
          evidence: { freezeAuthority: fa, mints: associatedMints, mintCount: associatedMints.length },
          timestamp: Date.now(),
          recommendation: "ALL tokens from this freeze authority are compromised. Block entire cluster.",
        });
      }
    }

    return reports;
  }

  /**
   * HONEYPOT-002: Detect mass airdrop patterns from transaction history
   */
  analyzeMassAirdrop(fingerprints: TransactionFingerprint[]): ThreatReport[] {
    const reports: ThreatReport[] = [];
    const senderCounts: Map<string, number> = new Map();

    for (const fp of fingerprints) {
      senderCounts.set(fp.sender, (senderCounts.get(fp.sender) ?? 0) + 1);
    }

    for (const [sender, count] of senderCounts) {
      if (count >= 10) {  // 10+ transfers from same sender = suspicious
        // Check timing pattern
        const senderTxs = fingerprints.filter(f => f.sender === sender);
        const avgTiming = senderTxs.reduce((sum, f) => sum + (f.timing ?? 60), 0) / senderTxs.length;

        reports.push({
          ruleId: "HONEYPOT-002",
          severity: count >= 50 ? "HIGH" : "MEDIUM",
          title: `Mass Airdrop Pattern: ${count} Transfers from Single Sender`,
          description: `Wallet ${sender.slice(0, 12)}... sent ${count} token transfers, avg ${avgTiming.toFixed(0)}s apart`,
          evidence: { sender, transferCount: count, avgTimingSeconds: avgTiming },
          timestamp: Date.now(),
          recommendation: "Likely automated distribution bot. Do not interact with received tokens.",
        });
      }
    }

    return reports;
  }

  /**
   * HONEYPOT-003: Check token metadata existence
   */
  async analyzeMetadata(mint: string): Promise<ThreatReport[]> {
    const reports: ThreatReport[] = [];

    try {
      // Derive Metaplex metadata PDA
      const METAPLEX = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
      // Check if mint account even has basic info
      const res = await this.rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
      const info = res?.value?.data?.parsed?.info;

      if (info && !info.name && !info.symbol && !info.uri) {
        reports.push({
          ruleId: "HONEYPOT-003",
          severity: "MEDIUM",
          title: "Token Has No Metadata",
          description: `Mint ${mint.slice(0, 12)}... has no name, symbol, or URI — legitimate tokens always register metadata`,
          evidence: { mint, hasName: false, hasSymbol: false, hasUri: false },
          timestamp: Date.now(),
          recommendation: "Absence of metadata is a red flag. Legitimate projects register token names and logos.",
        });
      }
    } catch {}

    return reports;
  }

  /**
   * HONEYPOT-006: Detect bot transaction fingerprints
   */
  analyzeBotFingerprint(fingerprints: TransactionFingerprint[]): ThreatReport[] {
    const reports: ThreatReport[] = [];

    // Group by sender
    const bySender: Map<string, TransactionFingerprint[]> = new Map();
    for (const fp of fingerprints) {
      const existing = bySender.get(fp.sender) ?? [];
      existing.push(fp);
      bySender.set(fp.sender, existing);
    }

    for (const [sender, txs] of bySender) {
      if (txs.length < 5) continue;

      // Check fee consistency
      const fees = txs.map(t => t.fee);
      const feeSet = new Set(fees);
      const feeConsistency = 1 - (feeSet.size - 1) / txs.length;

      // Check instruction pattern consistency
      const patterns = txs.map(t => t.instructionOrder.join("→"));
      const patternSet = new Set(patterns);
      const patternConsistency = 1 - (patternSet.size - 1) / txs.length;

      // Check signer count consistency (bots always use 1)
      const allSingleSigner = txs.every(t => t.signerCount === 1);

      // Check version consistency
      const allLegacy = txs.every(t => t.txVersion === "legacy");

      const isBot = feeConsistency > 0.9 && patternConsistency > 0.9 && allSingleSigner;

      if (isBot) {
        reports.push({
          ruleId: "HONEYPOT-006",
          severity: "HIGH",
          title: `Bot Fingerprint Detected: ${sender.slice(0, 12)}...`,
          description: `${txs.length} transactions with ${(feeConsistency * 100).toFixed(0)}% fee consistency, ${(patternConsistency * 100).toFixed(0)}% pattern consistency`,
          evidence: {
            sender,
            txCount: txs.length,
            feeConsistency: `${(feeConsistency * 100).toFixed(0)}%`,
            patternConsistency: `${(patternConsistency * 100).toFixed(0)}%`,
            singleSigner: allSingleSigner,
            legacyTx: allLegacy,
            dominantFee: fees[0],
            dominantPattern: patterns[0],
          },
          timestamp: Date.now(),
          recommendation: "Automated bot detected. Transactions from this wallet are programmatic, not human.",
        });
      }
    }

    return reports;
  }

  /**
   * HONEYPOT-007: Check for unsolicited incoming tokens
   */
  async analyzeIncomingTokens(wallet: string): Promise<ThreatReport[]> {
    const reports: ThreatReport[] = [];

    try {
      const res = await this.rpc("getTokenAccountsByOwner", [
        wallet,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);

      const accounts = res?.value ?? [];
      for (const acct of accounts) {
        const info = acct.account?.data?.parsed?.info;
        if (!info) continue;

        const mint = info.mint;
        const amount = parseFloat(info.tokenAmount?.uiAmountString ?? "0");

        if (amount > 0 && !this.config.tokenAllowlist.includes(mint)) {
          if (this.config.tokenBlocklist.includes(mint)) {
            reports.push({
              ruleId: "HONEYPOT-007",
              severity: "CRITICAL",
              title: "KNOWN MALICIOUS Token in Wallet",
              description: `Blocklisted token ${mint.slice(0, 12)}... found with ${amount} tokens`,
              evidence: { mint, amount, wallet, onBlocklist: true },
              timestamp: Date.now(),
              walletAffected: wallet,
              recommendation: "Do NOT interact. This token is confirmed malicious.",
            });
          } else {
            reports.push({
              ruleId: "HONEYPOT-007",
              severity: "WARNING",
              title: "Unknown Token Received",
              description: `Token ${mint.slice(0, 12)}... appeared in wallet with ${amount} tokens — not on allowlist`,
              evidence: { mint, amount, wallet },
              timestamp: Date.now(),
              walletAffected: wallet,
              recommendation: "Scan this token before interacting. Run freeze authority and metadata checks.",
            });
          }
        }
      }
    } catch {}

    return reports;
  }

  /**
   * Full scan: Run ALL detection rules on a wallet
   */
  async fullScan(wallet: string): Promise<ThreatReport[]> {
    const allReports: ThreatReport[] = [];

    console.log(`  [Shield] Full scan starting for ${wallet.slice(0, 12)}...`);

    // 1. Check incoming tokens
    const tokenReports = await this.analyzeIncomingTokens(wallet);
    allReports.push(...tokenReports);

    // 2. For each unknown token, run freeze + metadata analysis
    const unknownMints: string[] = [];
    for (const report of tokenReports) {
      const mint = report.evidence.mint;
      if (mint && !this.config.tokenAllowlist.includes(mint)) {
        unknownMints.push(mint);
      }
    }

    for (const mint of unknownMints) {
      const freezeReports = await this.analyzeFreeze(mint);
      allReports.push(...freezeReports);

      const metaReports = await this.analyzeMetadata(mint);
      allReports.push(...metaReports);

      // Auto-blocklist confirmed honeypots
      for (const r of freezeReports) {
        if (r.severity === "CRITICAL" && !this.config.tokenBlocklist.includes(mint)) {
          this.config.tokenBlocklist.push(mint);
          console.log(`  [Shield] Auto-blocklisted: ${mint.slice(0, 12)}...`);
        }
      }
    }

    // 3. Check for shared freeze authorities
    if (unknownMints.length >= 2) {
      const sharedReports = await this.analyzeSharedFreeze(unknownMints);
      allReports.push(...sharedReports);
    }

    // Report summary
    const critical = allReports.filter(r => r.severity === "CRITICAL").length;
    const high = allReports.filter(r => r.severity === "HIGH").length;
    const medium = allReports.filter(r => r.severity === "MEDIUM").length;
    const warning = allReports.filter(r => r.severity === "WARNING").length;

    console.log(`  [Shield] Scan complete: ${critical} CRITICAL, ${high} HIGH, ${medium} MEDIUM, ${warning} WARNING`);

    // Fire alerts
    for (const report of allReports) {
      if (this.config.alertCallback) {
        this.config.alertCallback(report);
      }
      this.addThreat(wallet, report);
    }

    return allReports;
  }

  // ─── Foreman Integration ───────────────────────────────

  /**
   * Signal generator for Foreman's autonomy engine.
   * Returns signals when threats are detected.
   */
  async generateSignals(): Promise<Array<{
    type: "alert" | "opportunity";
    confidence: number;
    priority: number;
    description: string;
    params: Record<string, any>;
  }>> {
    const signals: any[] = [];

    for (const wallet of this.config.monitoredWallets) {
      const reports = await this.fullScan(wallet);

      for (const report of reports) {
        const confidence = report.severity === "CRITICAL" ? 0.95
          : report.severity === "HIGH" ? 0.8
          : report.severity === "MEDIUM" ? 0.6
          : 0.4;

        signals.push({
          type: "alert",
          confidence,
          priority: report.severity === "CRITICAL" ? 10 : report.severity === "HIGH" ? 7 : 4,
          description: `[${report.ruleId}] ${report.title}`,
          params: {
            ...report.evidence,
            recommendation: report.recommendation,
            ruleId: report.ruleId,
            severity: report.severity,
          },
        });
      }
    }

    return signals;
  }

  // ─── Helpers ───────────────────────────────────────────

  private async rpc(method: string, params: any[]): Promise<any> {
    const res = await fetch(this.config.solanaRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  private addThreat(wallet: string, report: ThreatReport) {
    const existing = this.knownThreats.get(wallet) ?? [];
    existing.push(report);
    this.knownThreats.set(wallet, existing);
  }

  getThreats(wallet?: string): ThreatReport[] {
    if (wallet) return this.knownThreats.get(wallet) ?? [];
    return Array.from(this.knownThreats.values()).flat();
  }

  getBlocklist(): string[] {
    return [...this.config.tokenBlocklist];
  }
}
