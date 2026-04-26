"""Smart workspace scanner — gitignore-aware, lazy loading, token budgeted."""

from __future__ import annotations

import os
import fnmatch
from pathlib import Path


class WorkspaceScanner:
    """Scans workspace and builds file tree, optionally loading contents."""

    def __init__(self, roots: list[str], skip_dirs: list[str], skip_patterns: list[str],
                 max_file_size: int = 50000, gitignore_aware: bool = True):
        self.roots = [os.path.abspath(r) for r in roots]
        self.skip_dirs = set(skip_dirs)
        self.skip_patterns = skip_patterns
        self.max_file_size = max_file_size
        self.gitignore_patterns: list[str] = []
        if gitignore_aware:
            self._load_gitignore()

    def _load_gitignore(self):
        """Load .gitignore patterns from all roots."""
        for root in self.roots:
            gi = os.path.join(root, ".gitignore")
            if os.path.exists(gi):
                with open(gi, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            self.gitignore_patterns.append(line)

    def _should_skip_file(self, filename: str, rel_path: str) -> bool:
        """Check if a file should be skipped."""
        for pat in self.skip_patterns:
            if fnmatch.fnmatch(filename, pat):
                return True
        for pat in self.gitignore_patterns:
            if fnmatch.fnmatch(rel_path, pat) or fnmatch.fnmatch(filename, pat):
                return True
        return False

    def scan_tree(self, root: str | None = None) -> str:
        """Build a file tree string."""
        root = root or self.roots[0]
        lines = []
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted([d for d in dirnames if d not in self.skip_dirs and not d.startswith(".")])
            rel_dir = os.path.relpath(dirpath, root)
            depth = 0 if rel_dir == "." else rel_dir.count(os.sep) + 1
            indent = "  " * depth
            dirname = os.path.basename(dirpath) if rel_dir != "." else os.path.basename(root)
            lines.append(f"{indent}{dirname}/")
            for fname in sorted(filenames):
                rel = os.path.relpath(os.path.join(dirpath, fname), root).replace("\\", "/")
                if not self._should_skip_file(fname, rel):
                    lines.append(f"{indent}  {fname}")
        return "\n".join(lines)

    def scan_contents(self, root: str | None = None, max_chars: int = 120000) -> dict[str, str]:
        """Load file contents up to a char budget."""
        root = root or self.roots[0]
        contents = {}
        total_chars = 0

        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted([d for d in dirnames if d not in self.skip_dirs and not d.startswith(".")])
            for fname in sorted(filenames):
                fpath = os.path.join(dirpath, fname)
                rel = os.path.relpath(fpath, root).replace("\\", "/")
                if self._should_skip_file(fname, rel):
                    continue
                try:
                    size = os.path.getsize(fpath)
                    if size > self.max_file_size:
                        contents[rel] = f"[TOO LARGE: {size} bytes]"
                        continue
                    if total_chars + size > max_chars:
                        contents[rel] = f"[SKIPPED: context budget exceeded]"
                        continue
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    contents[rel] = content
                    total_chars += len(content)
                except Exception:
                    contents[rel] = "[BINARY/UNREADABLE]"

        return contents

    def build_context(self, lazy: bool = True, max_chars: int = 120000) -> tuple[str, str]:
        """Build workspace context. Returns (tree, contents_block)."""
        root = self.roots[0]
        tree = self.scan_tree(root)

        if lazy:
            return tree, "(Files loaded on demand via read_file tool. Use it to read any file.)"

        contents = self.scan_contents(root, max_chars)
        block = ""
        for path, content in contents.items():
            block += f"\n=== {path} ===\n{content}\n"
        return tree, block
