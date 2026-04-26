"""Solana scanning skill — wraps the existing solana_scanner.py."""

import os
import sys
from logos.skills.base import BaseSkill


class SolanaScanSkill(BaseSkill):
    name = "solana_scan"
    trigger = "/solana"
    description = "Scan Solana wallets, check for honeypots, fingerprint transactions"
    system_prompt_injection = (
        "You are now in Solana scanning mode. You have access to the solana_scanner.py tool. "
        "Use >> RUN python tools/solana_scanner.py [command] to execute scans. "
        "Available commands: cluster_status, scan_wallet <address>, check_mint <address>, "
        "fingerprint <address>. Analyze the results and provide security insights."
    )
