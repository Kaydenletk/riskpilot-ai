"""Universe integrity: the committed dataset must be complete and reproducible,
and the ORIGINAL 12 assets' series must be frozen (sample report + committed
frontend fixtures depend on them)."""

from __future__ import annotations

import numpy as np

from riskpilot.risk_engine.dataset import TRADING_DAYS, generate_prices, load_prices
from riskpilot.risk_engine.universe import ASSETS, sector_block_correlation

# first/last closes captured from the pre-expansion committed prices.csv
# (11-ticker + SPY universe). These are the contract: expanding the universe
# must never move them.
FROZEN = {
    "NVDA": (120.0000, 256.3515),
    "KO": (50.0000, 42.3994),
    "SPY": (450.0000, 468.6898),
    "JNJ": (160.0000, 145.4590),
}

# each series is start price (day 0) + TRADING_DAYS simulated closes
SERIES_LEN = TRADING_DAYS + 1


def test_universe_size_and_sectors() -> None:
    tickers = [t for t in ASSETS if t != "SPY"]
    assert len(tickers) >= 96
    assert len({spec.sector for spec in ASSETS.values()}) >= 8


def test_original_assets_frozen() -> None:
    series = load_prices()
    for ticker, (first, last) in FROZEN.items():
        assert abs(series[ticker][0] - first) < 1e-6, ticker
        assert abs(series[ticker][-1] - last) < 1e-6, ticker


def test_every_asset_has_full_finite_history() -> None:
    series = load_prices()
    for ticker in ASSETS:
        prices = np.asarray(series[ticker])
        assert prices.shape == (SERIES_LEN,), ticker
        assert np.all(np.isfinite(prices)), ticker
        assert np.all(prices > 0), ticker


def test_block_correlation_is_valid() -> None:
    corr = sector_block_correlation()
    n = corr.shape[0]
    assert corr.shape == (n, n)
    assert np.allclose(np.diag(corr), 1.0)
    assert np.allclose(corr, corr.T)
    assert np.linalg.eigvalsh(corr).min() > -1e-8


def test_regeneration_is_deterministic() -> None:
    a = generate_prices()
    b = generate_prices()
    assert a.keys() == b.keys()
    for t in a:
        assert np.allclose(a[t], b[t]), t
