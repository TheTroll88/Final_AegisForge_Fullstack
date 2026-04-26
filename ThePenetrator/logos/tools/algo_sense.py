"""Algo Sense — 80 algorithm implementations from the Algo Sense VS Code extension.

Logos tool that provides access to search, sort, number theory, and matrix algorithms.
Actions: list, search, get (code + complexity), run (execute Python implementation).
"""

from __future__ import annotations

import json
import os
from typing import Optional

from logos.tools.base import BaseTool, ToolResult

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "algo_catalog.json")


def _load_catalog() -> list[dict]:
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


CATALOG = _load_catalog()
CATEGORIES = sorted(set(a["category"] for a in CATALOG))
BY_ID = {a["id"]: a for a in CATALOG}


class AlgoSenseTool(BaseTool):
    """Access 80 algorithm implementations — search, sort, number theory, matrix/linear algebra."""

    name = "algo_sense"
    description = (
        "Algorithm library with 80 implementations across 4 categories: "
        "Number Theory (primality, factorization, modular arithmetic, CRT, Pollard's Rho), "
        "Searching (binary, DFS, BFS, Rabin-Karp, KMP, Boyer-Moore), "
        "Sorting (quick, merge, heap, radix, timsort, introsort, bitonic), "
        "Matrix/Linear Algebra (inverse, decomposition, eigenvalues, Cramer's rule). "
        "Each algorithm has Python/JS code, complexity analysis, and pseudocode. "
        "Actions: list (by category), search (by keyword), get (full details + code), run (execute Python code)."
    )
    parameters = {
        "action": {
            "type": "string",
            "description": "One of: list, search, get, run",
            "required": True,
        },
        "query": {
            "type": "string",
            "description": "For search: keyword. For get/run: algorithm ID (e.g. 'pollards-rho', 'miller-rabin-primality-test')",
            "required": False,
        },
        "category": {
            "type": "string",
            "description": "Filter by category: 'Number Theory', 'Searching Algorithms', 'Sorting Algorithms', 'Matrix and Linear Algebra Algorithms'",
            "required": False,
        },
        "input_data": {
            "type": "string",
            "description": "For run action: input to pass to the algorithm (e.g. '997' for primality, '[5,3,1,4,2]' for sorting)",
            "required": False,
        },
        "language": {
            "type": "string",
            "description": "Code language: python (default), javascript",
            "required": False,
        },
    }

    def _result(self, success: bool, output: str) -> ToolResult:
        return ToolResult(success=success, output=output, tool_name=self.name)

    def execute(self, params: dict, workspace: str) -> ToolResult:
        action = params.get("action", "list")
        query = params.get("query", "")
        category = params.get("category", "")
        input_data = params.get("input_data", "")
        language = params.get("language", "python")

        if action == "list":
            return self._list_algorithms(category)
        elif action == "search":
            return self._search(query)
        elif action == "get":
            return self._get_algorithm(query, language)
        elif action == "run":
            return self._run_algorithm(query, input_data)
        else:
            return self._result(
                False, f"Unknown action '{action}'. Use: list, search, get, run"
            )

    def _list_algorithms(self, category: str) -> ToolResult:
        if category:
            algos = [a for a in CATALOG if category.lower() in a["category"].lower()]
        else:
            algos = CATALOG

        lines = [f"**{len(algos)} algorithms**\n"]
        current_cat = ""
        for a in algos:
            if a["category"] != current_cat:
                current_cat = a["category"]
                lines.append(f"\n## {current_cat}")
            tc = a.get("time_complexity", {})
            avg = tc.get("average", tc.get("worst", "?"))
            lines.append(f"- `{a['id']}` — {a['name']} [{avg}]")

        return self._result(True, "\n".join(lines))

    def _search(self, query: str) -> ToolResult:
        if not query:
            return self._result(False, "Provide a search query")

        q = query.lower()
        matches = []
        for a in CATALOG:
            score = 0
            if q in a["name"].lower():
                score += 10
            if q in a["id"].lower():
                score += 8
            if q in a["description"].lower():
                score += 5
            if q in a["category"].lower():
                score += 3
            tags = [t.lower() for t in a.get("tags", [])]
            if any(q in t for t in tags):
                score += 4
            if score > 0:
                matches.append((score, a))

        matches.sort(key=lambda x: -x[0])
        if not matches:
            return self._result(True, f"No algorithms matching '{query}'")

        lines = [f"**{len(matches)} matches for '{query}'**\n"]
        for score, a in matches[:15]:
            tc = a.get("time_complexity", {})
            avg = tc.get("average", tc.get("worst", "?"))
            lines.append(f"- `{a['id']}` — {a['name']} [{avg}] ({a['category']})")

        return self._result(True, "\n".join(lines))

    def _get_algorithm(self, algo_id: str, language: str) -> ToolResult:
        if not algo_id:
            return self._result(False, "Provide an algorithm ID")

        algo = BY_ID.get(algo_id)
        if not algo:
            candidates = [
                a
                for a in CATALOG
                if algo_id.lower() in a["id"] or algo_id.lower() in a["name"].lower()
            ]
            if candidates:
                algo = candidates[0]
            else:
                return self._result(
                    False, f"Algorithm '{algo_id}' not found. Use 'search' to find it."
                )

        tc = algo.get("time_complexity", {})
        code_key = "python_code" if language.lower() == "python" else "javascript_code"
        code = algo.get(code_key) or algo.get("python_code") or "No code available"

        lines = [
            f"# {algo['name']}",
            f"**Category:** {algo['category']}"
            + (f" > {algo['subcategory']}" if algo.get("subcategory") else ""),
            f"**Description:** {algo['description']}",
            f"\n**Complexity:**",
            f"- Best: {tc.get('best', '?')}",
            f"- Average: {tc.get('average', '?')}",
            f"- Worst: {tc.get('worst', '?')}",
            f"- Space: {algo.get('space_complexity', '?')}",
        ]

        if algo.get("use_cases"):
            lines.append(f"\n**Use Cases:** {', '.join(algo['use_cases'][:5])}")

        lines.append(f"\n**{language.title()} Code:**")
        lines.append(f"```{language.lower()}\n{code}\n```")

        if algo.get("pseudocode"):
            lines.append(f"\n**Pseudocode:**\n```\n{algo['pseudocode']}\n```")

        return self._result(True, "\n".join(lines))

    def _run_algorithm(self, algo_id: str, input_data: str) -> ToolResult:
        if not algo_id:
            return self._result(False, "Provide an algorithm ID")

        algo = BY_ID.get(algo_id)
        if not algo:
            candidates = [
                a
                for a in CATALOG
                if algo_id.lower() in a["id"] or algo_id.lower() in a["name"].lower()
            ]
            if candidates:
                algo = candidates[0]
            else:
                return self._result(False, f"Algorithm '{algo_id}' not found")

        code = algo.get("python_code")
        if not code:
            return self._result(False, f"No Python code for '{algo['name']}'")

        # Build execution wrapper
        exec_globals = {"__builtins__": __builtins__}
        try:
            exec(code, exec_globals)
        except Exception as e:
            return self._result(False, f"Code load error: {e}")

        # Find the main function — prefer functions whose name relates to the algorithm
        funcs = {
            k: v
            for k, v in exec_globals.items()
            if callable(v) and not k.startswith("_")
        }
        if not funcs:
            return self._result(
                True,
                f"Code loaded but no callable function found.\n\n```python\n{code}\n```",
            )

        if not input_data:
            func_names = ", ".join(funcs.keys())
            return self._result(
                True,
                f"Code loaded. Available functions: {func_names}\nProvide input_data to execute.",
            )

        # Pick the best entry point: prefer name containing key parts of the algorithm name
        algo_words = set(algo["name"].lower().replace("'", "").split())
        func_name = list(funcs.keys())[0]
        best_score = 0
        for fname in funcs:
            score = sum(1 for w in algo_words if w in fname.lower())
            if score > best_score:
                best_score = score
                func_name = fname
        main_func = funcs[func_name]

        try:
            parsed = eval(input_data, {"__builtins__": {}})
        except Exception:
            parsed = input_data

        try:
            if isinstance(parsed, (list, tuple)):
                result = (
                    main_func(*parsed)
                    if algo["category"] != "Sorting Algorithms"
                    else main_func(parsed)
                )
            else:
                result = main_func(parsed)
            return self._result(
                True, f"**{algo['name']}** → `{func_name}({input_data})` = `{result}`"
            )
        except TypeError:
            try:
                result = (
                    main_func(*parsed)
                    if isinstance(parsed, (list, tuple))
                    else main_func(parsed)
                )
                return self._result(
                    True,
                    f"**{algo['name']}** → `{func_name}({input_data})` = `{result}`",
                )
            except Exception as e:
                return self._result(
                    False,
                    f"Execution error: {e}\nFunction: {func_name}\nInput: {input_data}",
                )
        except Exception as e:
            return self._result(
                False,
                f"Execution error: {e}\nFunction: {func_name}\nInput: {input_data}",
            )
