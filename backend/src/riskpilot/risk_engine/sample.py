"""Sample portfolio -> REAL computed facts (M2).

The holdings (shares) are fixed; everything else is computed from the committed
price dataset by the metrics + score modules. No number here is hand-set anymore.
The portfolio is deliberately tech-concentrated so the risk story is legible.
"""

from __future__ import annotations

from ..schema import Holding, RiskBand, RiskFacts
from . import metrics as m
from . import score as sc
from .dataset import load_prices, sector_of

# Fixed share counts. Market value is derived from the latest price (computed).
_SHARES: dict[str, float] = {
    "NVDA": 40,
    "AMD": 60,
    "MSFT": 10,
    "KO": 30,
    "JNJ": 8,
}


def _latest_prices(series: dict[str, list[float]]) -> dict[str, float]:
    return {t: series[t][-1] for t in _SHARES}


def _market_values(series: dict[str, list[float]]) -> dict[str, float]:
    latest = _latest_prices(series)
    return {t: _SHARES[t] * latest[t] for t in _SHARES}


def compute_sample_report() -> tuple[list[Holding], RiskFacts]:
    series = load_prices()
    market_values = _market_values(series)

    holdings = [
        Holding(
            ticker=t,
            shares=_SHARES[t],
            sector=sector_of(t),
            market_value=round(market_values[t], 2),
        )
        for t in _SHARES
    ]

    weights = m.value_weights(market_values)

    # --- deterministic metrics ---
    concentration_top3 = m.top_n_concentration_pct(market_values, n=3)
    portfolio_vol = m.portfolio_volatility(series, weights)
    value_series = m.portfolio_value_series(series, _SHARES)
    max_dd = m.max_drawdown_pct(value_series)

    # Score uses the top-3 share as the concentration signal (matches the UI number).
    risk_score = sc.composite_risk_score(portfolio_vol, concentration_top3, max_dd)
    band = sc.band_for_score(risk_score)

    # largest sector by value
    sector_totals: dict[str, float] = {}
    for t in _SHARES:
        sector_totals[sector_of(t)] = sector_totals.get(sector_of(t), 0.0) + market_values[t]
    total = sum(market_values.values())
    largest_sector, largest_val = max(sector_totals.items(), key=lambda kv: kv[1])

    facts = RiskFacts(
        risk_score=risk_score,
        risk_band=RiskBand(band),
        concentration_pct_top3=concentration_top3,
        volatility_annualized_pct=round(portfolio_vol * 100.0, 1),
        max_drawdown_pct=max_dd,
        largest_sector=largest_sector,
        largest_sector_pct=round(100.0 * largest_val / total, 1),
        holdings_count=len(_SHARES),
    )
    return holdings, facts


def max_drawdown_pct() -> float:
    """Exposed for the report's drawdown line (historical max drawdown)."""
    series = load_prices()
    return m.max_drawdown_pct(m.portfolio_value_series(series, _SHARES))
