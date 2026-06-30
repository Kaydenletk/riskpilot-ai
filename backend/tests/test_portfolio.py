"""compute_report scores arbitrary holdings over the known universe."""
from __future__ import annotations

import pytest

from riskpilot.risk_engine.portfolio import UnknownHolding, compute_report


def test_known_tickers_produce_facts() -> None:
    holdings, facts = compute_report({"NVDA": 40, "KO": 30, "JNJ": 8})
    assert {h.ticker for h in holdings} == {"NVDA", "KO", "JNJ"}
    assert 0 <= facts.risk_score <= 100
    assert facts.holdings_count == 3
    assert facts.volatility_annualized_pct >= 0
    assert facts.max_drawdown_pct <= 0
    # market_value is computed from the dataset, not passed in
    assert all(h.market_value > 0 for h in holdings)


def test_unknown_ticker_raises_with_symbols() -> None:
    with pytest.raises(UnknownHolding) as ei:
        compute_report({"NVDA": 10, "DOGE": 5, "FAKE": 1})
    assert set(ei.value.symbols) == {"DOGE", "FAKE"}


def test_empty_holdings_rejected() -> None:
    with pytest.raises(ValueError):
        compute_report({})


def test_single_holding_is_maximally_concentrated() -> None:
    _, facts = compute_report({"NVDA": 10})
    assert facts.concentration_pct_top3 == 100.0
