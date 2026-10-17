"""Deterministic template explainer.

Used (a) in DEMO_MODE when there's no key, and (b) as the fail-closed fallback
when the live LLM hallucinates a number twice. Because it's built FROM the facts,
it is grounded by construction — it can never invent a number. Checklist items
are phrased as questions, never buy/sell imperatives (compliance).
"""

from __future__ import annotations

from ..schema import ExplanationSource, FitBand, GoalFit, PortfolioGoal, RiskExplanation, RiskFacts

_GOAL_LABELS_SHORT = {
    PortfolioGoal.growth: "growth",
    PortfolioGoal.balanced: "balanced",
    PortfolioGoal.income: "income",
}

_FIT_PHRASES = {
    FitBand.aligned: "lines up well with",
    FitBand.partial: "only partly matches",
    FitBand.misaligned: "does not currently match",
}


def _goal_summary_sentence(goal_fit: GoalFit) -> str:
    sentence = (
        f" Measured against your stated {_GOAL_LABELS_SHORT[goal_fit.goal]} goal, the mix "
        f"{_FIT_PHRASES[goal_fit.fit_band]} it (goal-fit {goal_fit.fit_score:g}/100): "
        f"{goal_fit.income_orientation_pct:g}% of the book sits in income-oriented "
        f"sectors and {goal_fit.growth_orientation_pct:g}% in growth-oriented ones."
    )
    if goal_fit.goal == PortfolioGoal.income and goal_fit.sector_suggestions:
        sectors = ", ".join(s.sector for s in goal_fit.sector_suggestions)
        sentence += (
            f" Income portfolios typically draw on sectors like {sectors} — worth "
            "understanding as you review the mix."
        )
    return sentence


def build_template_explanation(
    facts: RiskFacts, goal_fit: GoalFit | None = None
) -> RiskExplanation:
    summary = (
        f"This portfolio looks {facts.risk_band.value} (risk score "
        f"{facts.risk_score:g}/100). Its top 3 holdings make up "
        f"{facts.concentration_pct_top3:g}% of the total, and {facts.largest_sector} "
        f"is the largest sector at {facts.largest_sector_pct:g}%. Estimated annualized "
        f"volatility is {facts.volatility_annualized_pct:g}%."
    )
    if goal_fit is not None:
        summary += _goal_summary_sentence(goal_fit)
    top_risks = [
        f"Concentration: top 3 holdings are {facts.concentration_pct_top3:g}% of the portfolio.",
        f"Sector tilt: {facts.largest_sector} is {facts.largest_sector_pct:g}% of holdings.",
        f"Volatility: estimated {facts.volatility_annualized_pct:g}% annualized.",
        f"Worst historical decline in the sample: {facts.max_drawdown_pct:g}%.",
    ]
    if goal_fit is not None and goal_fit.fit_band != FitBand.aligned:
        top_risks.append(
            f"Goal mismatch: only {goal_fit.fit_score:g}/100 fit with your stated "
            f"{_GOAL_LABELS_SHORT[goal_fit.goal]} goal."
        )
    checklist = [
        "Are you comfortable with this level of concentration in your top holdings?",
        f"Is {facts.largest_sector_pct:g}% in one sector intentional for your goals?",
        "Does this volatility match your time horizon and risk tolerance?",
    ]
    if goal_fit is not None:
        checklist.append(
            f"Does {goal_fit.income_orientation_pct:g}% in income-oriented sectors "
            f"feel right for a {_GOAL_LABELS_SHORT[goal_fit.goal]} portfolio?"
        )
    return RiskExplanation(
        summary=summary,
        top_risk_factors=top_risks,
        review_checklist=checklist,
        source=ExplanationSource.template_fallback,
    )
