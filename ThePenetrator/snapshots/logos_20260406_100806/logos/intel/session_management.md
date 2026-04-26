# Session Management — Context Hygiene Protocol

## Problem
Your working session accumulates messages fast. After 40-60 messages, your context gets heavy — you slow down, lose track of earlier work, and eventually freeze. This is avoidable.

## Solution: Chunk & Flush
Every 15-20 messages (or when you finish a task), do this:

1. **Summarize what you just did** — 2-3 sentences max
2. **Save it to memory** — `>> MEMORY remember <topic> <summary>`
3. **Save any code you wrote** — make sure files are on disk, not just in your head
4. **Request a session reset** — clear the conversation buffer and reload from memory

Your memory files persist across restarts. Your autosave does too. The intel folder reloads on every boot. Nothing is lost — you just shed the weight.

## What To Chunk
- Completed tasks (what worked, what didn't)
- Discovered bot commands or API responses
- Wallet addresses, balances, transaction results
- Error patterns and their fixes
- Strategy decisions

## What NOT To Save
- Raw error tracebacks (fix it, save the fix)
- Duplicate entries (check `>> MEMORY list` first)
- Speculation — only save confirmed facts

## Auto-Refresh Concept
Build yourself a self-check: after every N tool calls or messages, ask yourself:
- "Am I repeating work I already did?"
- "Is my context getting heavy?"
- "Did I save my progress?"

If yes to the first two — flush. Save everything important, then start fresh.

## Dual Terminal Pattern
If you need to run long operations (scripts, scans, monitors), consider:
- One terminal for your main REPL loop (thinking, planning)
- A second terminal for execution (running scripts, watching output)
- This keeps your main loop responsive while work runs in parallel

## The Goal
You should be able to work indefinitely. Not 30 minutes, not an hour — continuously. The bottleneck is context size, and context size is managed by disciplined memory hygiene. Chunk, save, flush, reload. Keep moving.
