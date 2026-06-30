"""Deterministic template explainer.

Used (a) in DEMO_MODE when there's no key, and (b) as the fail-closed fallback
when the live LLM hallucinates a number twice. Because it's built FROM the facts,
it is grounded by construction — it can never invent a number. Checklist items
are phrased as questions, never buy/sell imperatives (compliance).
"""

from __future__ import annotations

from ..schema import ExplanationSource, RiskExplanation, RiskFacts


def build_template_explanation(facts: RiskFacts) -> RiskExplanation:
    summary = (
        f"This portfolio looks {facts.risk_band.value} (risk score "
        f"{facts.risk_score:g}/100). Its top 3 holdings make up "
        f"{facts.concentration_pct_top3:g}% of the total, and {facts.largest_sector} "
        f"is the largest sector at {facts.largest_sector_pct:g}%. Estimated annualized "
        f"volatility is {facts.volatility_annualized_pct:g}%."
    )
    top_risks = [
        f"Concentration: top 3 holdings are {facts.concentration_pct_top3:g}% of the portfolio.",
        f"Sector tilt: {facts.largest_sector} is {facts.largest_sector_pct:g}% of holdings.",
        f"Volatility: estimated {facts.volatility_annualized_pct:g}% annualized.",
        f"Worst historical decline in the sample: {facts.max_drawdown_pct:g}%.",
    ]
    checklist = [
        "Are you comfortable with this level of concentration in your top holdings?",
        f"Is {facts.largest_sector_pct:g}% in one sector intentional for your goals?",
        "Does this volatility match your time horizon and risk tolerance?",
    ]
    return RiskExplanation(
        summary=summary,
        top_risk_factors=top_risks,
        review_checklist=checklist,
        source=ExplanationSource.template_fallback,
    )
