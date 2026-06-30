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
# A deliberately spread universe: mega-cap tech, two high-beta growth names,
# defensive staples/healthcare, a cyclical bank, an energy name (low tech corr),
# plus SPY as the market proxy. The vol + SPY-correlation choices below TARGET a
# realistic beta spread (~0.4 defensive → ~2.0 high-beta) so search is interesting.
_ASSETS: dict[str, tuple[float, float, float, str]] = {
    "NVDA": (0.28, 0.45, 120.0, "Technology"),
    "AMD": (0.18, 0.50, 50.0, "Technology"),
    "MSFT": (0.15, 0.25, 220.0, "Technology"),
    "AAPL": (0.14, 0.27, 170.0, "Technology"),
    "TSLA": (0.20, 0.55, 240.0, "Consumer Discretionary"),
    "AMZN": (0.16, 0.34, 130.0, "Consumer Discretionary"),
    "JPM": (0.10, 0.24, 150.0, "Financials"),
    "XOM": (0.08, 0.26, 105.0, "Energy"),
    "KO": (0.06, 0.16, 50.0, "Consumer Staples"),
    "PG": (0.06, 0.15, 145.0, "Consumer Staples"),
    "JNJ": (0.05, 0.18, 160.0, "Healthcare"),
    "SPY": (0.09, 0.16, 450.0, "Index"),  # market proxy for beta
}

# Correlation structure (symmetric, positive-definite). Tech names cluster tightly
# with each other and the index; TSLA/AMZN correlate moderately with tech; the bank
# is mid; staples/healthcare/energy are the diversifiers (low tech correlation).
# Hand-tuned, then projected to the nearest valid correlation matrix at load time
# (see _nearest_psd) so Cholesky never fails on a slightly-inconsistent entry.
_TICKERS = list(_ASSETS.keys())
_CORR = np.array(
    [
        # NVDA  AMD   MSFT  AAPL  TSLA  AMZN  JPM   XOM   KO    PG    JNJ   SPY
        [1.00, 0.75, 0.65, 0.62, 0.55, 0.58, 0.40, 0.20, 0.18, 0.16, 0.15, 0.70],  # NVDA
        [0.75, 1.00, 0.60, 0.58, 0.55, 0.55, 0.38, 0.20, 0.16, 0.15, 0.15, 0.65],  # AMD
        [0.65, 0.60, 1.00, 0.70, 0.50, 0.62, 0.42, 0.22, 0.24, 0.22, 0.20, 0.78],  # MSFT
        [0.62, 0.58, 0.70, 1.00, 0.48, 0.60, 0.40, 0.22, 0.24, 0.22, 0.20, 0.76],  # AAPL
        [0.55, 0.55, 0.50, 0.48, 1.00, 0.52, 0.35, 0.18, 0.12, 0.12, 0.12, 0.62],  # TSLA
        [0.58, 0.55, 0.62, 0.60, 0.52, 1.00, 0.40, 0.20, 0.18, 0.16, 0.16, 0.68],  # AMZN
        [0.40, 0.38, 0.42, 0.40, 0.35, 0.40, 1.00, 0.35, 0.30, 0.28, 0.28, 0.62],  # JPM
        [0.20, 0.20, 0.22, 0.22, 0.18, 0.20, 0.35, 1.00, 0.25, 0.22, 0.22, 0.40],  # XOM
        [0.18, 0.16, 0.24, 0.24, 0.12, 0.18, 0.30, 0.25, 1.00, 0.55, 0.42, 0.45],  # KO
        [0.16, 0.15, 0.22, 0.22, 0.12, 0.16, 0.28, 0.22, 0.55, 1.00, 0.45, 0.43],  # PG
        [0.15, 0.15, 0.20, 0.20, 0.12, 0.16, 0.28, 0.22, 0.42, 0.45, 1.00, 0.45],  # JNJ
        [0.70, 0.65, 0.78, 0.76, 0.62, 0.68, 0.62, 0.40, 0.45, 0.43, 0.45, 1.00],  # SPY
    ]
)


def _nearest_psd(corr: np.ndarray) -> np.ndarray:
    """Project a hand-tuned correlation matrix to the nearest valid (PSD) one.

    Clip negative eigenvalues to ~0, rebuild, then renormalize the diagonal back
    to 1. Guarantees np.linalg.cholesky succeeds no matter how the entries above
    were tuned — so editing a correlation by hand can never break generation.
    """
    eigvals, eigvecs = np.linalg.eigh(corr)
    eigvals = np.clip(eigvals, 1e-8, None)
    rebuilt = eigvecs @ np.diag(eigvals) @ eigvecs.T
    d = np.sqrt(np.diag(rebuilt))
    return rebuilt / np.outer(d, d)


def generate_prices() -> dict[str, list[float]]:
    """Deterministic correlated GBM price paths. Same seed -> identical output."""
    rng = np.random.default_rng(SEED)
    dt = 1.0 / 252.0

    drifts = np.array([_ASSETS[t][0] for t in _TICKERS])
    vols = np.array([_ASSETS[t][1] for t in _TICKERS])
    starts = np.array([_ASSETS[t][2] for t in _TICKERS])

    # Correlated daily normal shocks via Cholesky of the (PSD-projected) matrix.
    chol = np.linalg.cholesky(_nearest_psd(_CORR))
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
