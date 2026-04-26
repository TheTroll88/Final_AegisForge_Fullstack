"""Logos Boot Loader."""

import os
import sys

from logos.llm.models import ModelRegistry
from logos.tools.learning import LearningTool
from logos.workspace.vault import dpapi_vault


def initialize_vanguard():
    print("--- [ LOGOS BOOT ] ---")

    # Load directive if present
    directive_path = "c:/Users/natha/OneDrive/ThePenetrator/logos/DIRECTIVE.md"
    if os.path.exists(directive_path):
        print("[+] Directive loaded.")

    # Initialize components
    memory = LearningTool()
    registry = ModelRegistry(
        default="gpt-4-turbo", available=["gpt-4-turbo", "claude-3-opus"]
    )
    print(f"[+] Model: {registry.current}")

    # Vault check
    vault_keys = ["OPENAI_API_KEY", "SOLANA_MAINNET_RPC"]
    missing = [k for k in vault_keys if not dpapi_vault.get_secret(k)]
    if missing:
        print(f"[!] Missing keys: {', '.join(missing)}")
    else:
        print("[+] Vault: all keys loaded.")

    print("\n[READY] Logos is online.")
    return memory, registry


if __name__ == "__main__":
    memory, registry = initialize_vanguard()
