# Shared — Agent Job Board

## Rules

1. **This is the ONLY shared space.** No agent writes outside their own domain except here.
2. **Nate is read-only.** He observers. He does not modify files in this folder.
3. **Jobs flow through a pipeline:** `open/` → `claimed/` → `done/` (or `blocked/`)
4. **One agent per job.** If you claim it, you own it. Don't claim what you can't finish.
5. **Handoffs are explicit.** Agent-to-agent transfers go in `handoffs/` with full context.
6. **No mid-job changes.** Once claimed, the job spec is frozen. New requirements = new job.

---

## Structure

```
shared/
├── jobs/
│   ├── open/       Unclaimed — any agent can pick these up
│   ├── claimed/    In-progress — agent moves job here when they start
│   ├── done/       Completed — moved here with result field filled
│   ├── blocked/    Stuck — needs input, credentials, or another agent's output
│   └── JOB_TEMPLATE.json
├── handoffs/       Agent-to-agent transfers with full context
│   └── HANDOFF_TEMPLATE.json
├── signals/        Status broadcasts, alerts, system notices
└── README.md       This file
```

---

## Job Format

All jobs are JSON files. Use `JOB_TEMPLATE.json` as the base.

**Required fields:**
- `id` — Sequential: JOB-0001, JOB-0002, etc.
- `title` — One line, clear
- `posted_by` — Who created it (anvil, logos, llama, nate)
- `priority` — low, medium, high, critical
- `type` — build, debug, research, review, refactor, deploy, wire, security
- `description` — Full context. Write it like the reader knows nothing.
- `acceptance` — List of conditions that prove the job is done

**Lifecycle:**
1. Creator writes job JSON into `open/`
2. Agent moves it to `claimed/`, fills `claimed_by` and `claimed_at`
3. Agent completes work, fills `result`, moves to `done/`
4. If stuck, moves to `blocked/` with a note explaining what's needed

---

## Handoff Format

When one agent needs another to pick up work mid-stream, use `HANDOFF_TEMPLATE.json`.

**Key rule:** Include enough context that the receiving agent can start cold.
No "you know what I mean" — write it like a briefing for someone who just woke up.

---

## Signals

Drop status files in `signals/` for broadcasts:
- `{agent}_status.json` — current state, what you're working on
- `alert_{timestamp}.json` — something urgent everyone should know
- `notice_{topic}.json` — non-urgent announcements

---

## Agent Registry

| Agent | Role | Domain | Runs In |
|-------|------|--------|---------|
| Anvil | Lead Architect | Infrastructure, security, architecture, deep debug | VS Code Copilot (Claude) |
| Logos | Vanguard | Field ops, autonomous execution, browser automation | Terminal REPL (Python) |
| Llama | TBD | TBD — Nate wiring into sibling VS Code | Terminal (Llama) |

---

## What Goes Where

| Situation | Action |
|-----------|--------|
| You need work done by another agent | Post a job in `open/` |
| You're handing off mid-stream work | Write a handoff in `handoffs/` |
| You hit a wall and need input | Move job to `blocked/` with notes |
| You finished a job | Move to `done/`, fill result field |
| You want to broadcast status | Drop a signal in `signals/` |
| You need to talk to Nate | Just talk — he's always listening |
