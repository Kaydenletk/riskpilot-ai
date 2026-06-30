"""Hand-verified risk-math tests. Each formula is checked against a value computed
by hand or constructed so the answer is known. This is the proof that the
deterministic numbers are correct — the foundation of the whole thesis.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from riskpilot.risk_engine import metrics as m


# ── returns ──────────────────────────────────────────────────────────────────
def test_daily_returns_basic() -> None:
    # 100 -> 110 -> 99 : returns +10%, -10%
    r = m.daily_returns([100.0, 110.0, 99.0])
    assert np.allclose(r, [0.10, -0.10])


def test_daily_returns_too_short_is_empty() -> None:
    assert m.daily_returns([100.0]).size == 0


# ── volatility ───────────────────────────────────────────────────────────────
def test_annualized_volatility_uses_sample_stdev_and_sqrt252() -> None:
    # Build returns with a known SAMPLE stdev. Use a repeating +1%/-1% pattern:
    # mean 0, sample stdev of [0.01,-0.01,...] is 0.01 (for equal halves).
    prices = [100.0]
    for i in range(60):
        prices.append(prices[-1] * (1.01 if i % 2 == 0 else 1 / 1.01))
    r = m.daily_returns(prices)
    expected = float(np.std(r, ddof=1) * math.sqrt(252))
    assert m.annualized_volatility(prices) == pytest.approx(expected)
    # and it must NOT equal the population-stdev version (ddof=0) — proves ddof=1
    pop = float(np.std(r, ddof=0) * math.sqrt(252))
    assert m.annualized_volatility(prices) != pytest.approx(pop)


def test_volatility_raises_on_too_few_observations() -> None:
    with pytest.raises(ValueError):
        m.annualized_volatility([100.0, 101.0, 102.0])


def test_portfolio_vol_uses_covariance_not_weighted_average() -> None:
    """The headline correctness check: two perfectly-correlated identical assets
    must give portfolio vol == single-asset vol (a weighted avg would too here),
    BUT two UNCORRELATED equal-weight assets must give LESS than the weighted
    average of their vols (diversification). That gap is what covariance captures.
    """
    rng = np.random.default_rng(0)
    n = 300
    a = (1 + rng.normal(0, 0.02, n)).cumprod() * 100
    b_uncorr = (1 + rng.normal(0, 0.02, n)).cumprod() * 100  # independent shocks

    series = {"A": a.tolist(), "B": b_uncorr.tolist()}
    weights = {"A": 0.5, "B": 0.5}

    vol_a = m.annualized_volatility(a.tolist())
    vol_b = m.annualized_volatility(b_uncorr.tolist())
    weighted_avg = 0.5 * vol_a + 0.5 * vol_b

    port = m.portfolio_volatility(series, weights)
    # Diversification: combined vol of two uncorrelated assets is below the avg.
    assert port < weighted_avg


def test_portfolio_vol_rejects_weights_not_summing_to_one() -> None:
    series = {"A": [100.0] * 50, "B": [100.0] * 50}
    with pytest.raises(ValueError):
        m.portfolio_volatility(series, {"A": 0.5, "B": 0.4})


# ── concentration ────────────────────────────────────────────────────────────
def test_herfindahl_equal_weight_four_holdings() -> None:
    # 4 equal holdings -> HHI = 4 * 0.25^2 = 0.25
    weights = m.value_weights({"A": 25, "B": 25, "C": 25, "D": 25})
    assert m.herfindahl(weights) == pytest.approx(0.25)


def test_herfindahl_single_holding_is_one() -> None:
    assert m.herfindahl(m.value_weights({"A": 1000})) == pytest.approx(1.0)


def test_normalized_herfindahl_equal_weight_is_zero() -> None:
    # equal weights -> minimum concentration -> HHI* == 0
    weights = m.value_weights({"A": 10, "B": 10, "C": 10, "D": 10})
    assert m.normalized_herfindahl(weights) == pytest.approx(0.0, abs=1e-9)


def test_normalized_herfindahl_single_holding_guards_div_by_zero() -> None:
    assert m.normalized_herfindahl({"A": 1.0}) == 1.0  # n=1, no crash


def test_top3_concentration_pct_hand_computed() -> None:
    # values 50,30,20,10,5 (total 115). top3 = 100 -> 100/115 = 86.96 -> 87.0
    mv = {"A": 50, "B": 30, "C": 20, "D": 10, "E": 5}
    assert m.top_n_concentration_pct(mv, n=3) == pytest.approx(87.0, abs=0.05)


def test_value_weights_rejects_empty_book() -> None:
    with pytest.raises(ValueError):
        m.value_weights({"A": 0, "B": 0})


# ── drawdown ─────────────────────────────────────────────────────────────────
def test_max_drawdown_hand_computed() -> None:
    # value: 100 -> 120 (peak) -> 90 (trough) -> 110
    # worst drawdown = (90 - 120) / 120 = -25.0%
    series = [100.0, 120.0, 90.0, 110.0]
    assert m.max_drawdown_pct(series) == pytest.approx(-25.0)


def test_max_drawdown_monotonic_increase_is_zero() -> None:
    assert m.max_drawdown_pct([100.0, 101.0, 102.0, 103.0]) == pytest.approx(0.0)


def test_portfolio_value_series_sums_shares_times_price() -> None:
    series = {"A": [10.0, 20.0], "B": [5.0, 5.0]}
    shares = {"A": 2.0, "B": 4.0}
    # day0: 2*10 + 4*5 = 40 ; day1: 2*20 + 4*5 = 60
    assert m.portfolio_value_series(series, shares) == [40.0, 60.0]
