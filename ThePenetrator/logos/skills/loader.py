"""Skill discovery — loads Python and JSON skills."""

from __future__ import annotations

import os
import sys
import json
import importlib
import importlib.util
from logos.skills.base import BaseSkill


class JSONSkill(BaseSkill):
    """A skill loaded from an AI-Agents-Library JSON template."""

    def __init__(self, data: dict, filename: str = ""):
        # Use identifier if present, otherwise derive from filename
        self.name = data.get("identifier", "")
        if not self.name and filename:
            self.name = os.path.splitext(filename)[0]
        if not self.name:
            self.name = "unknown"
        self.trigger = f"/{self.name}"
        meta = data.get("meta", {})
        self.description = meta.get("description", data.get("author", ""))
        self.system_prompt_injection = data.get("config", {}).get("systemRole", "")
        self._data = data


class SkillLoader:
    """Discovers and loads skills from directories."""

    def __init__(self):
        self.skills: dict[str, BaseSkill] = {}

    def load_directory(self, directory: str):
        """Load all skills from a directory (.py and .json files)."""
        if not os.path.isdir(directory):
            return

        for fname in sorted(os.listdir(directory)):
            fpath = os.path.join(directory, fname)

            if fname.endswith(".py") and fname != "__init__.py":
                self._load_python_skill(fpath)
            elif fname.endswith(".json"):
                self._load_json_skill(fpath)

    def _load_python_skill(self, filepath: str):
        """Load a Python skill module."""
        try:
            module_name = os.path.splitext(os.path.basename(filepath))[0]
            spec = importlib.util.spec_from_file_location(f"logos_skill_{module_name}", filepath)
            if spec is None or spec.loader is None:
                return
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Find all BaseSkill subclasses in the module
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and issubclass(attr, BaseSkill)
                        and attr is not BaseSkill and attr.name):
                    skill = attr()
                    self.skills[skill.trigger] = skill
        except Exception as e:
            print(f"  [Warning: failed to load skill {filepath}: {e}]")

    def _load_json_skill(self, filepath: str):
        """Load a JSON skill (AI-Agents-Library compatible)."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "config" in data and "systemRole" in data.get("config", {}):
                fname = os.path.basename(filepath)
                skill = JSONSkill(data, filename=fname)
                self.skills[skill.trigger] = skill
        except Exception:
            pass  # Silently skip broken JSON files (library has 505+ files)

    def get(self, trigger: str) -> BaseSkill | None:
        return self.skills.get(trigger)

    def list_skills(self) -> list[tuple[str, str]]:
        """Return list of (trigger, description) pairs."""
        return [(s.trigger, s.description) for s in self.skills.values()]
