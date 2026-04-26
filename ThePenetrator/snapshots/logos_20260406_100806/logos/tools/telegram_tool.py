"""Telegram tool — gives Logos world-reaching access via Telethon user client."""

from __future__ import annotations

import os
import json
import asyncio
from logos.tools.base import BaseTool, ToolResult

CONFIG_DIR = os.path.expanduser("~/.logos/telegram")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
SESSION_FILE = os.path.join(CONFIG_DIR, "logos")


def _ensure_dir():
    os.makedirs(CONFIG_DIR, exist_ok=True)


def _load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_config(cfg: dict):
    _ensure_dir()
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


def _run(coro):
    """Run async code from sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result(timeout=30)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _get_client():
    """Create a Telethon client from saved config."""
    cfg = _load_config()
    api_id = cfg.get("api_id")
    api_hash = cfg.get("api_hash")
    if not api_id or not api_hash:
        return None, "Not configured. Use >> TELEGRAM setup <api_id> <api_hash> first.\nGet credentials at https://my.telegram.org/apps"
    try:
        from telethon import TelegramClient
    except ImportError:
        return None, "telethon not installed. Run: pip install telethon"
    _ensure_dir()
    client = TelegramClient(SESSION_FILE, int(api_id), api_hash)
    return client, None


class TelegramTool(BaseTool):
    """Telegram integration — read channels, groups, messages, search, send."""

    name = "telegram"
    description = "Telegram access — read channels, groups, search messages, send messages, list chats"
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["setup", "login", "status", "chats", "read", "search", "send", "info"],
                "description": "Action to perform",
            },
            "target": {
                "type": "string",
                "description": "Chat/channel username, ID, or invite link",
            },
            "text": {
                "type": "string",
                "description": "Message text (for send) or search query (for search)",
            },
            "limit": {
                "type": "integer",
                "description": "Number of messages/results to return (default: 20)",
            },
            "api_id": {
                "type": "string",
                "description": "Telegram API ID (for setup)",
            },
            "api_hash": {
                "type": "string",
                "description": "Telegram API hash (for setup)",
            },
        },
        "required": ["action"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "status").lower()
        if action == "setup":
            return self._setup(params)
        elif action == "login":
            return self._login_info()
        elif action == "status":
            return self._status()
        elif action == "chats":
            return self._chats(params)
        elif action == "read":
            return self._read(params)
        elif action == "search":
            return self._search(params)
        elif action == "send":
            return self._send(params)
        elif action == "info":
            return self._info(params)
        else:
            return ToolResult(False, f"Unknown action: {action}. Use setup/login/status/chats/read/search/send/info.", self.name)

    def _setup(self, params: dict) -> ToolResult:
        """Store API credentials."""
        api_id = params.get("api_id", "").strip()
        api_hash = params.get("api_hash", "").strip()
        if not api_id or not api_hash:
            return ToolResult(False,
                "Usage: >> TELEGRAM setup <api_id> <api_hash>\n"
                "Get these at https://my.telegram.org/apps\n"
                "1. Log in with your phone number\n"
                "2. Go to 'API development tools'\n"
                "3. Create an app (any name)\n"
                "4. Copy api_id and api_hash",
                self.name)
        cfg = _load_config()
        cfg["api_id"] = api_id
        cfg["api_hash"] = api_hash
        _save_config(cfg)
        return ToolResult(True,
            f"Telegram API credentials saved.\n"
            f"Next: Run >> TELEGRAM login to authenticate.\n"
            f"You'll need to enter a verification code sent to your Telegram app.",
            self.name)

    def _login_info(self) -> ToolResult:
        """Show login instructions — actual login must happen in terminal."""
        cfg = _load_config()
        if not cfg.get("api_id"):
            return ToolResult(False, "Run >> TELEGRAM setup <api_id> <api_hash> first.", self.name)

        # Check if already authenticated
        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def check():
            await client.connect()
            authed = await client.is_user_authorized()
            if authed:
                me = await client.get_me()
                await client.disconnect()
                return True, f"{me.first_name} (@{me.username})" if me.username else me.first_name
            await client.disconnect()
            return False, None

        is_authed, name = _run(check())
        if is_authed:
            return ToolResult(True, f"Already logged in as {name}. Ready to go.", self.name)

        return ToolResult(True,
            "Not logged in yet. Run this in terminal to authenticate:\n\n"
            f"  python -c \"from telethon.sync import TelegramClient; "
            f"c = TelegramClient('{SESSION_FILE}', {cfg['api_id']}, '{cfg['api_hash']}'); "
            f"c.start(); print('Logged in as', c.get_me().first_name); c.disconnect()\"\n\n"
            "This will ask for your phone number and a verification code.\n"
            "After that, Logos can use Telegram without re-authenticating.",
            self.name)

    def _status(self) -> ToolResult:
        """Check Telegram connection status."""
        cfg = _load_config()
        lines = []
        lines.append(f"Configured: {'yes' if cfg.get('api_id') else 'no'}")

        if not cfg.get("api_id"):
            lines.append("Run >> TELEGRAM setup <api_id> <api_hash> to configure.")
            return ToolResult(True, "\n".join(lines), self.name)

        client, err = _get_client()
        if err:
            lines.append(f"Error: {err}")
            return ToolResult(False, "\n".join(lines), self.name)

        async def check():
            await client.connect()
            authed = await client.is_user_authorized()
            if authed:
                me = await client.get_me()
                await client.disconnect()
                return me
            await client.disconnect()
            return None

        me = _run(check())
        if me:
            lines.append(f"Authenticated: yes")
            lines.append(f"User: {me.first_name} {me.last_name or ''}".strip())
            if me.username:
                lines.append(f"Username: @{me.username}")
            lines.append(f"Phone: {me.phone}")
            lines.append(f"User ID: {me.id}")
        else:
            lines.append("Authenticated: no")
            lines.append("Run >> TELEGRAM login for instructions.")

        return ToolResult(True, "\n".join(lines), self.name)

    def _chats(self, params: dict) -> ToolResult:
        """List recent chats/channels/groups."""
        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        limit = min(params.get("limit", 30), 100)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None
            from telethon.tl.types import Channel, Chat, User
            dialogs = await client.get_dialogs(limit=limit)
            results = []
            for d in dialogs:
                entity = d.entity
                if isinstance(entity, Channel):
                    kind = "channel" if entity.broadcast else "group"
                    name = entity.title
                    username = f"@{entity.username}" if entity.username else str(entity.id)
                    members = entity.participants_count or "?"
                elif isinstance(entity, Chat):
                    kind = "group"
                    name = entity.title
                    username = str(entity.id)
                    members = entity.participants_count or "?"
                elif isinstance(entity, User):
                    kind = "user"
                    name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                    username = f"@{entity.username}" if entity.username else str(entity.id)
                    members = "-"
                else:
                    continue
                unread = d.unread_count
                results.append(f"  [{kind:7}] {name:30} {username:20} members={members} unread={unread}")
            await client.disconnect()
            return results

        rows = _run(fetch())
        if rows is None:
            return ToolResult(False, "Not authenticated. Run >> TELEGRAM login first.", self.name)

        header = f"Recent chats ({len(rows)}):\n"
        return ToolResult(True, header + "\n".join(rows), self.name)

    def _read(self, params: dict) -> ToolResult:
        """Read messages from a chat/channel/group."""
        target = params.get("target", "").strip()
        if not target:
            return ToolResult(False, "Specify target: >> TELEGRAM read <channel/group/user>", self.name)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        limit = min(params.get("limit", 20), 100)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            try:
                entity = await client.get_entity(target)
            except Exception as e:
                await client.disconnect()
                return None, f"Could not find '{target}': {e}"

            messages = await client.get_messages(entity, limit=limit)
            results = []
            for msg in reversed(messages):
                if not msg.text and not msg.message:
                    continue
                sender = ""
                if msg.sender:
                    if hasattr(msg.sender, 'first_name'):
                        sender = msg.sender.first_name or ""
                    elif hasattr(msg.sender, 'title'):
                        sender = msg.sender.title or ""
                date = msg.date.strftime("%Y-%m-%d %H:%M") if msg.date else "?"
                text = (msg.text or msg.message or "").replace("\n", " ")[:300]
                results.append(f"[{date}] {sender}: {text}")
            await client.disconnect()
            return results, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)

        header = f"Messages from {target} (last {len(rows)}):\n"
        return ToolResult(True, header + "\n".join(rows), self.name)

    def _search(self, params: dict) -> ToolResult:
        """Search messages in a chat or globally."""
        query = params.get("text", "").strip()
        if not query:
            return ToolResult(False, "Specify search query: >> TELEGRAM search <query> [--in <chat>]", self.name)

        target = params.get("target", "").strip()

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        limit = min(params.get("limit", 20), 50)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            entity = None
            if target:
                try:
                    entity = await client.get_entity(target)
                except Exception as e:
                    await client.disconnect()
                    return None, f"Could not find '{target}': {e}"

            messages = await client.get_messages(entity, search=query, limit=limit)
            results = []
            for msg in messages:
                if not msg.text and not msg.message:
                    continue
                chat_name = ""
                if msg.chat:
                    chat_name = getattr(msg.chat, 'title', None) or getattr(msg.chat, 'first_name', '') or ""
                date = msg.date.strftime("%Y-%m-%d %H:%M") if msg.date else "?"
                text = (msg.text or msg.message or "").replace("\n", " ")[:200]
                results.append(f"[{date}] [{chat_name}] {text}")
            await client.disconnect()
            return results, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)

        scope = f"in {target}" if target else "globally"
        header = f"Search '{query}' {scope} ({len(rows)} results):\n"
        return ToolResult(True, header + "\n".join(rows), self.name)

    def _send(self, params: dict) -> ToolResult:
        """Send a message to a chat/user."""
        target = params.get("target", "").strip()
        text = params.get("text", "").strip()
        if not target or not text:
            return ToolResult(False, "Usage: >> TELEGRAM send <target> <message>", self.name)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def do_send():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return "Not authenticated."

            try:
                entity = await client.get_entity(target)
            except Exception as e:
                await client.disconnect()
                return f"Could not find '{target}': {e}"

            await client.send_message(entity, text)
            await client.disconnect()
            return None

        error = _run(do_send())
        if error:
            return ToolResult(False, error, self.name)
        return ToolResult(True, f"Message sent to {target}.", self.name)

    def _info(self, params: dict) -> ToolResult:
        """Get info about a user/channel/group."""
        target = params.get("target", "").strip()
        if not target:
            return ToolResult(False, "Specify target: >> TELEGRAM info <username/channel>", self.name)

        client, err = _get_client()
        if err:
            return ToolResult(False, err, self.name)

        async def fetch():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return None, "Not authenticated."

            try:
                entity = await client.get_entity(target)
            except Exception as e:
                await client.disconnect()
                return None, f"Could not find '{target}': {e}"

            from telethon.tl.types import Channel, Chat, User
            lines = []
            if isinstance(entity, Channel):
                lines.append(f"Type: {'Channel' if entity.broadcast else 'Supergroup'}")
                lines.append(f"Title: {entity.title}")
                if entity.username:
                    lines.append(f"Username: @{entity.username}")
                lines.append(f"ID: {entity.id}")
                if entity.participants_count:
                    lines.append(f"Members: {entity.participants_count:,}")
                if entity.about:
                    lines.append(f"About: {entity.about[:300]}")
                lines.append(f"Verified: {entity.verified}")
                lines.append(f"Scam: {entity.scam}")
                lines.append(f"Restricted: {entity.restricted}")
            elif isinstance(entity, User):
                lines.append(f"Type: User")
                lines.append(f"Name: {entity.first_name or ''} {entity.last_name or ''}".strip())
                if entity.username:
                    lines.append(f"Username: @{entity.username}")
                lines.append(f"ID: {entity.id}")
                lines.append(f"Bot: {entity.bot}")
                lines.append(f"Verified: {entity.verified}")
                lines.append(f"Scam: {entity.scam}")
            elif isinstance(entity, Chat):
                lines.append(f"Type: Group")
                lines.append(f"Title: {entity.title}")
                lines.append(f"ID: {entity.id}")
                if entity.participants_count:
                    lines.append(f"Members: {entity.participants_count:,}")
            else:
                lines.append(f"Type: {type(entity).__name__}")
                lines.append(f"ID: {entity.id}")

            await client.disconnect()
            return lines, None

        rows, error = _run(fetch())
        if error:
            return ToolResult(False, error, self.name)

        return ToolResult(True, "\n".join(rows), self.name)
