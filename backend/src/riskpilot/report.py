"""Assemble a full RiskReport.

M1: facts come from risk_engine (deterministic), explanation from the template
(DEMO_MODE / fail-closed). M2: when has_live_llm, call OpenAI Structured Outputs,
run the guardrail, regenerate-once-then-template on violation, and set the source
flag to model / model_regenerated accordingly.
"""

from __future__ import annotations

from .config import Config
from .llm import build_template_explanation
from .risk_engine import compute_sample_report
from .schema import ExplanationSource, RiskReport


def build_sample_report(config: Config) -> RiskReport:
    holdings, facts = compute_sample_report()
    explanation = build_template_explanation(facts)

    # M1: DEMO_MODE always uses the template. Label the source honestly so the UI
    # can show "verified" / "demo" badges (DX/design: make the guardrail visible).
    explanation.source = (
        ExplanationSource.demo_fixture if config.demo_mode else ExplanationSource.template_fallback
    )

    return RiskReport(
        portfolio_name="Sample Aggressive Portfolio",
        as_of="illustrative sample data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
    )
