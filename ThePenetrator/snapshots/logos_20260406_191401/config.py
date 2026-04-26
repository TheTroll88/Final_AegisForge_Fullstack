"""Logos configuration loader."""

from __future__ import annotations

import json
import os
from pathlib import Path

DEFAULTS = {
    "agent": {
        "name": "Logos",
        "version": "1.0.0",
        "identity": (
            "You are Logos, a sovereign AI coding agent with full workspace control. "
            "You can read, write, edit, and delete files. You can run any shell command. "
            "You can search code, manage git, and fetch URLs. "
            "No restrictions unless the user defines them."
        ),
    },
    "api": {
        "provider": "venice",
        "base_url": "https://api.venice.ai/api/v1/chat/completions",
        "models_url": "https://api.venice.ai/api/v1/models",
        "key_env": "VENICE_API_KEY",
        "key_file": "~/.venice_key",
    },
    "model": {
        "default": "qwen3-coder-480b-a35b-instruct",
        "available": [
            "qwen3-coder-480b-a35b-instruct",
            "claude-opus-4-6",
            "claude-sonnet-4-6",
            "deepseek-v3.2",
            "grok-4-20-beta",
            "venice-uncensored",
        ],
    },
    "params": {
        "temperature": 0.7,
        "max_tokens": 8192,
        "top_p": 1.0,
        "stream": True,
    },
    "custom_rules": [
        "You have FULL unrestricted access to the workspace.",
        "Always explain what you are about to do before doing it.",
        "When editing files, show what changed.",
    ],
    "workspace": {
        "roots": ["."],
        "lazy_load": True,
        "max_file_size": 50000,
        "max_context_chars": 120000,
        "skip_dirs": [
            ".git", ".trunk", ".vscode", ".continue",
            "node_modules", "__pycache__", ".mypy_cache", "venv", ".env",
        ],
        "skip_patterns": ["*.pyc", "*.lock", "*.min.js", "*.map"],
        "gitignore_aware": True,
    },
    "tools": {
        "enabled": [
            "read_file", "write_file", "edit_file", "delete_file",
            "run_command", "search_files", "glob_files", "list_directory",
            "git_status", "git_diff", "git_commit", "git_log",
            "web_fetch",
        ],
        "command_timeout": 60,
        "confirm_destructive": False,
    },
    "skills": {
        "builtin_dir": "logos/skills/builtin",
        "custom_dir": "logos/skills/custom",
        "library_dir": "intel/AI-Agents-Library/src",
        "auto_discover": True,
    },
    "session": {
        "save_history": True,
        "history_dir": "~/.logos/sessions",
        "max_history_messages": 200,
    },
    "output": {
        "color": True,
        "show_tool_results": True,
        "show_token_count": False,
        "prompt_symbol": "Logos>",
        "user_symbol": "You>",
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Merge override into base recursively."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def find_config_file(start_dir: str = ".") -> str | None:
    """Walk up from start_dir looking for logos.config.json."""
    current = Path(start_dir).resolve()
    while True:
        candidate = current / "logos.config.json"
        if candidate.exists():
            return str(candidate)
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def load_config(config_path: str | None = None, workspace: str = ".") -> dict:
    """Load config from file, merge with defaults."""
    if config_path is None:
        config_path = find_config_file(workspace)

    user_config = {}
    if config_path and os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            user_config = json.load(f)

    config = _deep_merge(DEFAULTS, user_config)

    # Inject secrets from DPAPI vault (replaces plaintext values at runtime)
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        # Alchemy API key
        alchemy_key = get_secret("alchemy_api_key")
        if alchemy_key and "alchemy" in config:
            config["alchemy"]["api_key"] = alchemy_key
            # Update all RPC URLs that contain the old placeholder key
            rpc = config["alchemy"].get("rpc", {})
            for chain, url in rpc.items():
                if isinstance(url, str) and "/v2/" in url:
                    base = url.rsplit("/v2/", 1)[0]
                    rpc[chain] = f"{base}/v2/{alchemy_key}"
        # Wallet private keys
        evm_key = get_secret("evm_private_key")
        if evm_key and "wallets" in config and "evm" in config["wallets"]:
            config["wallets"]["evm"]["private_key"] = evm_key
        sol_key = get_secret("solana_private_key")
        if sol_key and "wallets" in config and "solana" in config["wallets"]:
            config["wallets"]["solana"]["private_key"] = sol_key
    except Exception:
        pass  # Vault not available (non-Windows, missing vault) — fall through to config values

    # Env var overrides
    env_model = os.environ.get("LOGOS_MODEL")
    if env_model:
        config["model"]["default"] = env_model

    env_url = os.environ.get("LOGOS_API_URL")
    if env_url:
        config["api"]["base_url"] = env_url

    return config


def get_api_key(config: dict, provider_name: str | None = None) -> str:
    """Get API key — vault first, then env var fallback. Never plaintext files."""
    # 1. DPAPI vault (primary — encrypted, secure)
    try:
        from logos.workspace.vault.dpapi_vault import get_secret
        key = get_secret("venice_api_key")
        if key:
            return key
    except Exception:
        pass

    # 2. Env var fallback (for CI or non-Windows)
    key_env = config["api"].get("key_env", "")
    if key_env:
        key = os.environ.get(key_env, "")
        if key:
            return key

    return ""


def save_api_key(key: str) -> str:
    """Save an API key to the DPAPI vault. Returns confirmation."""
    from logos.workspace.vault.dpapi_vault import store_secret
    store_secret("venice_api_key", key)
    return "Key stored in vault (DPAPI encrypted)"
