"""File operation tools — read, write, edit, delete."""

import os
from logos.tools.base import BaseTool, ToolResult


def _resolve(path: str, workspace: str) -> str:
    """Resolve a path relative to workspace."""
    path = path.strip().strip('"').strip("'").replace("/", os.sep)
    if os.path.isabs(path):
        return path
    return os.path.join(workspace, path)


class ReadFileTool(BaseTool):
    name = "read_file"
    description = "Read the contents of a file"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path (relative or absolute)"},
            "offset": {"type": "integer", "description": "Line offset to start reading from"},
            "limit": {"type": "integer", "description": "Max lines to read"},
        },
        "required": ["path"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        fpath = _resolve(params["path"], workspace)
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
            offset = params.get("offset", 0)
            limit = params.get("limit")
            if limit:
                lines = lines[offset:offset + limit]
            elif offset:
                lines = lines[offset:]
            content = "".join(lines)
            return ToolResult(True, f"[{fpath} — {len(content)} chars]\n{content}", self.name)
        except Exception as e:
            return ToolResult(False, f"Error reading {fpath}: {e}", self.name)


class WriteFileTool(BaseTool):
    name = "write_file"
    description = "Create or overwrite a file with content"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path"},
            "content": {"type": "string", "description": "File content to write"},
        },
        "required": ["path", "content"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        fpath = _resolve(params["path"], workspace)
        content = params.get("content", "")
        try:
            d = os.path.dirname(fpath)
            if d:
                os.makedirs(d, exist_ok=True)
            with open(fpath, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            return ToolResult(True, f"Wrote {fpath} ({len(content)} chars)", self.name)
        except Exception as e:
            return ToolResult(False, f"Error writing {fpath}: {e}", self.name)


class EditFileTool(BaseTool):
    name = "edit_file"
    description = "Find and replace text in a file"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path"},
            "find": {"type": "string", "description": "Exact text to find"},
            "replace": {"type": "string", "description": "Replacement text"},
        },
        "required": ["path", "find", "replace"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        fpath = _resolve(params["path"], workspace)
        find_str = params["find"]
        replace_str = params["replace"]
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            if find_str not in content:
                return ToolResult(False, f"Text not found in {fpath}", self.name)
            new_content = content.replace(find_str, replace_str, 1)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            return ToolResult(True, f"Edited {fpath}", self.name)
        except Exception as e:
            return ToolResult(False, f"Error editing {fpath}: {e}", self.name)


class DeleteFileTool(BaseTool):
    name = "delete_file"
    description = "Delete a file"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path to delete"},
        },
        "required": ["path"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        fpath = _resolve(params["path"], workspace)
        try:
            os.remove(fpath)
            return ToolResult(True, f"Deleted {fpath}", self.name)
        except Exception as e:
            return ToolResult(False, f"Error deleting {fpath}: {e}", self.name)
