"""Web fetch tool — HTTP requests."""

import json as json_mod
import requests
from logos.tools.base import BaseTool, ToolResult


class WebFetchTool(BaseTool):
    name = "web_fetch"
    description = "Make an HTTP request and return the response"
    parameters = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "URL to fetch"},
            "method": {"type": "string", "description": "HTTP method (GET, POST, etc.)"},
            "headers": {"type": "object", "description": "Request headers"},
            "body": {"type": "string", "description": "Request body"},
        },
        "required": ["url"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        url = params["url"]
        method = params.get("method", "GET").upper()
        headers = params.get("headers", {})
        body = params.get("body")

        try:
            resp = requests.request(
                method, url, headers=headers, data=body, timeout=30,
            )
            try:
                data = resp.json()
                content = json_mod.dumps(data, indent=2)[:5000]
            except Exception:
                content = resp.text[:5000]
            return ToolResult(
                success=resp.ok,
                output=f"[{resp.status_code}]\n{content}",
                tool_name=self.name,
            )
        except Exception as e:
            return ToolResult(False, f"Fetch error: {e}", self.name)
