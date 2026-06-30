"""LLM explanation layer + the number-hallucination guardrail.

The headline artifact lives in `number_guardrail.py`. The rule: an explanation
may reference ONLY numbers that risk_engine computed. M1 ships the guardrail
core + a deterministic template explainer (used in DEMO_MODE and as the
fail-closed fallback). M2 adds the live OpenAI Structured Outputs call that the
guardrail wraps.
"""

from .explain import explain
from .number_guardrail import find_ungrounded_numbers, is_grounded
from .template import build_template_explanation

__all__ = [
    "explain",
    "find_ungrounded_numbers",
    "is_grounded",
    "build_template_explanation",
]
