"""Venice-powered tools — image gen, TTS, transcription, embeddings, balance, web search."""

import json
import os
from logos.tools.base import BaseTool, ToolResult


class ImageGenTool(BaseTool):
    """Generate images via Venice image API."""
    name = "image_gen"
    description = "Generate an image from a text prompt"
    parameters = {
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Image generation prompt"},
            "model": {"type": "string", "description": "Model (default: nano-banana-pro)"},
            "width": {"type": "integer", "description": "Width in pixels (default: 1024)"},
            "height": {"type": "integer", "description": "Height in pixels (default: 1024)"},
            "output": {"type": "string", "description": "Output filename (default: generated.png)"},
        },
        "required": ["prompt"],
    }

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        model = params.get("model", "nano-banana-pro")
        width = params.get("width", 1024)
        height = params.get("height", 1024)
        output = params.get("output", "generated.png")
        if not os.path.isabs(output):
            output = os.path.join(workspace, output)
        result = self._client.generate_image(params["prompt"], model, width, height)
        if "error" in result:
            return ToolResult(False, f"Image gen failed: {result['error']}", self.name)
        # Venice returns base64 image data in response
        data = result.get("data", [])
        if data and "b64_json" in data[0]:
            import base64
            os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
            with open(output, "wb") as f:
                f.write(base64.b64decode(data[0]["b64_json"]))
            return ToolResult(True, f"Image saved to {output}", self.name)
        elif data and "url" in data[0]:
            return ToolResult(True, f"Image URL: {data[0]['url']}", self.name)
        return ToolResult(True, f"Response: {json.dumps(result)[:500]}", self.name)


class TTSTool(BaseTool):
    """Text-to-speech via Venice audio API."""
    name = "tts"
    description = "Convert text to speech audio"
    parameters = {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Text to speak"},
            "voice": {"type": "string", "description": "Voice (default: alloy)"},
            "output": {"type": "string", "description": "Output filename (default: speech.mp3)"},
        },
        "required": ["text"],
    }

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        output = params.get("output", "speech.mp3")
        if not os.path.isabs(output):
            output = os.path.join(workspace, output)
        result = self._client.text_to_speech(
            params["text"], voice=params.get("voice", "alloy"), output_path=output
        )
        if "error" in result:
            return ToolResult(False, f"TTS failed: {result['error']}", self.name)
        return ToolResult(True, f"Audio saved to {result['path']} ({result['size']} bytes)", self.name)


class TranscribeTool(BaseTool):
    """Transcribe audio via Venice API."""
    name = "transcribe"
    description = "Transcribe an audio file to text"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Path to audio file"},
        },
        "required": ["path"],
    }

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        path = params["path"]
        if not os.path.isabs(path):
            path = os.path.join(workspace, path)
        if not os.path.exists(path):
            return ToolResult(False, f"File not found: {path}", self.name)
        result = self._client.transcribe(path)
        if "error" in result:
            return ToolResult(False, f"Transcription failed: {result['error']}", self.name)
        text = result.get("text", json.dumps(result))
        return ToolResult(True, text, self.name)


class EmbeddingsTool(BaseTool):
    """Generate text embeddings via Venice API."""
    name = "embed"
    description = "Generate text embeddings for semantic similarity"
    parameters = {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Text to embed"},
        },
        "required": ["text"],
    }

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        result = self._client.embeddings(params["text"])
        if "error" in result:
            return ToolResult(False, f"Embedding failed: {result['error']}", self.name)
        data = result.get("data", [])
        if data:
            embedding = data[0].get("embedding", [])
            return ToolResult(True, f"Embedding ({len(embedding)} dims): [{embedding[0]:.6f}, {embedding[1]:.6f}, ... {embedding[-1]:.6f}]", self.name)
        return ToolResult(True, json.dumps(result)[:500], self.name)


class BalanceTool(BaseTool):
    """Check Venice account balance."""
    name = "balance"
    description = "Check Venice API account balance and usage"
    parameters = {"type": "object", "properties": {}}

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        result = self._client.check_balance()
        if "error" in result:
            return ToolResult(False, f"Balance check failed: {result['error']}", self.name)
        return ToolResult(True, json.dumps(result, indent=2)[:2000], self.name)


class WebSearchTool(BaseTool):
    """Web search via Venice — uses LLM with web search enabled."""
    name = "web_search"
    description = "Search the web using Venice AI's web search capability"
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"},
            "scrape": {"type": "boolean", "description": "Also scrape URLs found (default: false)"},
        },
        "required": ["query"],
    }

    def __init__(self, client=None):
        self._client = client

    def execute(self, params: dict, workspace: str) -> ToolResult:
        if not self._client:
            return ToolResult(False, "No LLM client available", self.name)
        query = params["query"]
        scrape = params.get("scrape", False)
        venice_overrides = {
            "enable_web_search": "on",
            "enable_web_citations": True,
            "include_venice_system_prompt": False,
        }
        if scrape:
            venice_overrides["enable_web_scraping"] = True

        messages = [
            {"role": "system", "content": "You are a web research assistant. Return factual, cited results."},
            {"role": "user", "content": query},
        ]
        response = ""
        for token in self._client.chat_stream(messages, "venice-uncensored", venice_overrides=venice_overrides):
            response += token
        if response:
            return ToolResult(True, response[:5000], self.name)
        return ToolResult(False, "Web search returned no results", self.name)
