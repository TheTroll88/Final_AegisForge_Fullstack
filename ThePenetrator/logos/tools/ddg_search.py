"""DuckDuckGo web search tool — no API key required."""

from logos.tools.base import BaseTool, ToolResult


class DDGSearchTool(BaseTool):
    name = "web_search"
    description = "Search the web using DuckDuckGo (no API key needed)"
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"},
            "max_results": {
                "type": "integer",
                "description": "Max results to return (default: 8)",
            },
            "region": {
                "type": "string",
                "description": "Region code, e.g. 'us-en' (default: 'wt-wt' for global)",
            },
        },
        "required": ["query"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        query = params["query"]
        max_results = params.get("max_results", 8)
        region = params.get("region", "wt-wt")

        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return ToolResult(
                False,
                "duckduckgo-search not installed. Run: pip install duckduckgo-search",
                self.name,
            )

        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, region=region, max_results=max_results))

            if not results:
                return ToolResult(True, "No results found.", self.name)

            lines = []
            for i, r in enumerate(results, 1):
                title = r.get("title", "")
                href = r.get("href", "")
                body = r.get("body", "")
                lines.append(f"[{i}] {title}\n    {href}\n    {body}")

            return ToolResult(True, "\n\n".join(lines), self.name)
        except Exception as e:
            return ToolResult(False, f"Search failed: {e}", self.name)


class DDGNewsTool(BaseTool):
    name = "news_search"
    description = "Search recent news using DuckDuckGo (no API key needed)"
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "News search query"},
            "max_results": {
                "type": "integer",
                "description": "Max results (default: 5)",
            },
            "timelimit": {
                "type": "string",
                "description": "Time filter: 'd' (day), 'w' (week), 'm' (month)",
            },
        },
        "required": ["query"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        query = params["query"]
        max_results = params.get("max_results", 5)
        timelimit = params.get("timelimit", None)

        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return ToolResult(False, "duckduckgo-search not installed.", self.name)

        try:
            with DDGS() as ddgs:
                kwargs = {"keywords": query, "max_results": max_results}
                if timelimit:
                    kwargs["timelimit"] = timelimit
                results = list(ddgs.news(**kwargs))

            if not results:
                return ToolResult(True, "No news found.", self.name)

            lines = []
            for i, r in enumerate(results, 1):
                title = r.get("title", "")
                url = r.get("url", "")
                source = r.get("source", "")
                date = r.get("date", "")
                body = r.get("body", "")
                lines.append(f"[{i}] {title} ({source}, {date})\n    {url}\n    {body}")

            return ToolResult(True, "\n\n".join(lines), self.name)
        except Exception as e:
            return ToolResult(False, f"News search failed: {e}", self.name)
