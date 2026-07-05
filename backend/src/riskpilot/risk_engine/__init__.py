"""Deterministic financial math. The contract here is hard: NO OpenAI/LLM imports.

An import-lint test (tests/test_no_llm_in_engine.py) enforces it so the
math-vs-LLM separation — the project's whole thesis — is provable, not claimed.

M1 ships a single hand-built sample report so the stack is end-to-end runnable.
M2 replaces `compute_sample_report` internals with real formulas (volatility via
sample stdev x sqrt(252), value-weighted HHI concentration, drawdown, beta).
"""

from .portfolio import UnknownHolding, compute_report
from .sample import compute_sample_report

__all__ = ["compute_sample_report", "compute_report", "UnknownHolding"]
