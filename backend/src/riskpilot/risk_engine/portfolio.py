"""Score an ARBITRARY portfolio (user upload) over the known price universe.

Mirrors sample.compute_sample_report but takes a {ticker: shares} dict. Only
tickers present in the committed dataset can be scored — anything else has no
price history, so it's rejected (the same allow-list boundary as single-ticker
analysis). market_value is COMPUTED from the dataset's latest price; the upload's
own market_value/sector are not trusted here.
"""
from __future__ import annotations

from ..schema import Holding, RiskBand, RiskFacts
from . import metrics as m
from . import score as sc
from .dataset import load_prices, sector_of
from .ticker import MARKET_INDEX, available_tickers

MIN_HOLDINGS = 1


class UnknownHolding(ValueError):
    """One or more requested tickers are not in the priced universe."""

    def __init__(self, symbols: list[str]) -> None:
        self.symbols = symbols
        super().__init__(f"not in the universe: {', '.join(symbols)}")


def _allow_set() -> set[str]:
    return {o.ticker for o in available_tickers()}  # excludes SPY (the index)


def _portfolio_vol(series: dict[str, list[float]], weights: dict[str, float]) -> float:
    """Compute portfolio volatility, handling the single-holding edge case.

    np.cov with one column returns a scalar (0-d), not a 2D matrix, which
    causes the w @ cov @ w matmul to fail. For a single holding the portfolio
    vol is simply its own annualized vol.
    """
    if len(weights) == 1:
        (ticker,) = weights
        return m.annualized_volatility(series[ticker])
    return m.portfolio_volatility(series, weights)


def compute_report(shares: dict[str, float]) -> tuple[list[Holding], RiskFacts]:
    if not shares:
        raise ValueError("portfolio has no holdings")

    normalized = {t.strip().upper(): float(s) for t, s in shares.items()}
    allow = _allow_set()
    unknown = sorted(t for t in normalized if t not in allow)
    if unknown:
        raise UnknownHolding(unknown)
    if any(s <= 0 for s in normalized.values()):
        raise ValueError("every holding needs positive shares")

    series = load_prices()
    latest = {t: series[t][-1] for t in normalized}
    market_values = {t: normalized[t] * latest[t] for t in normalized}

    holdings = [
        Holding(
            ticker=t,
            shares=normalized[t],
            sector=sector_of(t),
            market_value=round(market_values[t], 2),
        )
        for t in normalized
    ]

    weights = m.value_weights(market_values)
    concentration_top3 = m.top_n_concentration_pct(market_values, n=3)
    portfolio_vol = _portfolio_vol(series, weights)
    value_series = m.portfolio_value_series(series, normalized)
    max_dd = m.max_drawdown_pct(value_series)

    risk_score = sc.composite_risk_score(portfolio_vol, concentration_top3, max_dd)
    band = sc.band_for_score(risk_score)

    sector_totals: dict[str, float] = {}
    for t in normalized:
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
        holdings_count=len(normalized),
    )
    return holdings, facts
