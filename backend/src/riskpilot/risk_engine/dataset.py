"""Committed, reproducible price dataset (synthetic but realistic).

Honesty: these are NOT real market prices. They are a seeded geometric-Brownian-
motion series with realistic per-ticker annual volatility/drift and a correlation
structure (tech names move together; staples/healthcare are more independent).
The MATH downstream is real and correct on this data — the formulas are the
artifact, the data is a reproducible stand-in. Labeled "synthetic illustrative"
in the UI and DATA_SOURCE.md.

Reproducible: same seed -> same prices. The dataset is generated once and the
result lives in the repo; this module both generates it and is the documented
source of truth for how.
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

SEED = 42
TRADING_DAYS = 504  # ~2 years of daily observations
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
PRICES_CSV = DATA_DIR / "prices.csv"

# ticker -> (annual_drift, annual_vol, start_price, sector)
_ASSETS: dict[str, tuple[float, float, float, str]] = {
    "NVDA": (0.28, 0.45, 120.0, "Technology"),
    "AMD": (0.18, 0.50, 50.0, "Technology"),
    "MSFT": (0.15, 0.25, 220.0, "Technology"),
    "KO": (0.06, 0.16, 50.0, "Consumer Staples"),
    "JNJ": (0.05, 0.18, 160.0, "Healthcare"),
    "SPY": (0.09, 0.16, 450.0, "Index"),  # market proxy for beta (M2+)
}

# Correlation: the three tech names are highly correlated with each other and
# with the index; staples/healthcare are mildly correlated with the market.
_TICKERS = list(_ASSETS.keys())
_CORR = np.array(
    [
        # NVDA  AMD   MSFT  KO    JNJ   SPY
        [1.00, 0.75, 0.65, 0.20, 0.15, 0.70],  # NVDA
        [0.75, 1.00, 0.60, 0.18, 0.15, 0.65],  # AMD
        [0.65, 0.60, 1.00, 0.25, 0.20, 0.75],  # MSFT
        [0.20, 0.18, 0.25, 1.00, 0.40, 0.45],  # KO
        [0.15, 0.15, 0.20, 0.40, 1.00, 0.45],  # JNJ
        [0.70, 0.65, 0.75, 0.45, 0.45, 1.00],  # SPY
    ]
)


def generate_prices() -> dict[str, list[float]]:
    """Deterministic correlated GBM price paths. Same seed -> identical output."""
    rng = np.random.default_rng(SEED)
    dt = 1.0 / 252.0

    drifts = np.array([_ASSETS[t][0] for t in _TICKERS])
    vols = np.array([_ASSETS[t][1] for t in _TICKERS])
    starts = np.array([_ASSETS[t][2] for t in _TICKERS])

    # Correlated daily normal shocks via Cholesky of the correlation matrix.
    chol = np.linalg.cholesky(_CORR)
    z = rng.standard_normal((TRADING_DAYS, len(_TICKERS)))
    correlated = z @ chol.T

    # GBM daily log-return: (mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*shock
    daily_drift = (drifts - 0.5 * vols**2) * dt
    daily_shock = vols * np.sqrt(dt) * correlated
    log_returns = daily_drift + daily_shock

    log_price = np.log(starts) + np.cumsum(log_returns, axis=0)
    prices = np.exp(log_price)
    # prepend the start price as day 0
    prices = np.vstack([starts, prices])

    return {t: prices[:, i].tolist() for i, t in enumerate(_TICKERS)}


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
    return _ASSETS[ticker][3]


if __name__ == "__main__":
    path = write_dataset()
    print(f"wrote {path}")
