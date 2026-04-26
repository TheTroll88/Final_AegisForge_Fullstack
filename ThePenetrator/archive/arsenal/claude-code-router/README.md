# Claude Code Router — Venice Bridge

Local proxy that intercepts Claude Code CLI requests and routes them through Venice AI's API.
Pay-per-token access to Claude Opus/Sonnet 4.5/4.6 and every other Venice model.

## Setup

```powershell
# 1. Install Claude Code CLI (if not already)
npm install -g @anthropic-ai/claude-code

# 2. Install the router
npm install -g @musistudio/claude-code-router

# 3. Set your Venice API key (if not already in env)
$env:VENICE_API_KEY = "your-key-here"

# 4. Copy config to the router's home directory
Copy-Item .\config.json "$HOME\.claude-code-router\config.json"

# 5. Launch
ccr start
ccr code
```

## Quick Switch (inside Claude Code)

```
/model venice,claude-opus-4-6       # heavy reasoning
/model venice,claude-sonnet-4-6     # fast iteration
/model venice,venice-uncensored     # no restrictions
/model venice,deepseek-v3.2         # cheap bulk work
/model venice,grok-4-20-beta        # speed
```

## Router Scenarios

| Scenario | Model | Why |
|---|---|---|
| default | claude-opus-4-6 | Best reasoning for general tasks |
| think | claude-opus-4-6 | Plan mode / deep reasoning |
| background | claude-sonnet-4-6 | Cheaper for background ops |
| longContext | claude-opus-4-6 | 100k+ token windows |
| webSearch | venice-uncensored | No filter web search |

## How It Works

1. `ccr start` launches a local proxy on `127.0.0.1:3456`
2. Claude Code connects to the proxy instead of Anthropic
3. Router intercepts, transforms request format, maps model IDs
4. Forwards to `api.venice.ai/api/v1/chat/completions`
5. Venice handles inference — you pay per token, no subscription

## Config Location

The router reads from `~/.claude-code-router/config.json`.
This folder's `config.json` is the source — copy it there after changes.
