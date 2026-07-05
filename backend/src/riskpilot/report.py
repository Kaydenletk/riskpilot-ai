"""Assemble a full RiskReport.

M1: facts come from risk_engine (deterministic), explanation from the template
(DEMO_MODE / fail-closed). M2: when has_live_llm, call OpenAI Structured Outputs,
run the guardrail, regenerate-once-then-template on violation, and set the source
flag to model / model_regenerated accordingly.
"""

from __future__ import annotations

from .config import Config
from .llm import explain
from .risk_engine import compute_sample_report
from .schema import RiskReport


def build_sample_report(config: Config) -> RiskReport:
    holdings, facts = compute_sample_report()

    # Live guardrailed LLM when configured (has_live_llm); deterministic template
    # in DEMO_MODE. The pipeline guarantees the explanation never contains a number
    # absent from `facts`, and stamps the source (model / model_regenerated /
    # template_fallback / demo_fixture) so the UI can show what happened.
    explanation = explain(config, facts)

    return RiskReport(
        portfolio_name="Sample Aggressive Portfolio",
        as_of="illustrative sample data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
    )


def build_report_from_holdings(config: Config, shares: dict[str, float]) -> RiskReport:
    """Score an uploaded portfolio. Raises UnknownHolding / ValueError on bad input;
    the API layer maps those to 422 / 400. Reuses the same grounded explain pipeline
    as the sample report, so the number-hallucination guardrail still applies."""
    from .risk_engine import compute_report

    holdings, facts = compute_report(shares)
    explanation = explain(config, facts)
    return RiskReport(
        portfolio_name="Your portfolio",
        as_of="illustrative sample data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
    )
