"""Asset universe + sector-block correlation builder.

Two tiers of assets:

- ``ORIGINAL_ASSETS``: the 12 names (11 tickers + SPY) that shipped first. Their
  GBM parameters AND their hand-tuned correlation matrix (``ORIGINAL_CORR``) are
  FROZEN verbatim — the committed sample report and frontend fixtures depend on
  their exact price paths, so these values must never change.
- ``NEW_ASSETS``: the ~97-name expansion. Correlations for these are not
  hand-tuned pairwise (that doesn't scale past a dozen names); they come from
  ``sector_block_correlation``, which assigns one intra-sector level per sector,
  a cross-sector base with a few economically-motivated overrides, and a
  per-sector correlation to the Index (SPY).

The block matrix is projected to the nearest valid (PSD) correlation matrix so
Cholesky never fails regardless of how the block levels are tuned.
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np


class AssetSpec(NamedTuple):
    drift: float  # annual drift
    vol: float  # annual volatility
    start: float  # day-0 price
    sector: str


# --- FROZEN: original 12 assets, verbatim from the first-shipped dataset. -----
# Do not edit — the committed sample report and frontend demo fixtures depend on
# these exact values reproducing the exact committed price paths.
ORIGINAL_ASSETS: dict[str, AssetSpec] = {
    "NVDA": AssetSpec(0.28, 0.45, 120.0, "Technology"),
    "AMD": AssetSpec(0.18, 0.50, 50.0, "Technology"),
    "MSFT": AssetSpec(0.15, 0.25, 220.0, "Technology"),
    "AAPL": AssetSpec(0.14, 0.27, 170.0, "Technology"),
    "TSLA": AssetSpec(0.20, 0.55, 240.0, "Consumer Discretionary"),
    "AMZN": AssetSpec(0.16, 0.34, 130.0, "Consumer Discretionary"),
    "JPM": AssetSpec(0.10, 0.24, 150.0, "Financials"),
    "XOM": AssetSpec(0.08, 0.26, 105.0, "Energy"),
    "KO": AssetSpec(0.06, 0.16, 50.0, "Consumer Staples"),
    "PG": AssetSpec(0.06, 0.15, 145.0, "Consumer Staples"),
    "JNJ": AssetSpec(0.05, 0.18, 160.0, "Healthcare"),
    "SPY": AssetSpec(0.09, 0.16, 450.0, "Index"),  # market proxy for beta
}

# FROZEN hand-tuned correlation matrix for ORIGINAL_ASSETS (same row/column
# order as the dict above). Kept verbatim so the seeded draws reproduce the
# committed price paths bit-for-bit.
ORIGINAL_CORR = np.array(
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

# --- Expansion universe: ~97 additional names across 11 sectors. --------------
# Parameters are plausible, not calibrated: drift 0.04–0.24, vol 0.14–0.48, with
# deliberately higher vols for the known high-beta cyclicals (F, GM, BA, FCX,
# OXY) so the beta/vol spread stays interesting for search and scoring.
NEW_ASSETS: dict[str, AssetSpec] = {
    # Technology
    "AVGO": AssetSpec(0.22, 0.35, 170.0, "Technology"),
    "CRM": AssetSpec(0.12, 0.32, 250.0, "Technology"),
    "ORCL": AssetSpec(0.14, 0.28, 120.0, "Technology"),
    "ADBE": AssetSpec(0.10, 0.33, 520.0, "Technology"),
    "CSCO": AssetSpec(0.06, 0.22, 48.0, "Technology"),
    "INTC": AssetSpec(0.04, 0.38, 32.0, "Technology"),
    "QCOM": AssetSpec(0.12, 0.34, 160.0, "Technology"),
    "TXN": AssetSpec(0.09, 0.26, 170.0, "Technology"),
    "IBM": AssetSpec(0.07, 0.22, 165.0, "Technology"),
    "NOW": AssetSpec(0.18, 0.36, 700.0, "Technology"),
    "AMAT": AssetSpec(0.16, 0.38, 190.0, "Technology"),
    "MU": AssetSpec(0.14, 0.44, 90.0, "Technology"),
    "PANW": AssetSpec(0.20, 0.38, 300.0, "Technology"),
    "SNPS": AssetSpec(0.16, 0.30, 520.0, "Technology"),
    "LRCX": AssetSpec(0.16, 0.40, 85.0, "Technology"),
    "KLAC": AssetSpec(0.17, 0.37, 680.0, "Technology"),
    # Communication Services
    "GOOGL": AssetSpec(0.14, 0.30, 140.0, "Communication Services"),
    "META": AssetSpec(0.18, 0.38, 480.0, "Communication Services"),
    "NFLX": AssetSpec(0.16, 0.40, 600.0, "Communication Services"),
    "DIS": AssetSpec(0.06, 0.30, 95.0, "Communication Services"),
    "TMUS": AssetSpec(0.12, 0.24, 165.0, "Communication Services"),
    "VZ": AssetSpec(0.04, 0.18, 40.0, "Communication Services"),
    "T": AssetSpec(0.04, 0.20, 18.0, "Communication Services"),
    "CMCSA": AssetSpec(0.05, 0.24, 40.0, "Communication Services"),
    # Consumer Discretionary
    "HD": AssetSpec(0.09, 0.24, 345.0, "Consumer Discretionary"),
    "MCD": AssetSpec(0.08, 0.18, 260.0, "Consumer Discretionary"),
    "NKE": AssetSpec(0.05, 0.30, 90.0, "Consumer Discretionary"),
    "SBUX": AssetSpec(0.06, 0.28, 95.0, "Consumer Discretionary"),
    "LOW": AssetSpec(0.09, 0.26, 230.0, "Consumer Discretionary"),
    "TJX": AssetSpec(0.10, 0.22, 110.0, "Consumer Discretionary"),
    "BKNG": AssetSpec(0.14, 0.30, 3800.0, "Consumer Discretionary"),
    "GM": AssetSpec(0.06, 0.34, 45.0, "Consumer Discretionary"),
    "F": AssetSpec(0.04, 0.36, 11.0, "Consumer Discretionary"),
    "ABNB": AssetSpec(0.12, 0.42, 140.0, "Consumer Discretionary"),
    # Financials
    "BAC": AssetSpec(0.08, 0.28, 38.0, "Financials"),
    "WFC": AssetSpec(0.08, 0.30, 55.0, "Financials"),
    "GS": AssetSpec(0.11, 0.28, 450.0, "Financials"),
    "MS": AssetSpec(0.10, 0.28, 95.0, "Financials"),
    "BLK": AssetSpec(0.11, 0.26, 800.0, "Financials"),
    "SCHW": AssetSpec(0.08, 0.32, 65.0, "Financials"),
    "AXP": AssetSpec(0.12, 0.28, 230.0, "Financials"),
    "V": AssetSpec(0.12, 0.22, 270.0, "Financials"),
    "MA": AssetSpec(0.13, 0.23, 450.0, "Financials"),
    "C": AssetSpec(0.06, 0.30, 60.0, "Financials"),
    "USB": AssetSpec(0.06, 0.28, 42.0, "Financials"),
    "PNC": AssetSpec(0.07, 0.28, 155.0, "Financials"),
    # Healthcare
    "UNH": AssetSpec(0.11, 0.24, 520.0, "Healthcare"),
    "LLY": AssetSpec(0.24, 0.32, 780.0, "Healthcare"),
    "PFE": AssetSpec(0.04, 0.24, 28.0, "Healthcare"),
    "MRK": AssetSpec(0.08, 0.22, 110.0, "Healthcare"),
    "ABBV": AssetSpec(0.10, 0.22, 165.0, "Healthcare"),
    "TMO": AssetSpec(0.09, 0.24, 550.0, "Healthcare"),
    "ABT": AssetSpec(0.08, 0.20, 110.0, "Healthcare"),
    "DHR": AssetSpec(0.09, 0.24, 250.0, "Healthcare"),
    "BMY": AssetSpec(0.04, 0.22, 48.0, "Healthcare"),
    "AMGN": AssetSpec(0.08, 0.22, 290.0, "Healthcare"),
    "GILD": AssetSpec(0.06, 0.24, 75.0, "Healthcare"),
    "CVS": AssetSpec(0.04, 0.28, 60.0, "Healthcare"),
    "MDT": AssetSpec(0.05, 0.21, 85.0, "Healthcare"),
    "ISRG": AssetSpec(0.16, 0.30, 420.0, "Healthcare"),
    "VRTX": AssetSpec(0.13, 0.28, 440.0, "Healthcare"),
    # Consumer Staples
    "PEP": AssetSpec(0.06, 0.16, 170.0, "Consumer Staples"),
    "COST": AssetSpec(0.14, 0.20, 740.0, "Consumer Staples"),
    "WMT": AssetSpec(0.10, 0.18, 68.0, "Consumer Staples"),
    "MDLZ": AssetSpec(0.06, 0.17, 70.0, "Consumer Staples"),
    "CL": AssetSpec(0.06, 0.16, 90.0, "Consumer Staples"),
    "KMB": AssetSpec(0.05, 0.16, 135.0, "Consumer Staples"),
    "GIS": AssetSpec(0.04, 0.17, 68.0, "Consumer Staples"),
    "KHC": AssetSpec(0.04, 0.20, 35.0, "Consumer Staples"),
    # Energy
    "CVX": AssetSpec(0.07, 0.25, 155.0, "Energy"),
    "COP": AssetSpec(0.09, 0.30, 110.0, "Energy"),
    "SLB": AssetSpec(0.08, 0.36, 48.0, "Energy"),
    "EOG": AssetSpec(0.09, 0.32, 125.0, "Energy"),
    "OXY": AssetSpec(0.07, 0.40, 60.0, "Energy"),
    "PSX": AssetSpec(0.08, 0.30, 130.0, "Energy"),
    # Industrials
    "CAT": AssetSpec(0.11, 0.28, 330.0, "Industrials"),
    "BA": AssetSpec(0.05, 0.40, 180.0, "Industrials"),
    "HON": AssetSpec(0.08, 0.20, 200.0, "Industrials"),
    "UPS": AssetSpec(0.05, 0.26, 140.0, "Industrials"),
    "RTX": AssetSpec(0.09, 0.24, 100.0, "Industrials"),
    "LMT": AssetSpec(0.08, 0.20, 460.0, "Industrials"),
    "DE": AssetSpec(0.10, 0.28, 380.0, "Industrials"),
    "GE": AssetSpec(0.15, 0.30, 160.0, "Industrials"),
    "UNP": AssetSpec(0.08, 0.24, 240.0, "Industrials"),
    "FDX": AssetSpec(0.07, 0.30, 270.0, "Industrials"),
    "ETN": AssetSpec(0.14, 0.27, 310.0, "Industrials"),
    # Utilities
    "NEE": AssetSpec(0.08, 0.22, 72.0, "Utilities"),
    "DUK": AssetSpec(0.05, 0.17, 100.0, "Utilities"),
    "SO": AssetSpec(0.06, 0.17, 78.0, "Utilities"),
    "AEP": AssetSpec(0.05, 0.18, 90.0, "Utilities"),
    # Real Estate
    "AMT": AssetSpec(0.06, 0.24, 195.0, "Real Estate"),
    "PLD": AssetSpec(0.07, 0.26, 120.0, "Real Estate"),
    "SPG": AssetSpec(0.08, 0.26, 150.0, "Real Estate"),
    # Materials
    "LIN": AssetSpec(0.10, 0.20, 430.0, "Materials"),
    "SHW": AssetSpec(0.10, 0.24, 340.0, "Materials"),
    "APD": AssetSpec(0.07, 0.24, 260.0, "Materials"),
    "FCX": AssetSpec(0.09, 0.42, 45.0, "Materials"),
}

# Full universe. Original assets first so CSV/report ordering stays stable.
ASSETS: dict[str, AssetSpec] = {**ORIGINAL_ASSETS, **NEW_ASSETS}

# --- Sector-block correlation levels. ----------------------------------------
# One number per sector for how tightly its members co-move. Energy trades as a
# bloc (oil price), tech is crowded, healthcare is the most idiosyncratic.
INTRA_SECTOR: dict[str, float] = {
    "Technology": 0.62,
    "Communication Services": 0.55,
    "Consumer Discretionary": 0.50,
    "Financials": 0.60,
    "Healthcare": 0.45,
    "Consumer Staples": 0.50,
    "Energy": 0.65,
    "Industrials": 0.55,
    "Utilities": 0.60,
    "Real Estate": 0.55,
    "Materials": 0.50,
    "Index": 1.00,
}

# Baseline correlation between members of two different sectors...
CROSS_SECTOR_BASE = 0.35
# ...defensive staples decorrelate from everything by default...
STAPLES_CROSS = 0.25
# ...and a few pairs get explicit economic overrides (growth clusters correlate
# more; rate-sensitive utilities and oil decouple from tech).
CROSS_SECTOR_OVERRIDES: dict[frozenset[str], float] = {
    frozenset({"Technology", "Communication Services"}): 0.55,
    frozenset({"Technology", "Consumer Discretionary"}): 0.45,
    frozenset({"Energy", "Technology"}): 0.18,
    frozenset({"Utilities", "Technology"}): 0.20,
}

# Every sector's correlation to the Index (SPY): the market-beta ladder from
# high-beta tech down to defensive utilities.
INDEX_CORRELATION: dict[str, float] = {
    "Technology": 0.80,
    "Communication Services": 0.75,
    "Consumer Discretionary": 0.70,
    "Financials": 0.70,
    "Industrials": 0.70,
    "Healthcare": 0.55,
    "Consumer Staples": 0.50,
    "Energy": 0.45,
    "Utilities": 0.40,
    "Real Estate": 0.50,
    "Materials": 0.60,
}


def nearest_psd(corr: np.ndarray) -> np.ndarray:
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


def _pair_correlation(sector_a: str, sector_b: str) -> float:
    """Target correlation between one member of sector_a and one of sector_b."""
    if sector_a == "Index" or sector_b == "Index":
        other = sector_b if sector_a == "Index" else sector_a
        # Index-Index only occurs off-diagonal if two Index assets existed.
        return 1.0 if other == "Index" else INDEX_CORRELATION[other]
    if sector_a == sector_b:
        return INTRA_SECTOR[sector_a]
    override = CROSS_SECTOR_OVERRIDES.get(frozenset({sector_a, sector_b}))
    if override is not None:
        return override
    if "Consumer Staples" in (sector_a, sector_b):
        return STAPLES_CROSS
    return CROSS_SECTOR_BASE


def sector_block_correlation(tickers: list[str] | None = None) -> np.ndarray:
    """Build the sector-block correlation matrix for `tickers` (default: all).

    Each entry is determined purely by the two assets' sectors (see the level
    tables above), then the whole matrix is projected to the nearest PSD
    correlation matrix so Cholesky decomposition always succeeds.
    """
    names = list(ASSETS) if tickers is None else list(tickers)
    sectors = [ASSETS[t].sector for t in names]
    n = len(names)
    corr = np.eye(n)
    for i in range(n):
        for j in range(i + 1, n):
            value = _pair_correlation(sectors[i], sectors[j])
            corr[i, j] = value
            corr[j, i] = value
    return nearest_psd(corr)
