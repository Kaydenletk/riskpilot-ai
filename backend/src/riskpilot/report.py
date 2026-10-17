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
from .schema import PortfolioGoal, RiskReport


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


def build_report_from_holdings(
    config: Config,
    shares: dict[str, float],
    goal: PortfolioGoal | None = None,
) -> RiskReport:
    """Score an uploaded portfolio. Raises UnknownHolding / ValueError on bad input;
    the API layer maps those to 422 / 400. Reuses the same grounded explain pipeline
    as the sample report, so the number-hallucination guardrail still applies.

    Goal fit mirrors the weighted branch: computed over market-value weights so
    a stated goal is never silently dropped whichever input mode the client used."""
    from .risk_engine import compute_report
    from .risk_engine.goal import compute_goal_fit

    holdings, facts = compute_report(shares)
    goal_fit = (
        compute_goal_fit({h.ticker: h.market_value for h in holdings}, goal)
        if goal is not None
        else None
    )
    explanation = explain(config, facts, goal_fit)
    return RiskReport(
        portfolio_name="Your portfolio",
        as_of="illustrative sample data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
        goal_fit=goal_fit,
    )


def build_report_from_weights(
    config: Config,
    weights_pct: dict[str, float],
    goal: PortfolioGoal | None = None,
) -> RiskReport:
    """Weighted variant of build_report_from_holdings — same grounded explain
    pipeline, so the number-hallucination guardrail applies unchanged. Raises
    UnknownHolding / ValueError on bad input; the API layer maps those to 422 / 400.

    When the builder states a portfolio goal, deterministic goal-fit facts ride
    the report and join the guardrail whitelist — computed AFTER the universe
    check inside compute_report_from_weights, so unknown tickers still 422."""
    from .risk_engine.goal import compute_goal_fit
    from .risk_engine.portfolio import compute_report_from_weights

    holdings, facts = compute_report_from_weights(weights_pct)
    goal_fit = compute_goal_fit(weights_pct, goal) if goal is not None else None
    explanation = explain(config, facts, goal_fit)
    return RiskReport(
        portfolio_name="Your portfolio",
        as_of="synthetic illustrative data",
        holdings=holdings,
        facts=facts,
        explanation=explanation,
        goal_fit=goal_fit,
    )
