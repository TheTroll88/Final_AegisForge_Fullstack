"""Telegram Cloud Memory — persistent memory backed by Telegram Saved Messages.

Uses Telegram's free unlimited cloud storage as a durable memory backend.
Each memory is a structured message in Saved Messages with hashtag-based
topic indexing. Survives everything — machine resets, file wipes, reinstalls.

Format per message:
    #logos_mem #topic_name
    [2026-04-09 14:23 UTC]
    Content here...

Actions:
    store   — save a memory under a topic to Saved Messages
    recall  — retrieve memories for a specific topic
    recent  — get the N most recent memories (any topic)
    topics  — list all known memory topics
    forget  — delete a memory message by ID
    sync    — pull recent memories and write to intel/_cloud_context.md
"""

from __future__ import annotations

import os
import re
import asyncio
from datetime import datetime, timezone
from logos.tools.base import BaseTool, ToolResult

# Where to write synced context for boot injection
INTEL_DIR = None  # set at runtime from workspace

MEMORY_TAG = "#logos_mem"
MAX_SYNC_MESSAGES = 30
MAX_RECALL = 50


def _run(coro):
    """Run async code from sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result(timeout=60)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _get_client():
    """Create a Telethon client from saved config."""
    config_dir = os.path.expanduser("~/.logos/telegram")
    config_file = os.path.join(config_dir, "config.json")
    session_file = os.path.join(config_dir, "logos")

    if not os.path.exists(config_file):
        return None, "Telegram not configured. Use >> TELEGRAM setup first."

    import json
    with open(config_file, "r") as f:
        cfg = json.load(f)

    api_id = cfg.get("api_id")
    api_hash = cfg.get("api_hash")
    if not api_id or not api_hash:
        return None, "Telegram credentials missing. Use >> TELEGRAM setup first."

    try:
        from telethon import TelegramClient
    except ImportError:
        return None, "telethon not installed. Run: pip install telethon"

    os.makedirs(config_dir, exist_ok=True)
    client = TelegramClient(session_file, int(api_id), api_hash)
    return client, None


def _parse_topic(text: str) -> str | None:
    """Extract topic from a memory message."""
    match = re.search(r'#logos_mem\s+#(\w+)', text or "")
    return match.group(1) if match else None


class TelegramMemoryTool(BaseTool):
    """Cloud memory backed by Telegram Saved Messages — survives everything."""

    name = "cloud_memory"
    description = (
        "Persistent cloud memory via Telegram. Store/recall knowledge that survives "
        "across sessions, machines, and wipes. Topics are hashtag-indexed."
    )
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["store", "recall", "recent", "topics", "forget", "sync"],
                "description": (
                    "store=save memory, recall=get by topic, recent=latest N, "
                    "topics=list all, forget=delete by msg_id, sync=pull to intel file"
                ),
            },
            "topic": {
                "type": "string",
                "description": "Memory topic (for store/recall). Use snake_case.",
            },
            "content": {
                "type": "string",
                "description": "Content to store (for store action).",
            },
            "limit": {
                "type": "integer",
                "description": "Number of memories to return (default: 10).",
            },
            "msg_id": {
                "type": "integer",
                "description": "Message ID to delete (for forget action).",
            },
        },
        "required": ["action"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "").lower()

        if action == "store":
            return self._store(params)
        elif action == "recall":
            return self._recall(params)
        elif action == "recent":
            return self._recent(params)
        elif action == "topics":
            return self._topics()
        elif action == "forget":
            return self._forget(params)
        elif action == "sync":
            return self._sync(workspace)
        else:
            return ToolResult(
                False,
                f"Unknown action '{action}'. Use: store, recall, recent, topics, forget, sync",
                self.name,
            )

    def _store(self, params: dict) -> ToolResult:
        """Send a memory message to Saved Messages."""
        topic = params.get("topic", "").strip()
        content = params.get("content", "").strip()

        if not topic:
            return ToolResult(False, "Need a topic name.", self.name)
        if not content:
            return ToolResult(False, "Need content to store.", self.name)

        # Sanitize topic to snake_case
        topic = re.sub(r'[^a-zA-Z0-9_]', '_', topic).lower().strip('_')
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        message = f"{MEMORY_TAG} #{topic}\n[{timestamp}]\n{content}"

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def send():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return "Not authenticated. Run >> TELEGRAM login first."
            # Send to "Saved Messages" (target = "me")
            await client.send_message("me", message)
            await client.disconnect()
            return None

        error = _run(send())
        if error:
            return ToolResult(False, error, self.name)

        return ToolResult(True, f"Stored cloud memory: #{topic}", self.name)

    def _recall(self, params: dict) -> ToolResult:
        """Search Saved Messages for a specific topic."""
        topic = params.get("topic", "").strip()
        if not topic:
            return ToolResult(False, "Need a topic to recall.", self.name)

        topic = re.sub(r'[^a-zA-Z0-9_]', '_', topic).lower().strip('_')
        limit = min(params.get("limit", 10), MAX_RECALL)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            # Search in Saved Messages for the topic tag
            messages = await client.get_messages(
                "me", search=f"{MEMORY_TAG} #{topic}", limit=limit
            )
            results = []
            for msg in messages:
                if not msg.text:
                    continue
                if MEMORY_TAG not in msg.text:
                    continue
                results.append({
                    "id": msg.id,
                    "date": msg.date.strftime("%Y-%m-%d %H:%M") if msg.date else "?",
                    "text": msg.text,
                })
            await client.disconnect()
            return results, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)
        if not rows:
            return ToolResult(True, f"No cloud memories found for #{topic}.", self.name)

        output = f"Cloud memories for #{topic} ({len(rows)}):\n\n"
        for r in rows:
            # Strip the tag line, show content
            lines = r["text"].split("\n", 2)
            content = lines[2] if len(lines) > 2 else lines[-1]
            output += f"[{r['date']}] (msg:{r['id']})\n{content}\n\n"

        return ToolResult(True, output.strip(), self.name)

    def _recent(self, params: dict) -> ToolResult:
        """Get the most recent N cloud memories."""
        limit = min(params.get("limit", 10), MAX_RECALL)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            messages = await client.get_messages(
                "me", search=MEMORY_TAG, limit=limit
            )
            results = []
            for msg in messages:
                if not msg.text or MEMORY_TAG not in msg.text:
                    continue
                topic = _parse_topic(msg.text) or "unknown"
                lines = msg.text.split("\n", 2)
                content = lines[2] if len(lines) > 2 else lines[-1]
                results.append({
                    "topic": topic,
                    "date": msg.date.strftime("%Y-%m-%d %H:%M") if msg.date else "?",
                    "content": content[:300],
                })
            await client.disconnect()
            return results, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)
        if not rows:
            return ToolResult(True, "No cloud memories stored yet.", self.name)

        output = f"Recent cloud memories ({len(rows)}):\n\n"
        for r in rows:
            output += f"[{r['date']}] #{r['topic']}\n{r['content']}\n\n"

        return ToolResult(True, output.strip(), self.name)

    def _topics(self) -> ToolResult:
        """List all unique memory topics."""
        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            messages = await client.get_messages(
                "me", search=MEMORY_TAG, limit=200
            )
            topics = {}
            for msg in messages:
                if not msg.text or MEMORY_TAG not in msg.text:
                    continue
                topic = _parse_topic(msg.text)
                if topic:
                    if topic not in topics:
                        topics[topic] = {"count": 0, "latest": None}
                    topics[topic]["count"] += 1
                    if msg.date and (not topics[topic]["latest"] or msg.date > topics[topic]["latest"]):
                        topics[topic]["latest"] = msg.date
            await client.disconnect()
            return topics, None

        topics, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)
        if not topics:
            return ToolResult(True, "No cloud memory topics yet. Use store to create one.", self.name)

        output = f"Cloud memory topics ({len(topics)}):\n"
        for name, info in sorted(topics.items()):
            latest = info["latest"].strftime("%Y-%m-%d") if info["latest"] else "?"
            output += f"  #{name:30} entries={info['count']}  latest={latest}\n"

        return ToolResult(True, output.strip(), self.name)

    def _forget(self, params: dict) -> ToolResult:
        """Delete a specific memory message by ID."""
        msg_id = params.get("msg_id")
        if not msg_id:
            return ToolResult(False, "Need msg_id to delete. Use recall/recent to find IDs.", self.name)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def delete():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return "Not authenticated."

            # Verify it's a memory message before deleting
            msgs = await client.get_messages("me", ids=[int(msg_id)])
            if not msgs or not msgs[0]:
                await client.disconnect()
                return f"Message {msg_id} not found."

            msg = msgs[0]
            if not msg.text or MEMORY_TAG not in msg.text:
                await client.disconnect()
                return f"Message {msg_id} is not a cloud memory. Won't delete."

            await client.delete_messages("me", [int(msg_id)])
            await client.disconnect()
            return None

        error = _run(delete())
        if error:
            return ToolResult(False, error, self.name)

        return ToolResult(True, f"Deleted cloud memory message {msg_id}.", self.name)

    def _sync(self, workspace: str) -> ToolResult:
        """Pull recent cloud memories and write to intel file for boot injection."""
        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            messages = await client.get_messages(
                "me", search=MEMORY_TAG, limit=MAX_SYNC_MESSAGES
            )
            results = []
            for msg in messages:
                if not msg.text or MEMORY_TAG not in msg.text:
                    continue
                topic = _parse_topic(msg.text) or "unknown"
                lines = msg.text.split("\n", 2)
                content = lines[2] if len(lines) > 2 else lines[-1]
                results.append({
                    "topic": topic,
                    "date": msg.date.strftime("%Y-%m-%d %H:%M") if msg.date else "?",
                    "content": content[:500],
                })
            await client.disconnect()
            return results, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)

        # Build intel file
        intel_dir = os.path.join(workspace, "logos", "intel")
        os.makedirs(intel_dir, exist_ok=True)
        intel_path = os.path.join(intel_dir, "_cloud_context.md")

        if not rows:
            # Write empty marker
            with open(intel_path, "w", encoding="utf-8") as f:
                f.write("# Cloud Memory (synced)\nNo cloud memories stored yet.\n")
            return ToolResult(True, "Sync complete — no cloud memories found.", self.name)

        # Group by topic
        by_topic: dict[str, list] = {}
        for r in rows:
            by_topic.setdefault(r["topic"], []).append(r)

        lines = [
            "# Cloud Memory (synced at boot)",
            f"_Last sync: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_",
            f"_Entries: {len(rows)} across {len(by_topic)} topics_",
            "",
        ]

        for topic, entries in sorted(by_topic.items()):
            lines.append(f"## #{topic}")
            for e in entries:
                lines.append(f"**[{e['date']}]** {e['content']}")
            lines.append("")

        with open(intel_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return ToolResult(
            True,
            f"Synced {len(rows)} cloud memories ({len(by_topic)} topics) → intel/_cloud_context.md",
            self.name,
        )
