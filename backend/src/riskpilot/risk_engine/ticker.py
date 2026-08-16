"""Single-ticker risk analysis over the demo universe.

Scope A (per docs/UI_RESEARCH_AND_ROADMAP.md): search is bounded to the tickers in
the committed dataset. `available_tickers()` is the allow-list, and `analyze_ticker`
rejects anything not in it — which is ALSO the prompt-injection defense the eng
review flagged (a "ticker" of 'ignore previous instructions' never reaches the model).
"""

from __future__ import annotations

from functools import lru_cache
from statistics import median

from ..schema import RiskBand, SectorContext, TickerFacts, TickerOption
from . import metrics as m
from . import score as sc
from .dataset import load_prices, sector_of

MARKET_INDEX = "SPY"
SPARK_POINTS = 48  # downsample the price series for a compact sparkline
MAX_PEERS = 4


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


@lru_cache(maxsize=1)
def _universe_stats() -> dict[str, tuple[float, float]]:
    """ticker -> (annualized vol, beta) across the whole allow-list. Cached:
    the committed dataset is immutable within a process."""
    series = load_prices()
    market = series[MARKET_INDEX]
    return {
        t: (m.annualized_volatility(series[t]), m.beta(series[t], market))
        for t in series
        if t != MARKET_INDEX
    }


def sector_context(ticker: str) -> SectorContext:
    """Relative framing: sector medians, universe percentile, nearest-vol peers.
    Same allow-list boundary as analyze_ticker."""
    symbol = ticker.strip().upper()
    stats = _universe_stats()
    if symbol not in stats:
        raise UnknownTicker(symbol)

    vol, _ = stats[symbol]
    sector = sector_of(symbol)
    sector_stats = {t: s for t, s in stats.items() if sector_of(t) == sector}

    less_volatile = sum(1 for t, (v, _) in stats.items() if t != symbol and v < vol)
    percentile = round(100 * less_volatile / (len(stats) - 1)) if len(stats) > 1 else 0

    peers = sorted(
        (t for t in sector_stats if t != symbol),
        key=lambda t: abs(sector_stats[t][0] - vol),
    )[:MAX_PEERS]

    return SectorContext(
        sector=sector,
        sector_median_volatility_pct=round(median(v for v, _ in sector_stats.values()) * 100, 1),
        sector_median_beta=round(median(b for _, b in sector_stats.values()), 2),
        universe_volatility_percentile=percentile,
        peers=peers,
    )
