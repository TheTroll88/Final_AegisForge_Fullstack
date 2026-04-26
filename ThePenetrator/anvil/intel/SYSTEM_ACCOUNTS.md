# System Accounts & User Profiles
**Compiled by:** Anvil (Lead Architect)
**Date:** 2026-04-12
**Source:** `Get-LocalUser`, `Get-LocalGroupMember`, user profile directory scan
**Classification:** SENSITIVE — contains account security findings

---

## 1. Local User Accounts

### 1a. natha (PRIMARY)
| Field | Value |
|-------|-------|
| Name | `natha` |
| Full Name | Nathaniel Crigger |
| SID | Standard user SID |
| Status | **Enabled** |
| Groups | Administrators |
| Profile | `C:\Users\natha` |
| Last Login | Active (current session) |
| Created | System install |
| Notes | Primary account. All credentials, vaults, and projects belong here. |

### 1b. Administrator (BUILT-IN)
| Field | Value |
|-------|-------|
| Name | `Administrator` |
| Status | **Disabled** |
| Groups | Administrators |
| Profile | N/A (never used) |
| Notes | Default built-in admin. Disabled as expected. No action needed. |

### 1c. CodexSandboxOffline
| Field | Value |
|-------|-------|
| Name | `CodexSandboxOffline` |
| Status | **Enabled** |
| Groups | Users (NOT Administrators) |
| Created | 2026-04-08 |
| Last Login | **Never** |
| Profile | Exists (minimal) |
| Created By | **OpenAI Codex CLI** |
| Evidence | `.codex/.sandbox-secrets/sandbox_users.json` (version 5, DPAPI-encrypted password) |
| Notes | Created by Codex CLI for sandboxed code execution. DPAPI password stored in sandbox config. Never interactively logged in. |

### 1d. CodexSandboxOnline
| Field | Value |
|-------|-------|
| Name | `CodexSandboxOnline` |
| Status | **Enabled** |
| Groups | Users (NOT Administrators) |
| Created | 2026-04-08 |
| Last Login | **Never** |
| Profile | Exists (minimal) |
| Created By | **OpenAI Codex CLI** |
| Evidence | `.codex/.sandbox-secrets/sandbox_users.json` (version 5, DPAPI-encrypted password) |
| Notes | Same origin as CodexSandboxOffline. For online-mode sandbox execution. Never interactively logged in. |

### 1e. WsiAccount
| Field | Value |
|-------|-------|
| Name | `WsiAccount` |
| Status | **Disabled** |
| Groups | Users |
| Created | ~2026-03-24 (profile date) |
| Last Login | Unknown |
| Profile | `C:\Users\WsiAccount` — full profile with NTUSER.DAT |
| Notes | Full profile exists with registry hive. Origin unknown — possibly from a Windows Subsystem for Insight or similar tool. Disabled, not a security risk. |

---

## 2. Orphaned Profile (NO MATCHING ACCOUNT)

### 2a. nThisIsATypo
| Field | Value |
|-------|-------|
| Profile Path | `C:\Users\nThisIsATypo` |
| Profile Created | 2026-03-22 |
| Local Account | **DOES NOT EXIST** (not in `Get-LocalUser`) |
| Contents | Single file: `test.py` containing `print("test")` |
| Security Events | Windows Security Event Log (Event ID 4720) returned **no results** for account creation |
| **ANOMALY** | A profile directory exists that has no matching Windows account. This means either: (a) the account was created and deleted but the profile was orphaned, (b) the profile was created by software that doesn't use standard account creation APIs, or (c) manual directory creation. |
| Risk | **Low** — contains only a trivial test file, no credentials. But the naming is suspicious ("nThisIsATypo"). |
| Recommended | Investigate origin. Safe to delete if no further evidence found. |

---

## 3. Codex Sandbox Configuration

| Field | Value |
|-------|-------|
| Config File | `C:\Users\natha\.codex\.sandbox-secrets\sandbox_users.json` |
| Config Version | 5 |
| Users Defined | 2 (CodexSandboxOffline, CodexSandboxOnline) |
| Password Storage | DPAPI (`ConvertTo-SecureString`) — only decryptable by `natha` account |
| Auth File | `C:\Users\natha\.codex\auth.json` — contains OpenAI project key (`sk-proj-...`) |
| Auth Key Status | **LIVE** — vaulted as `CODEX_OPENAI_KEY.sec` |

### Sandbox Security Assessment
| Check | Result |
|-------|--------|
| Accounts in Administrators group? | **NO** — Users group only |
| Accounts ever logged in? | **NO** — never interactively used |
| Network access? | Limited — sandbox isolation intended |
| Password exposure? | **NO** — DPAPI encrypted, only Nate's account can decrypt |
| Recommendation | Safe to leave enabled if Codex CLI is in use. Disable if Codex is abandoned. |

---

## 4. Summary

| Account | Status | Risk | Action |
|---------|--------|------|--------|
| natha | Active, primary | N/A | None |
| Administrator | Disabled | None | None |
| CodexSandboxOffline | Enabled, never used | Low | Disable if Codex abandoned |
| CodexSandboxOnline | Enabled, never used | Low | Disable if Codex abandoned |
| WsiAccount | Disabled | None | None |
| nThisIsATypo (orphaned) | Profile only, no account | Low | Investigate and clean up |

---

*Cross-reference: MASTER_CREDENTIAL_INVENTORY.md Items #57-58 (Codex sandbox passwords)*
*Cross-reference: MASTER_CREDENTIAL_INVENTORY.md Item #1 (Codex OpenAI key)*
