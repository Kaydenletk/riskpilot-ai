"""Weight-based entry point: the /analyze builder sends weights, the engine
converts to synthetic shares so ALL math stays on the battle-tested shares path."""
from __future__ import annotations

import pytest

from riskpilot.risk_engine.portfolio import (
    MAX_WEIGHTED_HOLDINGS,
    UnknownHolding,
    compute_report_from_weights,
)


def test_weights_produce_matching_concentration():
    holdings, facts = compute_report_from_weights(
        {"NVDA": 40.0, "AAPL": 25.0, "KO": 20.0, "JNJ": 15.0}
    )
    assert facts.concentration_pct_top3 == pytest.approx(85.0, abs=0.1)


def test_weights_must_sum_to_100():
    with pytest.raises(ValueError, match="sum to 100"):
        compute_report_from_weights({"NVDA": 50.0, "AAPL": 40.0})


def test_single_holding_rejected():
    with pytest.raises(ValueError, match="2"):
        compute_report_from_weights({"NVDA": 100.0})


def test_too_many_holdings_rejected():
    weights = {f"T{i}": 100.0 / (MAX_WEIGHTED_HOLDINGS + 1) for i in range(MAX_WEIGHTED_HOLDINGS + 1)}
    with pytest.raises(ValueError, match=str(MAX_WEIGHTED_HOLDINGS)):
        compute_report_from_weights(weights)


def test_negative_weight_rejected():
    with pytest.raises(ValueError, match="positive"):
        compute_report_from_weights({"NVDA": 105.0, "KO": -5.0})


def test_unknown_ticker_raises_unknown_holding():
    with pytest.raises(UnknownHolding):
        compute_report_from_weights({"ZZZZ": 50.0, "KO": 50.0})


def test_lowercase_and_whitespace_normalized():
    holdings, facts = compute_report_from_weights({" nvda ": 60.0, "ko": 40.0})
    assert {h.ticker for h in holdings} == {"NVDA", "KO"}
