"""Multi-provider LLM client — supports Anthropic (native) and OpenAI-compatible APIs."""

from __future__ import annotations

import json
import requests


class LLMClient:
    """Multi-provider LLM client. Talks to any API with your own keys.

    Supported formats:
    - 'anthropic': Native Anthropic Messages API (Claude direct)
    - 'openai': OpenAI-compatible chat/completions (OpenAI, Venice, OpenRouter, Groq, Together, etc.)
    """

    def __init__(self, api_key: str, base_url: str, params: dict, provider: str = "anthropic",
                 venice_parameters: dict | None = None, prompt_caching: dict | None = None):
        self.api_key = api_key
        self.base_url = base_url
        self.default_params = params
        self.provider = provider.lower()
        self.venice_parameters = venice_parameters or {}
        self.prompt_caching = prompt_caching or {}
        self._session_cache_key: str | None = None
        self._api_urls: dict[str, str] = {}
        self._last_cache_stats: dict | None = None
        # Multi-provider routing: model -> {api_key, base_url, provider, venice_parameters?}
        self._providers: dict[str, dict] = {}
        self._model_routing: dict[str, str] = {}

    def set_providers(self, providers: dict, model_routing: dict):
        """Configure multiple providers and per-model routing.

        providers: {name: {api_key, base_url, provider_type, venice_parameters?}}
        model_routing: {model_name: provider_name}
        """
        self._providers = providers
        self._model_routing = model_routing

    def _resolve_provider(self, model: str) -> tuple[str, str, str, dict]:
        """Resolve which provider to use for a model.

        Returns: (api_key, base_url, provider_type, venice_parameters)
        """
        provider_name = self._model_routing.get(model)
        if provider_name and provider_name in self._providers:
            p = self._providers[provider_name]
            return (
                p["api_key"],
                p["base_url"],
                p.get("provider_type", "openai"),
                p.get("venice_parameters", {}),
            )
        # Default: use the main provider
        return self.api_key, self.base_url, self.provider, self.venice_parameters

    def chat_stream(self, messages: list, model: str, tools: list | None = None,
                    venice_overrides: dict | None = None):
        """Stream a chat completion. Yields content chunks as strings.

        venice_overrides: per-request venice_parameters overrides (merged on top of defaults).
        Routes to the correct provider based on model_routing config.
        """
        api_key, base_url, provider_type, vp = self._resolve_provider(model)
        if provider_type == "anthropic":
            yield from self._stream_anthropic(messages, model, api_key=api_key, base_url=base_url)
        else:
            yield from self._stream_openai(messages, model, venice_overrides,
                                           api_key=api_key, base_url=base_url, vp_defaults=vp)

    def _stream_anthropic(self, messages: list, model: str,
                          api_key: str | None = None, base_url: str | None = None):
        """Native Anthropic Messages API streaming."""
        headers = {
            "x-api-key": api_key or self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        # Anthropic: system goes in top-level param, not in messages
        system_text = ""
        api_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_text = msg["content"]
            else:
                api_messages.append(msg)

        payload = {
            "model": model,
            "max_tokens": self.default_params.get("max_tokens", 8192),
            "stream": True,
        }
        if system_text:
            payload["system"] = system_text
        if api_messages:
            payload["messages"] = api_messages

        temp = self.default_params.get("temperature", 0.7)
        if temp is not None:
            payload["temperature"] = temp

        top_p = self.default_params.get("top_p")
        if top_p is not None and top_p != 1.0:
            payload["top_p"] = top_p

        resp = self._post(base_url or self.base_url, headers, payload)
        if resp is None:
            return

        for line in resp.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8")
            if line.startswith("event: "):
                continue
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                event_type = chunk.get("type", "")

                if event_type == "content_block_delta":
                    delta = chunk.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        if text:
                            yield text
                elif event_type == "message_stop":
                    break
                elif event_type == "error":
                    err = chunk.get("error", {})
                    yield f"\n[API error: {err.get('message', 'unknown')}]"
                    break
            except (json.JSONDecodeError, KeyError, IndexError):
                continue

    def _stream_openai(self, messages: list, model: str, venice_overrides: dict | None = None,
                       api_key: str | None = None, base_url: str | None = None,
                       vp_defaults: dict | None = None):
        """OpenAI-compatible chat/completions streaming (Venice, OpenRouter, Groq, etc.)."""
        headers = {
            "Authorization": f"Bearer {api_key or self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": self.default_params.get("max_tokens", 8192),
            "stream": True,
        }

        temp = self.default_params.get("temperature", 0.7)
        if temp is not None:
            payload["temperature"] = temp

        top_p = self.default_params.get("top_p")
        if top_p is not None and top_p != 1.0:
            payload["top_p"] = top_p

        # Inject Venice-specific parameters (merge defaults + per-request overrides)
        merged_vp = {}
        effective_vp = vp_defaults if vp_defaults else self.venice_parameters
        if effective_vp:
            merged_vp.update(effective_vp)
        if venice_overrides:
            merged_vp.update(venice_overrides)
        if merged_vp:
            payload["venice_parameters"] = merged_vp

        # Prompt caching — inject prompt_cache_key for server affinity across all models
        self._inject_prompt_caching(payload, model)

        resp = self._post(base_url or self.base_url, headers, payload)
        if resp is None:
            return

        for line in resp.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8")
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                choices = chunk.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content
                    if choices[0].get("finish_reason"):
                        # Capture cache stats from final chunk usage data
                        usage = chunk.get("usage")
                        if usage:
                            details = usage.get("prompt_tokens_details", {})
                            self._last_cache_stats = {
                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                "completion_tokens": usage.get("completion_tokens", 0),
                                "cached_tokens": details.get("cached_tokens", 0),
                                "cache_creation_tokens": details.get("cache_creation_input_tokens", 0),
                            }
                        break
                # Also check for usage in non-choice chunks (some providers send it separately)
                if chunk.get("usage") and not choices:
                    usage = chunk["usage"]
                    details = usage.get("prompt_tokens_details", {})
                    self._last_cache_stats = {
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "cached_tokens": details.get("cached_tokens", 0),
                        "cache_creation_tokens": details.get("cache_creation_input_tokens", 0),
                    }
                if chunk.get("error"):
                    err = chunk["error"]
                    msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                    yield f"\n[API error: {msg}]"
                    break
            except (json.JSONDecodeError, KeyError, IndexError):
                continue

    def _post(self, url: str, headers: dict, payload: dict):
        """POST with error handling. Returns response or None."""
        try:
            resp = requests.post(url, headers=headers, json=payload, stream=True, timeout=180)
            resp.raise_for_status()
            return resp
        except requests.exceptions.HTTPError as e:
            print(f"\n[API error: {e}]")
            try:
                print(f"[Response: {resp.text[:500]}]")
            except Exception:
                pass
            return None
        except requests.exceptions.ConnectionError:
            print("\n[Connection failed — check your internet.]")
            return None
        except requests.exceptions.Timeout:
            print("\n[Request timed out.]")
            return None

    def chat(self, messages: list, model: str) -> str:
        """Non-streaming chat completion. Returns full response."""
        return "".join(self.chat_stream(messages, model))

    def _inject_prompt_caching(self, payload: dict, model: str):
        """Inject prompt caching parameters into any request payload.

        Works universally across all Venice models:
        - Adds prompt_cache_key for server affinity (routes to same server = warm cache)
        - For Claude models: adds cache_control breakpoints on system + large content blocks
        - For all others: caching is automatic, just needs the routing key
        """
        if not self.prompt_caching.get("enabled"):
            return

        # 1. prompt_cache_key — works for ALL models via Venice
        cache_key = self.prompt_caching.get("prompt_cache_key")
        if not cache_key and self.prompt_caching.get("auto_session_key"):
            if not self._session_cache_key:
                import uuid
                self._session_cache_key = f"logos-{uuid.uuid4().hex[:12]}"
            cache_key = self._session_cache_key
        if cache_key:
            payload["prompt_cache_key"] = cache_key

        # 2. For Claude models: add explicit cache_control breakpoints
        model_cfg = self.prompt_caching.get("models", {})
        m_info = model_cfg.get(model, model_cfg.get("_default", {}))
        if not m_info.get("explicit_markers"):
            return

        bp = self.prompt_caching.get("cache_breakpoints", {})
        messages = payload.get("messages", [])

        # Mark system prompt for caching
        if bp.get("system_prompt"):
            for msg in messages:
                if msg.get("role") == "system":
                    if isinstance(msg.get("content"), str):
                        msg["content"] = [{"type": "text", "text": msg["content"],
                                           "cache_control": {"type": "ephemeral"}}]
                    elif isinstance(msg.get("content"), list):
                        # Mark last text block in existing content array
                        for block in reversed(msg["content"]):
                            if isinstance(block, dict) and block.get("type") == "text":
                                block["cache_control"] = {"type": "ephemeral"}
                                break

        # Mark second-to-last user message for conversation history caching
        # (Venice does this automatically, but explicit markers ensure it)
        user_indices = [i for i, m in enumerate(messages) if m.get("role") == "user"]
        if len(user_indices) >= 2:
            stl_idx = user_indices[-2]
            stl_msg = messages[stl_idx]
            if isinstance(stl_msg.get("content"), str):
                stl_msg["content"] = [{"type": "text", "text": stl_msg["content"],
                                       "cache_control": {"type": "ephemeral"}}]
            elif isinstance(stl_msg.get("content"), list):
                for block in reversed(stl_msg["content"]):
                    if isinstance(block, dict) and block.get("type") == "text":
                        block["cache_control"] = {"type": "ephemeral"}
                        break

        # Mark large document/image blocks if configured
        if bp.get("large_documents"):
            for msg in messages:
                if msg.get("role") != "user":
                    continue
                if isinstance(msg.get("content"), list):
                    for block in msg["content"]:
                        if not isinstance(block, dict):
                            continue
                        # Mark image blocks for caching
                        if block.get("type") == "image_url" and "cache_control" not in block:
                            block["cache_control"] = {"type": "ephemeral"}
                        # Mark large text blocks (>2000 chars) for caching
                        if (block.get("type") == "text" and len(block.get("text", "")) > 2000
                                and "cache_control" not in block):
                            block["cache_control"] = {"type": "ephemeral"}

    def get_cache_stats(self) -> dict | None:
        """Return last response's cache statistics, if available."""
        return self._last_cache_stats

    def set_api_urls(self, urls: dict):
        """Store additional Venice endpoint URLs (images, audio, embeddings, etc.)."""
        self._api_urls = urls

    def generate_image(self, prompt: str, model: str = "nano-banana-pro",
                       width: int = 1024, height: int = 1024) -> dict:
        """Generate an image via Venice image API. Returns raw JSON response."""
        url = self._api_urls.get("images_url", self.base_url.replace("/chat/completions", "/images/generations"))
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": model, "prompt": prompt, "width": width, "height": height}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=120)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"error": str(e)}

    def text_to_speech(self, text: str, model: str = "tts-1", voice: str = "alloy",
                       output_path: str = "speech.mp3") -> dict:
        """Generate speech from text via Venice audio API. Saves to file."""
        url = self._api_urls.get("audio_speech_url", self.base_url.replace("/chat/completions", "/audio/speech"))
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": model, "input": text, "voice": voice}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=60)
            resp.raise_for_status()
            import os
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(resp.content)
            return {"success": True, "path": output_path, "size": len(resp.content)}
        except Exception as e:
            return {"error": str(e)}

    def transcribe(self, audio_path: str, model: str = "whisper-1") -> dict:
        """Transcribe audio via Venice transcription API."""
        url = self._api_urls.get("audio_transcriptions_url",
                                  self.base_url.replace("/chat/completions", "/audio/transcriptions"))
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            with open(audio_path, "rb") as f:
                resp = requests.post(url, headers=headers,
                                     files={"file": f}, data={"model": model}, timeout=120)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"error": str(e)}

    def embeddings(self, text: str | list[str], model: str = "text-embedding-3-small") -> dict:
        """Generate embeddings via Venice embeddings API."""
        url = self._api_urls.get("embeddings_url", self.base_url.replace("/chat/completions", "/embeddings"))
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": model, "input": text if isinstance(text, list) else [text]}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"error": str(e)}

    def check_balance(self) -> dict:
        """Check Venice account balance."""
        url = self._api_urls.get("billing_url", self.base_url.replace("/chat/completions", "/billing/usage"))
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"error": str(e)}

    def list_models(self, models_url: str) -> list[dict]:
        """Fetch available models from the API."""
        if self.provider == "anthropic":
            headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}
        else:
            headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            resp = requests.get(models_url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])
        except Exception:
            return []
