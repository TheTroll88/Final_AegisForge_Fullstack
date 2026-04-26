"""Security scanning skill — wraps hacking_bot_main.py."""

from logos.skills.base import BaseSkill


class SecurityScanSkill(BaseSkill):
    name = "security_scan"
    trigger = "/scan"
    description = "Run security reconnaissance and vulnerability scanning on a target"
    system_prompt_injection = (
        "You are now in security scanning mode. You have access to tools/hacking_bot_main.py. "
        "Use >> RUN python tools/hacking_bot_main.py [target] to execute scans. "
        "This runs nmap, nuclei, sqlmap, and other security tools against the target. "
        "Analyze results and provide a security assessment."
    )
