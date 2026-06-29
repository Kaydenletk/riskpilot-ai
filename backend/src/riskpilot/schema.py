"""The report contract shared by risk_engine (producer) and llm (explainer).

`facts` is the single source of truth: the exact set of deterministic numbers
the engine computed. The LLM explanation may reference ONLY these numbers —
the guardrail (llm/number_guardrail.py) enforces that against `facts`.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class RiskBand(str, Enum):
    conservative = "conservative"
    moderate = "moderate"
    aggressive = "aggressive"


class Holding(BaseModel):
    ticker: str
    shares: float
    sector: str
    market_value: float = Field(..., description="shares * current price, computed")


class RiskFacts(BaseModel):
    """Deterministic numbers. Produced ONLY by risk_engine. The LLM never writes these."""

    risk_score: float = Field(..., ge=0, le=100, description="composite 0-100")
    risk_band: RiskBand
    concentration_pct_top3: float = Field(..., ge=0, le=100)
    volatility_annualized_pct: float = Field(..., ge=0)
    largest_sector: str
    largest_sector_pct: float = Field(..., ge=0, le=100)
    holdings_count: int = Field(..., ge=0)


class ExplanationSource(str, Enum):
    model = "model"
    model_regenerated = "model_regenerated"
    template_fallback = "template_fallback"
    demo_fixture = "demo_fixture"


class RiskExplanation(BaseModel):
    """The LLM (or template/fixture) layer. `summary` is prose the guardrail checks."""

    summary: str
    top_risk_factors: list[str]
    review_checklist: list[str] = Field(
        ..., description="phrased as questions, never buy/sell imperatives"
    )
    source: ExplanationSource


class RiskReport(BaseModel):
    portfolio_name: str
    as_of: str = Field(..., description="data freshness label, e.g. illustrative sample")
    holdings: list[Holding]
    facts: RiskFacts
    explanation: RiskExplanation
    disclaimer: str = (
        "Educational risk coaching, not financial advice. No buy/sell recommendations. "
        "Illustrative sample data."
    )
