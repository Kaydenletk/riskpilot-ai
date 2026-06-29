"""Enforce the thesis at the import level: risk_engine must never touch the LLM.

If anything under risk_engine/ imports openai or the llm package, this fails.
That makes "deterministic math is separate from the LLM" a *provable* property,
not a claim in a README.
"""

from __future__ import annotations

import ast
import pathlib

ENGINE_DIR = pathlib.Path(__file__).resolve().parent.parent / "src" / "riskpilot" / "risk_engine"
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
