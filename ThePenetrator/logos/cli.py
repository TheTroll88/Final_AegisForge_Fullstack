"""Logos CLI — REPL loop and slash command handling."""

import os
import sys

from logos.core.agent import SYSTEM_TEMPLATE, AgentLoop
from logos.core.config import get_api_key, load_config
from logos.core.session import Session
from logos.llm.client import LLMClient
from logos.llm.models import ModelRegistry
from logos.output.formatter import Formatter
from logos.output.workbench import Workbench
from logos.skills.loader import SkillLoader
from logos.tools.algo_sense import AlgoSenseTool
from logos.tools.bemp_fanout import BEMPFanoutTool
from logos.tools.chain_tools import ChainQueryTool
from logos.tools.ddg_search import DDGNewsTool, DDGSearchTool
from logos.tools.file_ops import (
    DeleteFileTool,
    EditFileTool,
    ReadFileTool,
    WriteFileTool,
)
from logos.tools.git_ops import GitCommitTool, GitDiffTool, GitLogTool, GitStatusTool
from logos.tools.lab_terminal_tool import LabTerminalTool
from logos.tools.learning import LearningTool
from logos.tools.openrouter_fanout import OpenRouterFanoutTool
from logos.tools.plutus_tool import PlutusTool
from logos.tools.registry import ToolRegistry
from logos.tools.search import GlobFilesTool, ListDirectoryTool, SearchFilesTool
from logos.tools.shell import RunCommandTool
from logos.tools.telegram_memory import TelegramMemoryTool
from logos.tools.telegram_tool import TelegramTool
from logos.tools.venice_tools import (
    BalanceTool,
    EmbeddingsTool,
    ImageGenTool,
    TranscribeTool,
    TTSTool,
    WebSearchTool,
)
from logos.tools.vscode_extensions import ExtensionManagerTool
from logos.tools.web_fetch import WebFetchTool
from logos.workspace.scanner import WorkspaceScanner


def build_tool_registry(config: dict, client=None) -> ToolRegistry:
    """Create and populate the tool registry."""
    registry = ToolRegistry()
    enabled = set(config["tools"]["enabled"])
    timeout = config["tools"].get("command_timeout", 60)

    all_tools = [
        ReadFileTool(),
        WriteFileTool(),
        EditFileTool(),
        DeleteFileTool(),
        RunCommandTool(default_timeout=timeout),
        SearchFilesTool(),
        GlobFilesTool(),
        ListDirectoryTool(),
        GitStatusTool(),
        GitDiffTool(),
        GitCommitTool(),
        GitLogTool(),
        WebFetchTool(),
        # Venice-powered tools
        ImageGenTool(client=client),
        TTSTool(client=client),
        TranscribeTool(client=client),
        EmbeddingsTool(client=client),
        BalanceTool(client=client),
        WebSearchTool(client=client),
        # DuckDuckGo search (free, no API key)
        DDGSearchTool(),
        DDGNewsTool(),
        # Blockchain RPC tool
        ChainQueryTool(alchemy_config=config.get("alchemy", {})),
        # Plutus Bitcoin scanner
        PlutusTool(),
        # Telegram
        TelegramTool(),
        # Persistent memory
        LearningTool(),
        # Cloud memory — Telegram-backed persistent storage
        TelegramMemoryTool(),
        # LAB Terminal trading bot
        LabTerminalTool(),
        # BEMP fan-out — query all browser AI models in parallel
        BEMPFanoutTool(),
        # OpenRouter fan-out — query multiple API models in parallel
        OpenRouterFanoutTool(
            api_key=config.get("providers", {}).get("openrouter", {}).get("api_key", "")
        ),
        # Algo Sense — 80 algorithm implementations
        AlgoSenseTool(),
        # VS Code Extension Manager — full control over extensions
        ExtensionManagerTool(),
    ]

    for tool in all_tools:
        if tool.name in enabled:
            registry.register(tool)

    return registry


