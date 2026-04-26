"""OpenRouter fan-out tool — query multiple AI models in parallel through OpenRouter API."""

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import requests

from logos.tools.base import BaseTool, ToolResult

# Free models — zero cost, rate-limited
FREE_MODELS = [
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-coder:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
]

# Short aliases — free models
ALIASES = {
    # Free tier (29 total, best ones aliased)
    "hermes": "nousresearch/hermes-3-llama-3.1-405b:free",
    "llama70b": "meta-llama/llama-3.3-70b-instruct:free",
    "llama3b": "meta-llama/llama-3.2-3b-instruct:free",
    "venice": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "dolphin": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "qwen-coder": "qwen/qwen3-coder:free",
    "qwen-next": "qwen/qwen3-next-80b-a3b-instruct:free",
    "nemotron-free": "nvidia/nemotron-3-super-120b-a12b:free",
    "nemotron-nano": "nvidia/nemotron-3-nano-30b-a3b:free",
    "gemma31-free": "google/gemma-4-31b-it:free",
    "gemma26-free": "google/gemma-4-26b-a4b-it:free",
    "gemma27": "google/gemma-3-27b-it:free",
    "gpt-oss": "openai/gpt-oss-120b:free",
    "gpt-oss-20b": "openai/gpt-oss-20b:free",
    "glm-air": "z-ai/glm-4.5-air:free",
    "trinity-mini": "arcee-ai/trinity-mini:free",
    "trinity-large": "arcee-ai/trinity-large-preview:free",
    "minimax": "minimax/minimax-m2.5:free",
    "step-flash": "stepfun/step-3.5-flash:free",
    "nemotron-vl": "nvidia/nemotron-nano-12b-v2-vl:free",
    # Paid — OpenAI (funded via Nate's key)
    "gpt5.4": "openai/gpt-5.4",
    "gpt5.4-nano": "openai/gpt-5.4-nano",
    "gpt5.4-mini": "openai/gpt-5.4-mini",
    "gpt5.4-pro": "openai/gpt-5.4-pro",
    "gpt5.3": "openai/gpt-5.3-chat",
    "gpt5.2": "openai/gpt-5.2",
    "gpt5.1": "openai/gpt-5.1",
    "gpt5": "openai/gpt-5",
    "gpt5-mini": "openai/gpt-5-mini",
    "gpt5-nano": "openai/gpt-5-nano",
    "gpt4.1": "openai/gpt-4.1",
    "gpt4.1-mini": "openai/gpt-4.1-mini",
    "gpt4.1-nano": "openai/gpt-4.1-nano",
    "gpt4o": "openai/gpt-4o",
    "gpt4o-mini": "openai/gpt-4o-mini",
    "gpt4-turbo": "openai/gpt-4-turbo",
    "gpt4": "openai/gpt-4",
    "gpt3.5": "openai/gpt-3.5-turbo",
    "o3": "openai/o3",
    "o4-mini": "openai/o4-mini",
    # Paid — other providers (cheap)
    "nemotron": "nvidia/nemotron-3-super-120b-a12b",
    "gemma31": "google/gemma-4-31b-it",
    "gemma26": "google/gemma-4-26b-a4b-it",
    "trinity": "arcee-ai/trinity-large-thinking",
    "glm5": "z-ai/glm-5.1",
    "qwen3.5-9b": "qwen/qwen3.5-9b",
}

BASE_URL = "https://openrouter.ai/api/v1/chat/completions"


def _resolve_model(name: str) -> str:
    """Resolve alias to full model ID, or pass through if already full."""
    return ALIASES.get(name.lower(), name)


def _query_one(model: str, prompt: str, api_key: str, timeout: int) -> dict:
    """Send a single prompt to one OpenRouter model."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://logos.local",
        "X-Title": "Logos Agent",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "temperature": 0.7,
    }
    try:
        resp = requests.post(BASE_URL, headers=headers, json=payload, timeout=timeout)
    except requests.exceptions.Timeout:
        return {"model": model, "status": "timeout", "text": "Request timed out"}
    except requests.exceptions.ConnectionError:
        return {"model": model, "status": "error", "text": "Connection failed"}
    except Exception as e:
        return {"model": model, "status": "error", "text": str(e)}

    if resp.status_code == 429:
        return {
            "model": model,
            "status": "rate_limited",
            "text": "Rate limited — try again later",
        }
    if resp.status_code != 200:
        try:
            err = resp.json().get("error", {}).get("message", resp.text[:200])
        except Exception:
            err = resp.text[:200]
        return {
            "model": model,
            "status": "error",
            "text": f"HTTP {resp.status_code}: {err}",
        }

    try:
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return {
            "model": model,
            "status": "ok",
            "text": text.strip() if text else "(empty)",
            "tokens": usage.get("total_tokens", 0),
        }
    except (KeyError, IndexError, TypeError) as e:
        return {"model": model, "status": "error", "text": f"Bad response format: {e}"}


class OpenRouterFanoutTool(BaseTool):
    name = "openrouter_fanout"
    description = (
        "Query multiple AI models in parallel through OpenRouter API. "
        "Sends the same prompt to all specified models simultaneously and returns all responses. "
        "FREE: hermes (405B), llama70b, llama3b, venice/dolphin, qwen-coder (480B), qwen-next (80B). "
        "PAID: gpt4o, gpt4o-mini, gpt5.4-nano/mini/pro, gpt4.1/mini/nano, nemotron, gemma31, gemma26, "
        "trinity, glm5, qwen3.5-9b. Also accepts any OpenRouter model ID directly."
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
                "description": (
                    "Which models to query. Use aliases (dolphin, hermes, llama70b, gpt-oss, qwen-coder, "
                    "nemotron, gemma, minimax) or full OpenRouter model IDs. Default: all 5 free models."
                ),
            },
        },
        "required": ["prompt"],
    }

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key

    def _get_key(self) -> str:
        if self._api_key:
            return self._api_key
        return os.environ.get("OPENROUTER_API_KEY", "")

    def execute(self, params: dict, workspace: str) -> ToolResult:
        prompt = params["prompt"]
        raw_models = params.get("models", None)
        timeout = 120

        api_key = self._get_key()
        if not api_key:
            return ToolResult(False, "No OpenRouter API key configured", self.name)

        # Resolve models
        if raw_models:
            models = [_resolve_model(m) for m in raw_models]
        else:
            models = list(FREE_MODELS)

        results = {}
        with ThreadPoolExecutor(max_workers=len(models)) as pool:
            futures = {
                pool.submit(_query_one, m, prompt, api_key, timeout): m for m in models
            }
            for future in as_completed(futures):
                model = futures[future]
                try:
                    results[model] = future.result()
                except Exception as e:
                    results[model] = {"model": model, "status": "error", "text": str(e)}

        # Format output
        lines = [f"=== OpenRouter Fan-out: {len(models)} models queried ===\n"]
        ok_count = 0
        for model in models:
            r = results.get(model, {"status": "missing", "text": "No result"})
            status = r["status"].upper()
            # Short display name
            short = model.split("/")[-1].replace(":free", "")
            if status == "OK":
                ok_count += 1
                tokens = r.get("tokens", "?")
                lines.append(f"--- {short} [OK | {tokens} tok] ---")
            else:
                lines.append(f"--- {short} [{status}] ---")
            lines.append(r["text"])
            lines.append("")

        lines.append(f"=== {ok_count}/{len(models)} models responded ===")
        return ToolResult(ok_count > 0, "\n".join(lines), self.name)
