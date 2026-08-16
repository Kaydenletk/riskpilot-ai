"""Committed, reproducible price dataset (synthetic but realistic).

Honesty: these are NOT real market prices. They are seeded geometric-Brownian-
motion series with realistic per-ticker annual volatility/drift and a sector-
block correlation structure (see universe.py). The MATH downstream is real and
correct on this data — the formulas are the artifact, the data is a reproducible
stand-in. Labeled "synthetic illustrative" in the UI and DATA_SOURCE.md.

Two-stream generation (WHY, not just how):

- **Stream 1 (SEED):** the ORIGINAL 12 assets (11 tickers + SPY) are generated
  by the exact original algorithm — same rng seed, same draw order, same
  hand-tuned ORIGINAL_CORR matrix. This freezes their price paths bit-for-bit:
  the committed sample report and the frontend demo fixtures depend on those
  exact series, so expanding the universe must never move them.
- **Stream 2 (SEED + 1):** the ~97 NEW assets draw from an independent rng, so
  adding (or re-tuning) new names can never perturb stream 1. They are
  correlated among themselves via their sector-block matrix, and to the FROZEN
  stream-1 SPY path by conditioning: the block matrix is built for
  ["SPY", *new], Cholesky-factored with SPY first, and SPY's shock column is
  replaced by the STANDARDIZED daily log-returns of the stream-1 SPY series
  ((r - mean) / std). With SPY first, each new asset's first Cholesky loading
  equals its target SPY correlation, so new names track the same market path
  the originals do.

  Approximation note: realized correlations are approximate, not exact — the
  PSD projection nudges the block targets, and SPY's realized standardized
  returns are one sample path, not an ideal N(0,1) stream. That is fine for
  synthetic illustrative data; determinism and the frozen originals are the
  hard guarantees, target correlations are soft ones.

Reproducible: same seed -> same prices. The dataset is generated once and the
result lives in the repo; this module both generates it (run
`python -m riskpilot.risk_engine.dataset`) and is the documented source of
truth for how.
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

from .universe import (
    ASSETS,
    NEW_ASSETS,
    ORIGINAL_ASSETS,
    ORIGINAL_CORR,
    nearest_psd,
    sector_block_correlation,
)

SEED = 42
TRADING_DAYS = 504  # ~2 years of daily observations
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
PRICES_CSV = DATA_DIR / "prices.csv"

_DT = 1.0 / 252.0


def _gbm_paths(
    tickers: list[str],
    correlated_shocks: np.ndarray,
) -> np.ndarray:
    """GBM price paths from pre-correlated standard-normal daily shocks.

    Returns (TRADING_DAYS + 1, len(tickers)): start price on row 0, then the
    simulated closes. The arithmetic is kept identical in form to the original
    generator so stream 1 reproduces the committed series bit-for-bit.
    """
    drifts = np.array([ASSETS[t].drift for t in tickers])
    vols = np.array([ASSETS[t].vol for t in tickers])
    starts = np.array([ASSETS[t].start for t in tickers])

    # GBM daily log-return: (mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*shock
    daily_drift = (drifts - 0.5 * vols**2) * _DT
    daily_shock = vols * np.sqrt(_DT) * correlated_shocks
    log_returns = daily_drift + daily_shock

    log_price = np.log(starts) + np.cumsum(log_returns, axis=0)
    prices = np.exp(log_price)
    # prepend the start price as day 0
    return np.vstack([starts, prices])


def generate_prices() -> dict[str, list[float]]:
    """Deterministic correlated GBM price paths. Same seed -> identical output.

    See the module docstring for the two-stream design: stream 1 freezes the
    original 12 series, stream 2 adds the expansion names without touching them.
    """
    # --- Stream 1: original 12 assets, EXACT original algorithm (frozen). ----
    original_tickers = list(ORIGINAL_ASSETS)
    rng = np.random.default_rng(SEED)
    chol = np.linalg.cholesky(nearest_psd(ORIGINAL_CORR))
    z = rng.standard_normal((TRADING_DAYS, len(original_tickers)))
    original_prices = _gbm_paths(original_tickers, z @ chol.T)

    # --- Stream 2: expansion assets, independent rng, conditioned on SPY. ----
    new_tickers = list(NEW_ASSETS)
    rng_new = np.random.default_rng(SEED + 1)
    # SPY first so its Cholesky column carries each new asset's SPY loading.
    block_corr = sector_block_correlation(["SPY", *new_tickers])
    block_chol = np.linalg.cholesky(block_corr)
    # Replace SPY's shock column with the standardized log-returns of the
    # FROZEN stream-1 SPY path, so new assets co-move with the same market.
    spy_series = original_prices[:, original_tickers.index("SPY")]
    spy_returns = np.diff(np.log(spy_series))
    spy_shocks = (spy_returns - spy_returns.mean()) / spy_returns.std()
    z_block = np.column_stack(
        [spy_shocks, rng_new.standard_normal((TRADING_DAYS, len(new_tickers)))]
    )
    # Drop the SPY column: SPY itself stays the frozen stream-1 series.
    new_shocks = (z_block @ block_chol.T)[:, 1:]
    new_prices = _gbm_paths(new_tickers, new_shocks)

    series = {t: original_prices[:, i].tolist() for i, t in enumerate(original_tickers)}
    return series | {t: new_prices[:, i].tolist() for i, t in enumerate(new_tickers)}


def write_dataset() -> Path:
    """Generate and write data/prices.csv (long format: ticker,day,close)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    series = generate_prices()
    with PRICES_CSV.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ticker", "day", "close"])
        for ticker, closes in series.items():
            for day, close in enumerate(closes):
                w.writerow([ticker, day, f"{close:.4f}"])
    return PRICES_CSV


def load_prices() -> dict[str, list[float]]:
    """Read the committed dataset; regenerate if missing (keeps it reproducible)."""
    if not PRICES_CSV.exists():
        write_dataset()
    series: dict[str, list[float]] = {}
    with PRICES_CSV.open(newline="") as f:
        for row in csv.DictReader(f):
            series.setdefault(row["ticker"], []).append(float(row["close"]))
    return series


def sector_of(ticker: str) -> str:
    return ASSETS[ticker].sector


if __name__ == "__main__":
    path = write_dataset()
    print(f"wrote {path}")
