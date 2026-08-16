"""Enforce the thesis at the import level: risk_engine (and score_api, the /score
fast path) must never touch the LLM.

If anything under risk_engine/ imports openai or the llm package, this fails.
That makes "deterministic math is separate from the LLM" a *provable* property,
not a claim in a README.
"""

from __future__ import annotations

import ast
import pathlib

SRC_DIR = pathlib.Path(__file__).resolve().parent.parent / "src"
PACKAGE_ROOT = SRC_DIR / "riskpilot"
ENGINE_DIR = PACKAGE_ROOT / "risk_engine"
LLM_DIR = PACKAGE_ROOT / "llm"
FORBIDDEN = ("openai", "riskpilot.llm")


def _imports(path: pathlib.Path) -> list[str]:
    tree = ast.parse(path.read_text())
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names += [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.append(node.module)
    return names


def test_risk_engine_has_zero_llm_imports() -> None:
    offenders: list[str] = []
    for py in ENGINE_DIR.rglob("*.py"):
        for imp in _imports(py):
            if any(imp == f or imp.startswith(f + ".") for f in FORBIDDEN):
                offenders.append(f"{py.name}: {imp}")
    assert not offenders, f"risk_engine must not import the LLM layer: {offenders}"


# ── transitive closure walk ──────────────────────────────────────────────────
# The check above only scans files that happen to live in one directory, which
# is fine for a whole package but not for a single-module root like score_api.py.
# For that we need the ACTUAL import graph: follow every intra-package import
# (relative, or absolute `riskpilot.*`) to its source file, recursively, and
# prove none of them is a direct `openai` import or a file living inside
# riskpilot/llm/ — a real transitivity guarantee, not a directory listing.


def _resolve(base_dir: pathlib.Path, dotted: str) -> pathlib.Path | None:
    """`dotted` resolved relative to base_dir -> an existing riskpilot .py file."""
    target = base_dir.joinpath(*dotted.split(".")) if dotted else base_dir
    if target.is_dir() and (target / "__init__.py").is_file():
        return target / "__init__.py"
    py_file = target.with_suffix(".py")
    return py_file if py_file.is_file() else None


def _strip_riskpilot_prefix(module: str) -> str | None:
    if module == "riskpilot":
        return ""
    if module.startswith("riskpilot."):
        return module[len("riskpilot.") :]
    return None


def _resolve_import(node: ast.AST, from_file: pathlib.Path) -> list[pathlib.Path]:
    """Every riskpilot-internal source file this single import statement reaches."""
    if isinstance(node, ast.Import):
        targets = []
        for alias in node.names:
            rest = _strip_riskpilot_prefix(alias.name)
            if rest is not None:
                resolved = _resolve(PACKAGE_ROOT, rest)
                if resolved:
                    targets.append(resolved)
        return targets

    if not isinstance(node, ast.ImportFrom):
        return []

    if node.level > 0:
        base = from_file.parent
        for _ in range(node.level - 1):
            base = base.parent
        if node.module:
            target = _resolve(base, node.module)
            return [target] if target else []
        # bare `from . import metrics, score` — each name IS a submodule
        return [t for a in node.names if (t := _resolve(base, a.name))]

    if node.module:
        rest = _strip_riskpilot_prefix(node.module)
        if rest is not None:
            target = _resolve(PACKAGE_ROOT, rest)
            return [target] if target else []

    return []


def _transitive_closure(entry: pathlib.Path) -> set[pathlib.Path]:
    """Every riskpilot source file reachable from `entry` via imports (BFS)."""
    seen = {entry}
    stack = [entry]
    while stack:
        current = stack.pop()
        tree = ast.parse(current.read_text())
        for node in ast.walk(tree):
            for target in _resolve_import(node, current):
                if target not in seen:
                    seen.add(target)
                    stack.append(target)
    return seen


def test_score_api_transitive_imports_exclude_llm() -> None:
    """riskpilot.score_api powers the what-if slider — it must reach neither the
    openai SDK nor a single file inside riskpilot/llm/, no matter how many hops
    away, or the 'math-only fast path' guarantee is just a comment."""
    entry = PACKAGE_ROOT / "score_api.py"
    closure = _transitive_closure(entry)

    llm_files = sorted(p for p in closure if LLM_DIR in p.parents)
    assert not llm_files, f"score_api transitively imports the LLM layer: {llm_files}"

    offenders: list[str] = []
    for py in closure:
        for imp in _imports(py):
            if any(imp == f or imp.startswith(f + ".") for f in FORBIDDEN):
                offenders.append(f"{py.relative_to(PACKAGE_ROOT)}: {imp}")
    assert not offenders, f"score_api's import closure touches the LLM: {offenders}"
