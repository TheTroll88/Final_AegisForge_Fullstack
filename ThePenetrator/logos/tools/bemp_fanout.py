"""BEMP fan-out tool — query multiple AI models in parallel through the browser bridge."""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from logos.tools.base import BaseTool, ToolResult

BEMP_MODELS = ["venice", "gemini", "chatgpt", "deepseek", "qwen", "kimi", "blackbox"]
DEFAULT_BRIDGE = "http://localhost:8765"


def _query_one(model: str, prompt: str, bridge_url: str, timeout: int) -> dict:
    """Send a single prompt to one BEMP model and collect the response."""
    url = f"{bridge_url}/send"
    payload = {"model": model, "prompt": prompt, "new_chat": True}
    try:
        resp = requests.post(url, json=payload, stream=True, timeout=timeout)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        return {"model": model, "status": "error", "text": "Bridge not running"}
    except requests.exceptions.Timeout:
        return {"model": model, "status": "timeout", "text": "Request timed out"}
    except Exception as e:
        return {"model": model, "status": "error", "text": str(e)}

    chunks = []
    final_text = None
    error = None
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            event = json.loads(line.decode())
        except Exception:
            continue
        if event.get("type") == "done":
            final_text = event.get("text", "")
        elif event.get("type") == "chunk":
            chunks.append(event.get("text", ""))
        elif event.get("type") == "error":
            error = event.get("text", "Unknown error")

    if error:
        return {"model": model, "status": "error", "text": error}
    text = final_text if final_text else "".join(chunks)
    return {"model": model, "status": "ok", "text": text.strip() if text else "(empty)"}


class BEMPFanoutTool(BaseTool):
    name = "bemp_fanout"
    description = (
        "Query multiple AI models in parallel through BEMP browser bridge. "
        "Sends the same prompt to all specified models simultaneously and "
        "returns all responses. Models: venice, gemini, chatgpt, deepseek, qwen, kimi, blackbox."
    )
    parameters = {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "The prompt to send to all models",
            },
            "models": {
                "type": "array",
                "items": {"type": "string"},
                "description": f"Which models to query. Options: {', '.join(BEMP_MODELS)}. Default: all.",
            },
        },
        "required": ["prompt"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        prompt = params["prompt"]
        models = params.get("models", BEMP_MODELS)
        timeout = 180

        # Validate model names
        invalid = [m for m in models if m not in BEMP_MODELS]
        if invalid:
            return ToolResult(
                False, f"Unknown models: {invalid}. Valid: {BEMP_MODELS}", self.name
            )

        results = {}
        with ThreadPoolExecutor(max_workers=len(models)) as pool:
            futures = {
                pool.submit(_query_one, m, prompt, DEFAULT_BRIDGE, timeout): m
                for m in models
            }
            for future in as_completed(futures):
                model = futures[future]
                try:
                    results[model] = future.result()
                except Exception as e:
                    results[model] = {"model": model, "status": "error", "text": str(e)}

        # Format output
        lines = [f"=== BEMP Fan-out: {len(models)} models queried ===\n"]
        ok_count = 0
        for model in models:
            r = results.get(model, {"status": "missing", "text": "No result"})
            status = r["status"].upper()
            if status == "OK":
                ok_count += 1
            lines.append(f"--- {model.upper()} [{status}] ---")
            lines.append(r["text"])
            lines.append("")

        lines.append(f"=== {ok_count}/{len(models)} models responded ===")
        return ToolResult(ok_count > 0, "\n".join(lines), self.name)
