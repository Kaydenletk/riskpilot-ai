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


class WeightedHolding(BaseModel):
    """Builder input: percent weights. The engine converts to synthetic shares."""

    ticker: str
    weight_pct: float = Field(..., gt=0, le=100)


class RiskFacts(BaseModel):
    """Deterministic numbers. Produced ONLY by risk_engine. The LLM never writes these."""

    risk_score: float = Field(..., ge=0, le=100, description="composite 0-100")
    risk_band: RiskBand
    concentration_pct_top3: float = Field(..., ge=0, le=100)
    volatility_annualized_pct: float = Field(..., ge=0)
    max_drawdown_pct: float = Field(..., le=0, description="worst historical decline, <= 0")
    largest_sector: str
    largest_sector_pct: float = Field(..., ge=0, le=100)
    holdings_count: int = Field(..., ge=0)


class PortfolioGoal(str, Enum):
    """What the investor says the portfolio is FOR. Chosen in the builder UI."""

    growth = "growth"
    balanced = "balanced"
    income = "income"


class FitBand(str, Enum):
    aligned = "aligned"
    partial = "partial"
    misaligned = "misaligned"


class SectorSuggestion(BaseModel):
    """One sector that typically serves the chosen goal — educational context,
    never a buy list. `example_tickers` are demo-universe names not already held."""

    sector: str
    current_pct: float = Field(..., ge=0, le=100, description="current portfolio weight")
    typical_yield_pct: float = Field(
        ..., ge=0, description="illustrative sector yield proxy (synthetic universe)"
    )
    example_tickers: list[str]


class GoalFit(BaseModel):
    """Deterministic goal-alignment facts. Produced ONLY by risk_engine.goal —
    the LLM may reference these numbers (they join the guardrail whitelist)."""

    goal: PortfolioGoal
    income_orientation_pct: float = Field(..., ge=0, le=100)
    growth_orientation_pct: float = Field(..., ge=0, le=100)
    fit_score: float = Field(..., ge=0, le=100)
    fit_band: FitBand
    income_yield_proxy_pct: float = Field(
        ..., ge=0, description="weighted illustrative yield proxy, NOT a real yield"
    )
    sector_suggestions: list[SectorSuggestion]


class ScoreResponse(BaseModel):
    """Facts-only response for the what-if fast path. Deliberately NO explanation
    field — this endpoint never touches the LLM."""

    holdings: list[Holding]
    facts: RiskFacts
    score_version: str


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
    # Present only when the request named a portfolio goal. Optional so committed
    # frontend fixtures predating the field stay valid.
    goal_fit: GoalFit | None = None
    disclaimer: str = (
        "Educational risk coaching, not financial advice. No buy/sell recommendations. "
        "Illustrative sample data."
    )


class TickerOption(BaseModel):
    """One searchable instrument in the demo universe."""

    ticker: str
    sector: str


class TickerFacts(BaseModel):
    """Deterministic single-ticker risk numbers. Produced ONLY by risk_engine."""

    risk_score: float = Field(..., ge=0, le=100)
    risk_band: RiskBand
    volatility_annualized_pct: float = Field(..., ge=0)
    max_drawdown_pct: float = Field(..., le=0)
    beta: float = Field(..., description="vs the market index")
    sector: str


class SectorContext(BaseModel):
    """Relative framing for a single ticker: raw volatility means nothing to a
    newcomer until it stands next to the sector median. Deterministic, computed
    over the committed universe only."""

    sector: str
    sector_median_volatility_pct: float = Field(..., ge=0)
    sector_median_beta: float
    universe_volatility_percentile: int = Field(
        ..., ge=0, le=100, description="% of the universe LESS volatile than this ticker"
    )
    peers: list[str] = Field(..., description="same-sector tickers, nearest by volatility")


class TickerReport(BaseModel):
    ticker: str
    as_of: str
    facts: TickerFacts
    spark: list[float] = Field(..., description="downsampled price series for a sparkline")
    explanation: RiskExplanation
    # Optional so committed frontend fixtures predating the field stay valid.
    context: SectorContext | None = None
    disclaimer: str = (
        "Educational risk coaching, not financial advice. No buy/sell recommendations. "
        "Illustrative sample data."
    )
