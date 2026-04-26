"""Base tool class and tool result."""

from dataclasses import dataclass


@dataclass
class ToolResult:
    """Result from executing a tool."""
    success: bool
    output: str
    tool_name: str


class BaseTool:
    """Abstract base class for all Logos tools."""

    name: str = ""
    description: str = ""
    parameters: dict = {}

    def execute(self, params: dict, workspace: str) -> ToolResult:
        """Execute the tool with given parameters. Override in subclass."""
        raise NotImplementedError(f"{self.name} has no execute implementation")

    def to_schema(self) -> dict:
        """Export as OpenAI-compatible function schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }
