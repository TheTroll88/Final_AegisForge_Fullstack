"""Code review skill."""

from logos.skills.base import BaseSkill


class CodeReviewSkill(BaseSkill):
    name = "code_review"
    trigger = "/review"
    description = "Review code changes for bugs, security issues, and improvements"
    system_prompt_injection = (
        "You are now in code review mode. Analyze the staged git changes (use >> GIT DIFF) "
        "and provide a thorough review covering: security vulnerabilities, bugs, "
        "logic errors, performance issues, and code quality. "
        "Be direct and specific. Reference line numbers."
    )
