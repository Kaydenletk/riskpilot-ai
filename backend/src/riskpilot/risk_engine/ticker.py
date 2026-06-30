"""Single-ticker risk analysis over the demo universe.

Scope A (per docs/UI_RESEARCH_AND_ROADMAP.md): search is bounded to the tickers in
the committed dataset. `available_tickers()` is the allow-list, and `analyze_ticker`
rejects anything not in it — which is ALSO the prompt-injection defense the eng
review flagged (a "ticker" of 'ignore previous instructions' never reaches the model).
"""

from __future__ import annotations

from ..schema import RiskBand, TickerFacts, TickerOption
from . import metrics as m
from . import score as sc
from .dataset import load_prices, sector_of

MARKET_INDEX = "SPY"
SPARK_POINTS = 48  # downsample the price series for a compact sparkline


class UnknownTicker(ValueError):
    """Requested ticker is not in the demo universe (also the injection guard)."""


def available_tickers() -> list[TickerOption]:
    """The allow-list: every searchable instrument except the market index."""
    series = load_prices()
    return [
        TickerOption(ticker=t, sector=sector_of(t))
        for t in series
        if t != MARKET_INDEX
    ]


def _allow_set() -> set[str]:
    return {o.ticker for o in available_tickers()}


def _downsample(prices: list[float], points: int) -> list[float]:
    if len(prices) <= points:
        return [round(p, 2) for p in prices]
    step = len(prices) / points
    return [round(prices[int(i * step)], 2) for i in range(points)]


def analyze_ticker(ticker: str) -> tuple[TickerFacts, list[float]]:
    """Compute single-ticker risk facts + a sparkline. Raises UnknownTicker if the
    symbol isn't in the demo universe (the injection/allow-list boundary)."""
    symbol = ticker.strip().upper()
    if symbol not in _allow_set():
        raise UnknownTicker(symbol)

    series = load_prices()
    prices = series[symbol]
    market = series[MARKET_INDEX]

    vol = m.annualized_volatility(prices)
    max_dd = m.max_drawdown_pct(prices)
    b = m.beta(prices, market)
    score = sc.ticker_risk_score(vol, max_dd, b)

    facts = TickerFacts(
        risk_score=score,
        risk_band=RiskBand(sc.band_for_score(score)),
        volatility_annualized_pct=round(vol * 100.0, 1),
        max_drawdown_pct=max_dd,
        beta=b,
        sector=sector_of(symbol),
    )
    return facts, _downsample(prices, SPARK_POINTS)
