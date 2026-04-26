"""Logos — entry point. Run with: python -m logos"""

import sys
import os
import argparse

# Add parent dir to path so logos package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logos.core.config import load_config, get_api_key, save_api_key


def main():
    parser = argparse.ArgumentParser(
        prog="logos",
        description="Logos — Your sovereign AI coding agent. 26+ models via Venice AI.",
    )
    parser.add_argument(
        "-w", "--workspace", default=".",
        help="Workspace root directory (default: current dir)",
    )
    parser.add_argument(
        "-c", "--config", default=None,
        help="Path to logos.config.json",
    )
    parser.add_argument(
        "-m", "--model", default=None,
        help="Override default model (e.g. claude-opus-4-6, venice-uncensored)",
    )
    parser.add_argument(
        "--save-key", metavar="KEY",
        help="Save Venice API key to ~/.venice_key",
    )
    parser.add_argument(
        "--no-lazy", action="store_true",
        help="Load all file contents at startup (no lazy loading)",
    )

    args = parser.parse_args()

    # Save key
    if args.save_key:
        path = save_api_key(args.save_key)
        print(f"[+] Venice key saved to {path}")
        print("Run: python -m logos")
        return

    workspace = os.path.abspath(args.workspace)
    config = load_config(args.config, workspace)

    # CLI overrides
    if args.model:
        config["model"]["default"] = args.model
    if args.no_lazy:
        config["workspace"]["lazy_load"] = False

    from logos.cli import run_interactive
    run_interactive(config, workspace)


if __name__ == "__main__":
    main()
