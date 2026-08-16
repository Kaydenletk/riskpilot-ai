"""Sector context: a single ticker's risk numbers are meaningless without a
benchmark. The engine computes sector medians, a universe percentile, and
nearest-volatility peers — all deterministic, all from the committed dataset."""
import pytest

from riskpilot.risk_engine.ticker import UnknownTicker, sector_context


def test_context_fields_for_nvda():
    ctx = sector_context("NVDA")
    assert ctx.sector == "Technology"
    assert ctx.sector_median_volatility_pct > 0
    assert ctx.sector_median_beta > 0
    assert 0 <= ctx.universe_volatility_percentile <= 100
    assert 1 <= len(ctx.peers) <= 4
    assert "NVDA" not in ctx.peers


def test_peers_share_the_sector():
    from riskpilot.risk_engine.dataset import sector_of

    ctx = sector_context("KO")
    for peer in ctx.peers:
        assert sector_of(peer) == "Consumer Staples"


def test_high_vol_name_ranks_high():
    # TSLA carries the universe's top-band volatility spec — its percentile
    # must land in the upper quarter.
    ctx = sector_context("TSLA")
    assert ctx.universe_volatility_percentile >= 75


def test_deterministic():
    assert sector_context("NVDA") == sector_context("NVDA")


def test_unknown_ticker_rejected():
    with pytest.raises(UnknownTicker):
        sector_context("ZZZZ")
