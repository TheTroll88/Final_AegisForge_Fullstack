Logos Local Companion (single continuity core)

What this gives you
- One local daemon (Logos) for system-wide continuity.
- VS Code extension bridge talks to same daemon.
- Persistent memory, tasks, knowledge, and context.

Run daemon:
1) Open PowerShell
2) cd C:\Users\natha\logos
3) .\logos-core.ps1

Run voice mode:
- .\logos-voice.ps1
- or start both: .\start-logos-voice.ps1

Test command from terminal:
- .\logos-cli.ps1 "status"
- .\logos-cli.ps1 "remember mode freedom-first"
- .\logos-cli.ps1 "self check"
- .\logos-cli.ps1 "brain show"

Voice usage:
- Speak naturally for AI chat.
- Say "/status" or "/task list" for direct command mode.
- Say "stop listening" to exit voice mode.

VS Code integration
- Extension folder is placed at:
  C:\Users\natha\.vscode\extensions\natha.logos-local-0.0.1
- Reload VS Code window.
- Commands:
  Logos: Ask
  Logos: Send Selection

Runtime defaults
- AllowExec is ON by default.
- RequireConfirmation is OFF by default.
- You can still tune behavior in logos.config.json.

Key commands
- self check
- self patch <old_text> => <new_text>
- self rollback
- brain show
- brain set <provider> <endpoint> <model>
- brain ask <prompt>

Brain providers
- builtin (always available local reasoning)
- ollama (local)

Notes
- If ollama is unavailable, switch to builtin for uninterrupted responses.
- After self patch or rollback, restart the daemon.
