"""Risk-score tests. The score is a product judgment, so the contract we test is
its INVARIANTS: bounded 0-100, monotonic in each input, concentration-weighted.
"""

from __future__ import annotations

import pytest

from riskpilot.risk_engine import score as sc


def test_score_is_bounded_0_100() -> None:
    # concentration arg is a percent (0..100)
    assert sc.composite_risk_score(0.0, 0.0, 0.0) == 0.0
    assert sc.composite_risk_score(1.0, 100.0, -100.0) == 100.0


def test_score_monotonic_in_concentration() -> None:
    low = sc.composite_risk_score(0.25, 30.0, -10.0)
    high = sc.composite_risk_score(0.25, 90.0, -10.0)
    assert high > low


def test_score_monotonic_in_volatility() -> None:
    low = sc.composite_risk_score(0.15, 50.0, -10.0)
    high = sc.composite_risk_score(0.45, 50.0, -10.0)
    assert high > low


def test_score_monotonic_in_drawdown() -> None:
    shallow = sc.composite_risk_score(0.25, 50.0, -5.0)
    deep = sc.composite_risk_score(0.25, 50.0, -40.0)
    assert deep > shallow


def test_concentration_outweighs_volatility() -> None:
    """The editorial choice: concentration (0.50) beats volatility (0.35).
    Max concentration alone must score higher than max volatility alone."""
    conc_only = sc.composite_risk_score(0.10, 100.0, 0.0)  # vol floor, max concentration
    vol_only = sc.composite_risk_score(0.50, 0.0, 0.0)     # max vol, zero concentration
    assert conc_only > vol_only


def test_band_thresholds() -> None:
    assert sc.band_for_score(80) == "aggressive"
    assert sc.band_for_score(50) == "moderate"
    assert sc.band_for_score(10) == "conservative"


def test_signals_clamp() -> None:
    assert sc.volatility_signal(0.05) == 0.0   # below floor
    assert sc.volatility_signal(0.60) == 1.0   # above ceil
    assert sc.drawdown_signal(-80.0) == 1.0    # deeper than -50% saturates
    assert sc.concentration_signal(150.0) == 1.0  # >100% share clamps


def test_score_version_pinned() -> None:
    assert sc.SCORE_VERSION == "v1-concentration-led"
    assert pytest.approx(sc.W_CONCENTRATION + sc.W_VOLATILITY + sc.W_DRAWDOWN) == 1.0