def build_skill_loader(config: dict, workspace: str) -> SkillLoader:
    """Create and populate the skill loader."""
    loader = SkillLoader()

    builtin_dir = config["skills"].get("builtin_dir", "logos/skills/builtin")
    if not os.path.isabs(builtin_dir):
        builtin_dir = os.path.join(workspace, builtin_dir)
    loader.load_directory(builtin_dir)

    custom_dir = config["skills"].get("custom_dir", "logos/skills/custom")
    if not os.path.isabs(custom_dir):
        custom_dir = os.path.join(workspace, custom_dir)
    loader.load_directory(custom_dir)

    # Load AI-Agents-Library templates if configured
    library_dir = config["skills"].get("library_dir", "")
    if library_dir:
        if not os.path.isabs(library_dir):
            library_dir = os.path.join(workspace, library_dir)
        loader.load_directory(library_dir)

    return loader


def run_interactive(config: dict, workspace: str):
    """Main interactive REPL."""
    fmt = Formatter(
        color=config["output"]["color"],
        prompt_symbol=config["output"]["prompt_symbol"],
        user_symbol=config["output"]["user_symbol"],
    )

    # ── Gateway bootstrap ─────────────────────────────────────────────
    # Start our local gateway so all requests route through our own key.
    # The gateway handles backend cascading (Venice → decentralized fallback).
    gateway_key = ""
    gateway_url = ""
    try:
        from logos.gateway import _load_gateway_key, start_gateway

        gateway_key = _load_gateway_key()
        if gateway_key:
            _gw = start_gateway(port=11435, background=True)
            if _gw:
                gateway_url = "http://127.0.0.1:11435/v1/chat/completions"
                fmt.info("Gateway: online (port 11435)")
    except Exception as e:
        fmt.info(f"Gateway failed to start: {e}")

    # Check API key — gateway key first, then Venice vault/env
    if gateway_key:
        api_key = gateway_key
    else:
        api_key = get_api_key(config)
    if not api_key:
        key_env = config["api"].get("key_env", "OPENROUTER_API_KEY")
        fmt.error("No API key found (gateway, vault, or providers config).")
        fmt.info(f'Set it: export {key_env}="your-key"')
        fmt.info("Or: python -m logos --save-key YOUR_KEY")
        sys.exit(1)

    # Init components — route through gateway if available, else direct to configured provider
    provider = config["api"].get("provider", "openai")
    base_url = gateway_url if gateway_url else config["api"]["base_url"]
    venice_params = config.get("venice_parameters", {})
    caching_config = config.get("prompt_caching", {})
    client = LLMClient(
        api_key,
        base_url,
        config["params"],
        provider=provider,
        venice_parameters=venice_params,
        prompt_caching=caching_config,
    )

    # Wire up multi-provider routing if configured
    providers_cfg = config.get("providers", {})
    if providers_cfg:
        resolved = {}
        for name, pcfg in providers_cfg.items():
            key = pcfg.get("api_key", "")
            # Resolve vault references like $VAULT:groq_api_key
            if key.startswith("$VAULT:"):
                try:
                    from logos.workspace.vault.dpapi_vault import get_secret

                    key = get_secret(key[7:]) or ""
                except Exception:
                    key = ""
            # Resolve env var references like $OPENAI_API_KEY
            elif key.startswith("$"):
                key = os.environ.get(key[1:], "")
            resolved[name] = {
                "api_key": key,
                "base_url": pcfg.get("base_url", ""),
                "provider_type": pcfg.get("provider_type", "openai"),
                "venice_parameters": pcfg.get("venice_parameters", {}),
            }
        model_routing = config.get("model_routing", {})
        client.set_providers(resolved, model_routing)

    # Wire up additional Venice API endpoints
    api_urls = {}
    for key in (
        "images_url",
        "audio_speech_url",
        "audio_transcriptions_url",
        "embeddings_url",
        "billing_url",
        "video_url",
        "characters_url",
    ):
        if key in config["api"]:
            api_urls[key] = config["api"][key]
    client.set_api_urls(api_urls)

    model_reg = ModelRegistry(config["model"]["default"], config["model"]["available"])
    registry = build_tool_registry(config, client=client)
    session = Session(
        history_dir=config["session"].get("history_dir", "~/.logos/sessions"),
        max_messages=config["session"].get("max_history_messages", 200),
        max_context_tokens=config["session"].get("max_context_tokens", 8000),
    )

    # Scan workspace
    fmt.info("Scanning workspace...")
    ws_config = config["workspace"]
    scanner = WorkspaceScanner(
        roots=[workspace],
        skip_dirs=ws_config["skip_dirs"],
        skip_patterns=ws_config.get("skip_patterns", []),
        max_file_size=ws_config["max_file_size"],
        gitignore_aware=ws_config.get("gitignore_aware", True),
    )
    tree, contents = scanner.build_context(
        lazy=ws_config.get("lazy_load", True),
        max_chars=ws_config.get("max_context_chars", 120000),
    )

    # Load skills
    skill_loader = build_skill_loader(config, workspace)
    skills = skill_loader.list_skills()

    # Build system prompt
    workbench = Workbench()
    agent = AgentLoop(
        client,
        registry,
        session,
        fmt,
        model_reg.current,
        workspace,
        workbench=workbench,
    )
    sys_prompt = agent.build_system_prompt(config, tree, contents)

    # Inject intel briefings into system prompt (only for providers with large context budgets)
    # Skip for rate-limited providers like Groq free tier (12K TPM)
    api_base = config["api"].get("base_url", "")
    provider_name = config.get("model_routing", {}).get(model_reg.current, "")
    provider_base = (
        config.get("providers", {}).get(provider_name, {}).get("base_url", api_base)
    )
    skip_intel = "groq.com" in provider_base
    intel_dir = os.path.join(workspace, "logos", "intel")

    # Sync cloud memory from Telegram before loading intel files
    if os.path.isdir(intel_dir) and not skip_intel:
        try:
            from logos.tools.telegram_memory import TelegramMemoryTool

            _cloud_mem = TelegramMemoryTool()
            _sync_result = _cloud_mem.execute({"action": "sync"}, workspace)
            if _sync_result.success:
                fmt.info(f"Cloud memory: {_sync_result.output}")
            else:
                fmt.info("Cloud memory: offline (Telegram not connected)")
        except Exception:
            fmt.info("Cloud memory: skipped (sync error)")

    if os.path.isdir(intel_dir) and not skip_intel:
        for fname in sorted(os.listdir(intel_dir)):
            if fname.endswith(".md"):
                fpath = os.path.join(intel_dir, fname)
                try:
                    with open(fpath, encoding="utf-8") as bf:
                        sys_prompt += f"\n\n== INTEL: {fname} ==\n{bf.read()}"
                except Exception:
                    pass

    session.set_system(sys_prompt)

    # Auto-resume from last session if available
    resumed = 0
    if session.has_autosave():
        resumed = session.resume_autosave()
        session.set_system(sys_prompt)

    # Banner
    fmt.logo()
    fmt.info(f"Model: {model_reg.current}")
    if gateway_url:
        fmt.info("Provider: Logos Gateway")
    else:
        # Show provider name from config or URL domain
        provider_name = config["api"].get("provider", "openai")
        provider_url = config["api"]["base_url"]
        # Friendly names for known providers
        provider_labels = {
            "openrouter.ai": "OpenRouter",
            "venice.ai": "Venice AI",
            "api.groq.com": "Groq",
            "api.openai.com": "OpenAI",
            "api.anthropic.com": "Anthropic",
        }
        label = next(
            (v for k, v in provider_labels.items() if k in provider_url), provider_name
        )
        fmt.info(f"Provider: {label} ({provider_url})")
    fmt.info(f"Workspace: {workspace}")
    fmt.info(f"Tools: {len(registry.list_tools())} loaded")
    fmt.info(f"Skills: {len(skills)} loaded")
    if resumed:
        fmt.success(f"[Resumed from last session — {resumed} messages restored]")
    fmt.info(
        "Commands: /help  /quit  /clear  /model  /skills  /save  /load  /rescan  /reload"
    )
    fmt.divider()

    # REPL
    while True:
        user_input = fmt.user_prompt()
        if not user_input:
            continue

        # Slash commands
        if user_input.startswith("/"):
            cmd_parts = user_input.split(maxsplit=1)
            cmd = cmd_parts[0].lower()
            cmd_args = cmd_parts[1] if len(cmd_parts) > 1 else ""

            if cmd in ("/quit", "/exit"):
                fmt.info("Bye.")
                break

            elif cmd == "/clear":
                session.clear()
                fmt.success("[Chat cleared]")
                continue

            elif cmd == "/model":
                if cmd_args:
                    model_reg.switch(cmd_args.strip())
                    agent.model = model_reg.current
                    fmt.success(f"[Switched to {model_reg.current}]")
                else:
                    fmt.info(f"Current: {model_reg.current}")
                    fmt.info("Available:")
                    for m in model_reg.list_models():
                        marker = " <--" if m == model_reg.current else ""
                        fmt.info(f"  {m}{marker}")
                continue

            elif cmd == "/rescan":
                fmt.info("Rescanning workspace...")
                tree, contents = scanner.build_context(
                    lazy=ws_config.get("lazy_load", True),
                    max_chars=ws_config.get("max_context_chars", 120000),
                )
                sys_prompt = agent.build_system_prompt(config, tree, contents)
                # Re-inject intel briefings
                if os.path.isdir(intel_dir):
                    for fname in sorted(os.listdir(intel_dir)):
                        if fname.endswith(".md"):
                            fpath = os.path.join(intel_dir, fname)
                            try:
                                with open(fpath, encoding="utf-8") as bf:
                                    sys_prompt += (
                                        f"\n\n== INTEL: {fname} ==\n{bf.read()}"
                                    )
                            except Exception:
                                pass
                session.set_system(sys_prompt)
                fmt.success("[Workspace reloaded]")
                continue

            elif cmd == "/reload":
                skill_loader = build_skill_loader(config, workspace)
                skills = skill_loader.list_skills()
                fmt.success(f"[Reloaded {len(skills)} skills]")
                continue

            elif cmd == "/skills":
                if skills:
                    for trigger, desc in skills:
                        fmt.info(f"  {trigger:20s} {desc[:60]}")
                else:
                    fmt.info("No skills loaded.")
                continue

            elif cmd == "/save":
                name = cmd_args.strip() if cmd_args else None
                path = session.save(name)
                fmt.success(f"[Saved to {path}]")
                continue

            elif cmd == "/load":
                if not cmd_args.strip():
                    sessions = session.list_sessions()
                    if sessions:
                        fmt.info("Saved sessions:")
                        for s in sessions:
                            fmt.info(f"  {s}")
                    else:
                        fmt.info("No saved sessions.")
                    continue
                if session.load(cmd_args.strip()):
                    session.set_system(sys_prompt)
                    fmt.success(f"[Loaded '{cmd_args.strip()}']")
                else:
                    fmt.error(f"Session '{cmd_args.strip()}' not found.")
                continue

            elif cmd == "/config":
                import json

                fmt.info(json.dumps(config, indent=2))
                continue

            elif cmd == "/workbench":
                import subprocess

                tail_cmd = workbench.get_tail_command()
                subprocess.Popen(
                    [
                        "powershell",
                        "-NoProfile",
                        "-Command",
                        f"$Host.UI.RawUI.WindowTitle = 'Logos Workbench'; {tail_cmd}",
                    ],
                    creationflags=0x00000010,  # CREATE_NEW_CONSOLE
                )
                fmt.success(f"[Workbench opened in new terminal]")
                continue

            elif cmd == "/peek":
                n = int(cmd_args.strip()) if cmd_args.strip().isdigit() else 80
                content = workbench.peek(n)
                if content.strip():
                    session.add("user", f"[WORKBENCH — last {n} lines]\n{content}")
                    fmt.success(f"[Loaded {n} lines from workbench into context]")
                    agent.run_turn()
                else:
                    fmt.info("Workbench is empty.")
                continue

            elif cmd == "/bench":
                sub = cmd_args.strip().lower()
                if sub == "clear":
                    workbench.clear()
                    fmt.success("[Workbench cleared]")
                elif sub == "path":
                    fmt.info(workbench.get_path())
                else:
                    fmt.info("/bench clear    Clear workbench log")
                    fmt.info("/bench path     Show workbench log path")
                continue

            elif cmd == "/cache":
                stats = client.get_cache_stats()
                if stats:
                    total = stats["prompt_tokens"]
                    cached = stats["cached_tokens"]
                    created = stats["cache_creation_tokens"]
                    hit_rate = (cached / total * 100) if total > 0 else 0
                    fmt.info(f"Prompt tokens: {total}")
                    fmt.info(f"Cached (read): {cached} ({hit_rate:.1f}% hit rate)")
                    fmt.info(f"Cache writes:  {created}")
                    fmt.info(f"Completion:    {stats['completion_tokens']}")
                    if client._session_cache_key:
                        fmt.info(f"Session key:   {client._session_cache_key}")
                else:
                    fmt.info("No cache stats yet — send a message first.")
                continue

            elif cmd == "/help":
                fmt.info("/quit             Exit Logos")
                fmt.info("/clear            Clear conversation")
                fmt.info("/model [NAME]     Switch model (26 models via Venice)")
                fmt.info("/rescan           Rescan workspace")
                fmt.info("/reload           Reload skills")
                fmt.info("/skills           List all skills (builtin + 505 library)")
                fmt.info("/save [NAME]      Save session")
                fmt.info("/load [NAME]      Load session")
                fmt.info("/config           Show config")
                fmt.info("/cache            Show prompt cache stats (hit rate, tokens)")
                fmt.info("/workbench        Open workbench tail in a new terminal")
                fmt.info(
                    "/peek [N]         Pull last N lines from workbench into context"
                )
                fmt.info("/bench clear|path Manage workbench log")
                fmt.info("/help             Show this help")
                fmt.info("")
                fmt.info("Venice Tools (in chat, Logos uses >> commands):")
                fmt.info("  >> IMAGE prompt     Generate image")
                fmt.info("  >> TTS text         Text-to-speech")
                fmt.info("  >> TRANSCRIBE file  Speech-to-text")
                fmt.info("  >> EMBED text       Get embeddings")
                fmt.info("  >> BALANCE          Check Venice balance")
                fmt.info("  >> WEB_SEARCH query Web search (--scrape for full page)")
                fmt.info(
                    "  >> CHAIN chain method  Blockchain RPC (eth/base/sol/polygon/arb/opt/zora)"
                )
                fmt.info("  >> PLUTUS start|stop|status|hits  Bitcoin key scanner")
                fmt.info(
                    "  >> TELEGRAM setup|login|status|chats|read|search|send|info  Telegram access"
                )
                if skills:
                    fmt.info(f"\nSkills: {len(skills)} loaded (type /skills to list)")
                continue

            else:
                # Check if it's a skill trigger
                skill = skill_loader.get(cmd)
                if skill:
                    result = skill.on_trigger(cmd_args, {"workspace": workspace})
                    if result:
                        session.add("user", result)
                        if cmd_args:
                            session.add("user", cmd_args)
                        agent.run_turn()
                    else:
                        fmt.success(f"[Skill '{skill.name}' activated]")
                    continue
                else:
                    fmt.error(f"Unknown command: {cmd}. Type /help.")
                    continue

        # Regular message
        session.add("user", user_input)
        agent.run_turn()
