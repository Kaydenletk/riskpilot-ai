"""Deterministic risk formulas. Pure functions, hand-verifiable, fully tested.

Each function handles the trap the eng review flagged:
  - volatility: SAMPLE stdev (ddof=1), annualized x sqrt(252); PORTFOLIO vol uses
    the covariance matrix (correlation matters), not a weighted average.
  - concentration: value-weighted HHI; n=1 guarded.
  - max drawdown: on the cumulative portfolio VALUE series, not on returns.

No LLM imports (enforced by tests/test_no_llm_in_engine.py).
"""

from __future__ import annotations

import numpy as np

TRADING_DAYS_PER_YEAR = 252
MIN_OBSERVATIONS = 30  # below this, stdev/vol are noise -> caller should warn


def daily_returns(prices: list[float]) -> np.ndarray:
    """Simple daily returns from a price series. len(returns) == len(prices) - 1."""
    p = np.asarray(prices, dtype=float)
    if p.size < 2:
        return np.array([])
    return p[1:] / p[:-1] - 1.0


def annualized_volatility(prices: list[float]) -> float:
    """Single-asset annualized volatility: sample stdev (ddof=1) x sqrt(252)."""
    r = daily_returns(prices)
    if r.size < MIN_OBSERVATIONS:
        raise ValueError(f"need >= {MIN_OBSERVATIONS} returns, got {r.size}")
    # ddof=1 = SAMPLE stdev. np.std default ddof=0 (population) would be wrong.
    return float(np.std(r, ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))


def portfolio_volatility(
    series_by_ticker: dict[str, list[float]],
    weights: dict[str, float],
) -> float:
    """Annualized PORTFOLIO volatility via the covariance matrix: sqrt(wT Σ w).

    This is the formula that captures correlation. A weighted average of the
    holdings' individual vols would ignore it and under-report risk.
    """
    tickers = list(weights.keys())
    w = np.array([weights[t] for t in tickers], dtype=float)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError(f"weights must sum to 1.0, got {w.sum():.4f}")

    # Build the returns matrix (T x N), inner-joined on the shortest series length.
    returns = [daily_returns(series_by_ticker[t]) for t in tickers]
    min_len = min(r.size for r in returns)
    if min_len < MIN_OBSERVATIONS:
        raise ValueError(f"need >= {MIN_OBSERVATIONS} aligned returns, got {min_len}")
    matrix = np.column_stack([r[-min_len:] for r in returns])

    # Daily covariance (ddof=1), then annualize the variance by x252.
    cov_daily = np.cov(matrix, rowvar=False, ddof=1)
    daily_var = float(w @ cov_daily @ w)
    annual_var = daily_var * TRADING_DAYS_PER_YEAR
    return float(np.sqrt(max(annual_var, 0.0)))


def value_weights(market_values: dict[str, float]) -> dict[str, float]:
    """Normalize market values to weights summing to 1. Rejects an empty/zero book."""
    total = sum(market_values.values())
    if total <= 0:
        raise ValueError("portfolio has no positive market value")
    return {t: v / total for t, v in market_values.items()}


def herfindahl(weights: dict[str, float]) -> float:
    """HHI = sum(w_i^2) on VALUE weights. 1/n (equal) -> 1.0 (single holding)."""
    w = np.array(list(weights.values()), dtype=float)
    return float(np.sum(w**2))


def normalized_herfindahl(weights: dict[str, float]) -> float:
    """HHI* in [0,1], adjusting for n so 1-holding and 100-holding 'concentrated'
    aren't conflated. n=1 is guarded (returns 1.0 — maximally concentrated)."""
    n = len(weights)
    if n <= 1:
        return 1.0
    hhi = herfindahl(weights)
    return (hhi - 1.0 / n) / (1.0 - 1.0 / n)


def top_n_concentration_pct(market_values: dict[str, float], n: int = 3) -> float:
    """Share (%) of the portfolio held in its n largest positions by value."""
    total = sum(market_values.values())
    if total <= 0:
        raise ValueError("portfolio has no positive market value")
    top = sorted(market_values.values(), reverse=True)[:n]
    return round(100.0 * sum(top) / total, 1)


def max_drawdown_pct(portfolio_value_series: list[float]) -> float:
    """Historical max drawdown (%) = worst peak-to-trough decline of the cumulative
    portfolio VALUE series. Always <= 0. Computed on value, not returns."""
    v = np.asarray(portfolio_value_series, dtype=float)
    if v.size == 0:
        return 0.0
    running_max = np.maximum.accumulate(v)
    drawdowns = (v - running_max) / running_max
    return round(float(drawdowns.min()) * 100.0, 1)


def portfolio_value_series(
    series_by_ticker: dict[str, list[float]],
    shares: dict[str, float],
) -> list[float]:
    """Total portfolio value over time = sum_i shares_i * price_i(t).
    Inner-joins on the shortest series so ragged inputs don't misalign."""
    tickers = list(shares.keys())
    min_len = min(len(series_by_ticker[t]) for t in tickers)
    values = np.zeros(min_len)
    for t in tickers:
        prices = np.asarray(series_by_ticker[t][-min_len:], dtype=float)
        values += shares[t] * prices
    return values.tolist()


def beta(asset_prices: list[float], market_prices: list[float]) -> float:
    """Beta = Cov(asset_returns, market_returns) / Var(market_returns).

    Traps the eng review flagged: must use RETURNS not price levels, and must
    align the two series (inner-join by trimming to the shorter length) so the
    covariance isn't computed across mismatched dates.
    """
    a = daily_returns(asset_prices)
    m = daily_returns(market_prices)
    n = min(a.size, m.size)
    if n < MIN_OBSERVATIONS:
        raise ValueError(f"need >= {MIN_OBSERVATIONS} aligned returns for beta, got {n}")
    a, m = a[-n:], m[-n:]
    market_var = float(np.var(m, ddof=1))
    if market_var == 0:
        raise ValueError("market variance is zero; beta undefined")
    cov = float(np.cov(a, m, ddof=1)[0, 1])
    return round(cov / market_var, 2)
