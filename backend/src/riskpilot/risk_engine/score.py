"""Composite risk score (0-100). A documented, deterministic, version-pinned
product judgment — NOT a textbook formula.

Design choice (RiskPilot v1): concentration-led, because the product's entire
message is "your main risk is concentration / FOMO." The score reflects the risk
the tool actually coaches toward.

  score = 100 * (0.50*concentration + 0.35*volatility + 0.15*drawdown), clamped.

Each input is mapped to a 0..1 "signal" so the weighted sum is interpretable.
Monotonicity is unit-tested: raising any single signal raises the score.
"""

from __future__ import annotations

SCORE_VERSION = "v1-concentration-led"

# weights (sum to 1.0)
W_CONCENTRATION = 0.50
W_VOLATILITY = 0.35
W_DRAWDOWN = 0.15

# Signal-mapping anchors. Volatility 10%->0, 50%->1 (typical equity range).
_VOL_FLOOR = 0.10
_VOL_CEIL = 0.50
# Drawdown 0%->0, -50%->1 (deeper than -50% saturates at 1).
_DD_CEIL = 0.50


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def volatility_signal(annualized_vol: float) -> float:
    """Annualized vol (e.g. 0.315) -> 0..1 across the 10%..50% band."""
    return _clamp01((annualized_vol - _VOL_FLOOR) / (_VOL_CEIL - _VOL_FLOOR))


def concentration_signal(top_n_concentration_pct: float) -> float:
    """Concentration signal from the top-3 share (%), e.g. 73.8% -> 0.738.

    We use the top-N share rather than normalized HHI: HHI under-penalizes a
    few-big-names book (it compares against the n-holding baseline), so a 73.8%-
    concentrated portfolio scored as only mildly concentrated under HHI. The
    top-N share is what a human means by "concentrated" and matches the number
    the UI already shows, so the score and the displayed figure agree.
    """
    return _clamp01(top_n_concentration_pct / 100.0)


def drawdown_signal(max_drawdown_pct: float) -> float:
    """Max drawdown is <= 0 (percent). |dd|/50% -> 0..1."""
    return _clamp01(abs(max_drawdown_pct) / 100.0 / _DD_CEIL)


def composite_risk_score(
    annualized_vol: float,
    top_n_concentration_pct: float,
    max_drawdown_pct: float,
) -> float:
    """The headline 0-100 score. Concentration-weighted (top-N share)."""
    s = (
        W_CONCENTRATION * concentration_signal(top_n_concentration_pct)
        + W_VOLATILITY * volatility_signal(annualized_vol)
        + W_DRAWDOWN * drawdown_signal(max_drawdown_pct)
    )
    return round(100.0 * s, 1)


def band_for_score(score: float) -> str:
    """0-100 -> conservative / moderate / aggressive."""
    if score >= 66:
        return "aggressive"
    if score >= 33:
        return "moderate"
    return "conservative"
