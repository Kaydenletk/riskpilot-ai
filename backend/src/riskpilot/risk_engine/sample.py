"""M1 sample portfolio + hand-built deterministic facts.

These numbers are illustrative and fixed for M1 so the stack runs end-to-end
with zero external data. In M2 these get computed from a committed historical
price dataset (adjusted closes -> returns -> the real formulas). The SHAPE is
already correct: facts come from here, never from the LLM.
"""

from __future__ import annotations

from ..schema import Holding, RiskBand, RiskFacts

# A deliberately concentrated sample so the risk story is legible in the demo.
_SAMPLE_HOLDINGS: list[Holding] = [
    Holding(ticker="NVDA", shares=40, sector="Technology", market_value=4800.0),
    Holding(ticker="AMD", shares=60, sector="Technology", market_value=3000.0),
    Holding(ticker="MSFT", shares=10, sector="Technology", market_value=2200.0),
    Holding(ticker="KO", shares=30, sector="Consumer Staples", market_value=1500.0),
    Holding(ticker="JNJ", shares=8, sector="Healthcare", market_value=1300.0),
]


def _portfolio_value(holdings: list[Holding]) -> float:
    return sum(h.market_value for h in holdings)


def compute_sample_facts() -> RiskFacts:
    """Deterministic. In M1 the numbers are hand-set; the derivations below are
    real (top-3 concentration, largest sector) so they already match the data."""
    total = _portfolio_value(_SAMPLE_HOLDINGS)
    top3 = sorted((h.market_value for h in _SAMPLE_HOLDINGS), reverse=True)[:3]
    concentration_top3 = round(100 * sum(top3) / total, 1)

    sector_totals: dict[str, float] = {}
    for h in _SAMPLE_HOLDINGS:
        sector_totals[h.sector] = sector_totals.get(h.sector, 0.0) + h.market_value
    largest_sector, largest_val = max(sector_totals.items(), key=lambda kv: kv[1])

    return RiskFacts(
        risk_score=78.0,                       # M2: composite of vol+HHI+beta
        risk_band=RiskBand.aggressive,
        concentration_pct_top3=concentration_top3,
        volatility_annualized_pct=31.5,        # M2: sample stdev x sqrt(252)
        largest_sector=largest_sector,
        largest_sector_pct=round(100 * largest_val / total, 1),
        holdings_count=len(_SAMPLE_HOLDINGS),
    )


def compute_sample_report() -> tuple[list[Holding], RiskFacts]:
    return list(_SAMPLE_HOLDINGS), compute_sample_facts()
