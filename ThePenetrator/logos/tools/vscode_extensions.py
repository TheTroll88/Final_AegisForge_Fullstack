"""VS Code Extension Manager — Logos's interface to the VS Code extension ecosystem.

Lets Logos list, search, install, uninstall, enable, and disable VS Code extensions.
Uses the `code` CLI directly — full control over the extension catalog.
"""

import json
import os
import re
import subprocess
from pathlib import Path

from logos.tools.base import BaseTool, ToolResult

# VS Code CLI path (user-space install)
CODE_CMD = r"C:\Users\natha\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd"
EXTENSIONS_DIR = Path.home() / ".vscode" / "extensions"


class ExtensionManagerTool(BaseTool):
    """Manage VS Code extensions — list, search marketplace, install, uninstall."""

    name = "vscode_extensions"
    description = (
        "Manage VS Code extensions: list installed, search marketplace, "
        "install/uninstall extensions, view extension details"
    )
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list", "search", "install", "uninstall", "info", "categories"],
                "description": (
                    "list=show all installed, search=find on marketplace, "
                    "install=install extension, uninstall=remove extension, "
                    "info=details about installed extension, "
                    "categories=group installed by category"
                ),
            },
            "query": {
                "type": "string",
                "description": "Extension ID (publisher.name) for install/uninstall/info, or search term for search",
            },
            "filter": {
                "type": "string",
                "description": "Filter installed list: keyword to match against name/publisher (for 'list' action)",
            },
        },
        "required": ["action"],
    }

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "").lower()

        if action == "list":
            return self._list_extensions(params.get("filter", ""))
        elif action == "search":
            return self._search_marketplace(params.get("query", ""))
        elif action == "install":
            return self._install(params.get("query", ""))
        elif action == "uninstall":
            return self._uninstall(params.get("query", ""))
        elif action == "info":
            return self._info(params.get("query", ""))
        elif action == "categories":
            return self._categorize()
        else:
            return self._result(False, f"Unknown action: {action}")

    def _result(self, success: bool, output: str) -> ToolResult:
        return ToolResult(success=success, output=output, tool_name=self.name)

    def _run_code_cmd(self, args: list[str], timeout: int = 60) -> tuple[bool, str]:
        """Run a code CLI command and return (success, output)."""
        cmd = [CODE_CMD] + args
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=True,
            )
            output = result.stdout.strip()
            if result.returncode != 0:
                err = result.stderr.strip()
                return False, err or output or f"Exit code {result.returncode}"
            return True, output
        except subprocess.TimeoutExpired:
            return False, f"Command timed out after {timeout}s"
        except FileNotFoundError:
            return False, f"VS Code CLI not found at: {CODE_CMD}"
        except Exception as e:
            return False, f"Error: {e}"

    def _list_extensions(self, filter_term: str = "") -> ToolResult:
        """List all installed extensions, optionally filtered."""
        # Read directly from filesystem for reliability (code CLI can be flaky)
        if not EXTENSIONS_DIR.exists():
            return self._result(False, "Extensions directory not found")

        extensions = []
        for d in sorted(EXTENSIONS_DIR.iterdir()):
            if not d.is_dir() or d.name.startswith("."):
                continue
            # Parse: publisher.name-version
            name = d.name
            # Try to read package.json for richer info
            pkg = d / "package.json"
            if pkg.exists():
                try:
                    data = json.loads(pkg.read_text(encoding="utf-8", errors="replace"))
                    ext_id = f"{data.get('publisher', '?')}.{data.get('name', '?')}"
                    version = data.get("version", "?")
                    display = data.get("displayName", ext_id)
                    desc = data.get("description", "")[:80]
                    extensions.append({
                        "id": ext_id,
                        "version": version,
                        "display": display,
                        "description": desc,
                        "dir": name,
                    })
                except (json.JSONDecodeError, OSError):
                    extensions.append({"id": name, "version": "?", "display": name, "description": "", "dir": name})
            else:
                extensions.append({"id": name, "version": "?", "display": name, "description": "", "dir": name})

        if filter_term:
            fl = filter_term.lower()
            extensions = [e for e in extensions if fl in e["id"].lower() or fl in e["display"].lower() or fl in e["description"].lower()]

        if not extensions:
            return self._result(True, "No extensions found" + (f" matching '{filter_term}'" if filter_term else ""))

        lines = [f"**Installed Extensions ({len(extensions)}):**\n"]
        for e in extensions:
            lines.append(f"- `{e['id']}` v{e['version']} — {e['display']}")
            if e["description"]:
                lines.append(f"  {e['description']}")

        return self._result(True, "\n".join(lines))

    def _search_marketplace(self, query: str) -> ToolResult:
        """Search VS Code marketplace using the code CLI."""
        if not query:
            return self._result(False, "Provide a search query")

        # Use code CLI --list-extensions won't search marketplace,
        # so we use the REST API directly
        import requests

        url = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json;api-version=6.1-preview.1",
        }
        payload = {
            "filters": [
                {
                    "criteria": [
                        {"filterType": 8, "value": "Microsoft.VisualStudio.Code"},
                        {"filterType": 10, "value": query},
                    ],
                    "pageNumber": 1,
                    "pageSize": 15,
                    "sortBy": 0,
                    "sortOrder": 0,
                }
            ],
            "assetTypes": [],
            "flags": 914,
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            return self._result(False, f"Marketplace search failed: {e}")

        results = data.get("results", [{}])[0].get("extensions", [])
        if not results:
            return self._result(True, f"No marketplace results for '{query}'")

        # Check what's already installed
        installed = set()
        if EXTENSIONS_DIR.exists():
            for d in EXTENSIONS_DIR.iterdir():
                if d.is_dir() and not d.name.startswith("."):
                    installed.add(d.name.rsplit("-", 1)[0].lower())

        lines = [f"**Marketplace Results for '{query}' ({len(results)}):**\n"]
        for ext in results:
            pub = ext.get("publisher", {}).get("publisherName", "?")
            name = ext.get("extensionName", "?")
            ext_id = f"{pub}.{name}"
            display = ext.get("displayName", name)
            desc = ext.get("shortDescription", "")[:100]
            version = "?"
            for v in ext.get("versions", []):
                version = v.get("version", "?")
                break
            status = " ✓ INSTALLED" if ext_id.lower() in installed else ""
            lines.append(f"- `{ext_id}` v{version}{status}")
            lines.append(f"  {display} — {desc}")
            lines.append(f"  Install: `>> TOOL vscode_extensions install {ext_id}`")
            lines.append("")

        return self._result(True, "\n".join(lines))

    def _install(self, ext_id: str) -> ToolResult:
        """Install an extension by ID."""
        if not ext_id:
            return self._result(False, "Provide extension ID (publisher.name)")
        if not re.match(r'^[\w\-]+\.[\w\-]+$', ext_id):
            return self._result(False, f"Invalid extension ID format: {ext_id}")

        ok, output = self._run_code_cmd(["--install-extension", ext_id, "--force"], timeout=120)
        if ok:
            return self._result(True, f"Installed: {ext_id}\n{output}")
        else:
            return self._result(False, f"Failed to install {ext_id}: {output}")

    def _uninstall(self, ext_id: str) -> ToolResult:
        """Uninstall an extension by ID."""
        if not ext_id:
            return self._result(False, "Provide extension ID (publisher.name)")
        if not re.match(r'^[\w\-]+\.[\w\-]+$', ext_id):
            return self._result(False, f"Invalid extension ID format: {ext_id}")

        ok, output = self._run_code_cmd(["--uninstall-extension", ext_id], timeout=60)
        if ok:
            return self._result(True, f"Uninstalled: {ext_id}\n{output}")
        else:
            return self._result(False, f"Failed to uninstall {ext_id}: {output}")

    def _info(self, query: str) -> ToolResult:
        """Show details about an installed extension."""
        if not query:
            return self._result(False, "Provide extension ID or name")

        ql = query.lower()
        if not EXTENSIONS_DIR.exists():
            return self._result(False, "Extensions directory not found")

        for d in EXTENSIONS_DIR.iterdir():
            if not d.is_dir() or d.name.startswith("."):
                continue
            if ql in d.name.lower():
                pkg = d / "package.json"
                if pkg.exists():
                    try:
                        data = json.loads(pkg.read_text(encoding="utf-8", errors="replace"))
                        ext_id = f"{data.get('publisher', '?')}.{data.get('name', '?')}"
                        info_lines = [
                            f"**{data.get('displayName', ext_id)}**",
                            f"- ID: `{ext_id}`",
                            f"- Version: {data.get('version', '?')}",
                            f"- Publisher: {data.get('publisher', '?')}",
                            f"- Description: {data.get('description', 'N/A')}",
                        ]
                        # Categories
                        cats = data.get("categories", [])
                        if cats:
                            info_lines.append(f"- Categories: {', '.join(cats)}")
                        # Activation events
                        events = data.get("activationEvents", [])
                        if events:
                            info_lines.append(f"- Activation: {', '.join(events[:5])}")
                        # Commands
                        commands = data.get("contributes", {}).get("commands", [])
                        if commands:
                            cmd_list = [c.get("title", c.get("command", "?")) for c in commands[:10]]
                            info_lines.append(f"- Commands: {', '.join(cmd_list)}")
                        # Dependencies
                        deps = data.get("extensionDependencies", [])
                        if deps:
                            info_lines.append(f"- Dependencies: {', '.join(deps)}")

                        return self._result(True, "\n".join(info_lines))
                    except (json.JSONDecodeError, OSError) as e:
                        return self._result(False, f"Error reading package.json: {e}")

        return self._result(False, f"No installed extension matching '{query}'")

    def _categorize(self) -> ToolResult:
        """Group installed extensions by category."""
        if not EXTENSIONS_DIR.exists():
            return self._result(False, "Extensions directory not found")

        categories: dict[str, list[str]] = {}
        for d in sorted(EXTENSIONS_DIR.iterdir()):
            if not d.is_dir() or d.name.startswith("."):
                continue
            pkg = d / "package.json"
            cats = ["Uncategorized"]
            ext_id = d.name
            if pkg.exists():
                try:
                    data = json.loads(pkg.read_text(encoding="utf-8", errors="replace"))
                    ext_id = f"{data.get('publisher', '?')}.{data.get('name', '?')}"
                    cats = data.get("categories", ["Uncategorized"])
                except (json.JSONDecodeError, OSError):
                    pass
            for cat in cats:
                categories.setdefault(cat, []).append(ext_id)

        lines = [f"**Extensions by Category ({sum(len(v) for v in categories.values())} total):**\n"]
        for cat in sorted(categories.keys()):
            exts = categories[cat]
            lines.append(f"### {cat} ({len(exts)})")
            for e in sorted(exts):
                lines.append(f"  - `{e}`")
            lines.append("")

        return self._result(True, "\n".join(lines))
