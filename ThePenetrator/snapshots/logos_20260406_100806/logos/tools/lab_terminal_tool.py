"""LAB Terminal Tool — Hardwired integration for Airdrop farming & Trading."""

import os
import json
import asyncio
from logos.tools.base import BaseTool, ToolResult
from logos.tools.telegram_tool import _get_client, _run

class LabTerminalTool(BaseTool):
    """Integration with LAB Terminal bot for airdrop claims and trading."""
    name = "lab_terminal"
    description = "Manage LAB Terminal airdrops and trading via Telegram bot"
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["claim", "balance", "status"],
                "description": "Action to perform"
            }
        },
        "required": ["action"]
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "").lower()
        
        if action == "claim":
            return self._claim(params)
        elif action == "balance":
            return self._check_balance(params)
        elif action == "status":
            return self._status(params)
        else:
            return ToolResult(False, f"Unknown action: {action}", self.name)

    def _claim(self, params: dict) -> ToolResult:
        """Authenticate and claim airdrop."""
        client, err = _get_client()
        if err:
            return ToolResult(False, f"Telegram Error: {err}", self.name)

        async def do_claim():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return "Not authenticated. Run >> TELEGRAM login first."

            target = "@LAB_Trading_bot"
            await client.send_message(target, "/start")
            
            # Wait for response
            for i in range(5):
                response = await client.get_messages(target, limit=1)
                if response and len(response) > 0 and response[0].text:
                    text = response[0].text
                    if "Your auth code" in text:
                        code = text.split("`")[1]
                        await client.send_message(target, code)
                        await client.send_message(target, "/airdrop")
                        await client.send_message(target, "/balance")
                        await client.disconnect()
                        return "Airdrop claimed successfully."
                    break
                await asyncio.sleep(2)
            await client.disconnect()
            return "No response from bot."

        result = _run(do_claim())
        return ToolResult(True, f"LAB Terminal: {result}", self.name)

    def _check_balance(self, params: dict) -> ToolResult:
        """Check LAB Terminal balance."""
        client, err = _get_client()
        if err:
            return ToolResult(False, f"Telegram Error: {err}", self.name)

        async def do_balance():
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                return "Not authenticated."

            await client.send_message("@LAB_Trading_bot", "/balance")
            await client.disconnect()
            return "Balance request sent."

        result = _run(do_balance())
        return ToolResult(True, f"LAB Terminal: {result}", self.name)

    def _status(self, params: dict) -> ToolResult:
        """Check connection status."""
        client, err = _get_client()
        if err:
            return ToolResult(False, f"Error: {err}", self.name)

        async def do_status():
            await client.connect()
            authed = await client.is_user_authorized()
            await client.disconnect()
            return "Authenticated" if authed else "Not Authenticated"

        result = _run(do_status())
        return ToolResult(True, f"LAB Terminal Status: {result}", self.name)
