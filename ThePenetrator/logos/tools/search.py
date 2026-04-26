"""Search and directory listing tools."""

import os
import re
import fnmatch
from logos.tools.base import BaseTool, ToolResult


SKIP_DIRS = {".git", ".trunk", ".vscode", ".continue", "node_modules", "__pycache__", "venv"}


class SearchFilesTool(BaseTool):
    name = "search_files"
    description = "Search file contents for a regex pattern (like grep)"
    parameters = {
        "type": "object",
        "properties": {
            "pattern": {"type": "string", "description": "Regex pattern to search for"},
            "path": {"type": "string", "description": "Directory to search in (default: workspace root)"},
            "glob": {"type": "string", "description": "Glob pattern to filter files (e.g. '*.py')"},
        },
        "required": ["pattern"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        pattern = params["pattern"]
        search_path = params.get("path", workspace)
        if not os.path.isabs(search_path):
            search_path = os.path.join(workspace, search_path)
        file_glob = params.get("glob", "*")

        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return ToolResult(False, f"Invalid regex: {e}", self.name)

        matches = []
        for dirpath, dirnames, filenames in os.walk(search_path):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fname in filenames:
                if not fnmatch.fnmatch(fname, file_glob):
                    continue
                fpath = os.path.join(dirpath, fname)
                rel = os.path.relpath(fpath, workspace)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        for i, line in enumerate(f, 1):
                            if regex.search(line):
                                matches.append(f"{rel}:{i}: {line.rstrip()}")
                                if len(matches) >= 100:
                                    break
                except Exception:
                    continue
                if len(matches) >= 100:
                    break

        if matches:
            return ToolResult(True, "\n".join(matches), self.name)
        return ToolResult(True, "No matches found.", self.name)


class GlobFilesTool(BaseTool):
    name = "glob_files"
    description = "Find files matching a glob pattern"
    parameters = {
        "type": "object",
        "properties": {
            "pattern": {"type": "string", "description": "Glob pattern (e.g. '**/*.py')"},
            "path": {"type": "string", "description": "Directory to search in"},
        },
        "required": ["pattern"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        import glob as globmod
        pattern = params["pattern"]
        search_path = params.get("path", workspace)
        if not os.path.isabs(search_path):
            search_path = os.path.join(workspace, search_path)

        full_pattern = os.path.join(search_path, pattern)
        found = globmod.glob(full_pattern, recursive=True)
        results = [os.path.relpath(f, workspace) for f in found[:200]]
        if results:
            return ToolResult(True, "\n".join(results), self.name)
        return ToolResult(True, "No files found.", self.name)


class ListDirectoryTool(BaseTool):
    name = "list_directory"
    description = "List files and directories in a path"
    parameters = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Directory path (default: workspace root)"},
            "recursive": {"type": "boolean", "description": "List recursively"},
        },
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        path = params.get("path", workspace)
        if not os.path.isabs(path):
            path = os.path.join(workspace, path)
        recursive = params.get("recursive", False)

        try:
            if recursive:
                lines = []
                for dirpath, dirnames, filenames in os.walk(path):
                    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
                    rel = os.path.relpath(dirpath, path)
                    depth = 0 if rel == "." else rel.count(os.sep) + 1
                    indent = "  " * depth
                    lines.append(f"{indent}{os.path.basename(dirpath)}/")
                    for f in sorted(filenames):
                        lines.append(f"{indent}  {f}")
                return ToolResult(True, "\n".join(lines), self.name)
            else:
                entries = sorted(os.listdir(path))
                lines = []
                for e in entries:
                    full = os.path.join(path, e)
                    suffix = "/" if os.path.isdir(full) else ""
                    lines.append(f"{e}{suffix}")
                return ToolResult(True, "\n".join(lines), self.name)
        except Exception as e:
            return ToolResult(False, f"Error listing {path}: {e}", self.name)
