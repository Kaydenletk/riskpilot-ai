"""Deterministic portfolio-goal alignment over the committed universe.

Same contract as the rest of risk_engine: pure math, ZERO LLM imports. Every
number leaves this module rounded to 1 decimal so the guardrail whitelist
matches exactly what the UI renders.

The universe is synthetic and carries no dividend data, so income orientation
is a SECTOR-LEVEL heuristic: each sector gets an `income_factor` (0 = pure
growth profile, 1 = pure income profile) and an illustrative `yield_proxy_pct`
(rough typical dividend yield for the sector — labelled as a proxy everywhere
it surfaces, never presented as a real yield).
"""

from __future__ import annotations

from typing import NamedTuple

from ..schema import FitBand, GoalFit, PortfolioGoal, SectorSuggestion
from .ticker import available_tickers


class SectorProfile(NamedTuple):
    income_factor: float  # 0..1 — how income-oriented the sector typically is
    yield_proxy_pct: float  # illustrative typical yield, NOT market data


SECTOR_PROFILES: dict[str, SectorProfile] = {
    "Technology": SectorProfile(0.10, 0.7),
    "Communication Services": SectorProfile(0.25, 1.1),
    "Consumer Discretionary": SectorProfile(0.15, 0.9),
    "Industrials": SectorProfile(0.45, 1.6),
    "Materials": SectorProfile(0.50, 1.9),
    "Healthcare": SectorProfile(0.50, 1.7),
    "Financials": SectorProfile(0.60, 2.2),
    "Consumer Staples": SectorProfile(0.80, 2.6),
    "Energy": SectorProfile(0.85, 3.3),
    "Real Estate": SectorProfile(0.95, 3.8),
    "Utilities": SectorProfile(1.00, 3.4),
}

# A sector "serves" the income goal from this factor up, and the growth goal
# from (1 - this) down. Suggestions draw only from serving sectors.
_INCOME_SECTOR_FACTOR = 0.6
_GROWTH_SECTOR_FACTOR = 0.4

_ALIGNED_AT = 60.0
_PARTIAL_AT = 40.0

_MAX_SUGGESTIONS = 4
_MAX_EXAMPLE_TICKERS = 3


def _band_for(fit_score: float) -> FitBand:
    if fit_score >= _ALIGNED_AT:
        return FitBand.aligned
    if fit_score >= _PARTIAL_AT:
        return FitBand.partial
    return FitBand.misaligned


def _sector_weights(
    weights_pct: dict[str, float], sector_of: dict[str, str]
) -> dict[str, float]:
    """Portfolio weight per sector, normalized to a 100% book."""
    total = sum(weights_pct.values())
    out: dict[str, float] = {}
    for ticker, weight in weights_pct.items():
        sector = sector_of[ticker.strip().upper()]
        out[sector] = out.get(sector, 0.0) + 100.0 * weight / total
    return out


def _suggestions_for(
    goal: PortfolioGoal,
    sector_weights: dict[str, float],
    held: set[str],
    sector_of: dict[str, str],
) -> list[SectorSuggestion]:
    """Sectors that typically serve the goal, most goal-serving first —
    educational context with demo-universe examples, never a buy list."""
    if goal == PortfolioGoal.income:
        serving = [
            (s, p) for s, p in SECTOR_PROFILES.items() if p.income_factor >= _INCOME_SECTOR_FACTOR
        ]
        serving.sort(key=lambda sp: sp[1].yield_proxy_pct, reverse=True)
    elif goal == PortfolioGoal.growth:
        serving = [
            (s, p) for s, p in SECTOR_PROFILES.items() if p.income_factor <= _GROWTH_SECTOR_FACTOR
        ]
        serving.sort(key=lambda sp: sp[1].income_factor)
    else:
        return []

    examples_by_sector: dict[str, list[str]] = {}
    for ticker, sector in sector_of.items():
        if ticker in held:
            continue
        examples_by_sector.setdefault(sector, []).append(ticker)

    # Walk the FULL serving list so a fully-held top sector frees its slot for
    # the next-ranked one — cap the output, not the candidates.
    suggestions: list[SectorSuggestion] = []
    for sector, profile in serving:
        examples = examples_by_sector.get(sector, [])[:_MAX_EXAMPLE_TICKERS]
        if not examples:
            continue
        suggestions.append(
            SectorSuggestion(
                sector=sector,
                current_pct=round(sector_weights.get(sector, 0.0), 1),
                typical_yield_pct=profile.yield_proxy_pct,
                example_tickers=examples,
            )
        )
        if len(suggestions) == _MAX_SUGGESTIONS:
            break
    return suggestions


def compute_goal_fit(weights_pct: dict[str, float], goal: PortfolioGoal) -> GoalFit:
    """Goal-alignment facts for a weighted portfolio. Callers validate universe
    membership first (compute_report* raise UnknownHolding before this runs);
    the guard here only keeps the module safe to call in isolation."""
    if not weights_pct or sum(weights_pct.values()) <= 0:
        raise ValueError("goal fit needs at least one positive weight")
    # One universe read serves both helpers (the dataset parse is not free).
    sector_of = {o.ticker: o.sector for o in available_tickers()}
    sector_weights = _sector_weights(weights_pct, sector_of)

    income_orientation = sum(
        w * SECTOR_PROFILES[s].income_factor for s, w in sector_weights.items()
    )
    growth_orientation = 100.0 - income_orientation
    yield_proxy = sum(
        w / 100.0 * SECTOR_PROFILES[s].yield_proxy_pct for s, w in sector_weights.items()
    )

    if goal == PortfolioGoal.income:
        fit_score = income_orientation
    elif goal == PortfolioGoal.growth:
        fit_score = growth_orientation
    else:
        fit_score = 100.0 - abs(income_orientation - growth_orientation)

    held = {t.strip().upper() for t in weights_pct}
    return GoalFit(
        goal=goal,
        income_orientation_pct=round(income_orientation, 1),
        growth_orientation_pct=round(growth_orientation, 1),
        fit_score=round(fit_score, 1),
        fit_band=_band_for(fit_score),
        income_yield_proxy_pct=round(yield_proxy, 1),
        sector_suggestions=_suggestions_for(goal, sector_weights, held, sector_of),
    )
