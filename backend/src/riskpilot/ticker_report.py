"""Assemble a single-ticker TickerReport: deterministic facts + grounded explanation.

Reuses the same guardrail discipline as the portfolio report — the explanation may
reference ONLY the computed ticker facts. M1 of search ships the template
explanation; the live guardrailed LLM path is wired the same way as the portfolio.
"""

from __future__ import annotations

from .config import Config
from .risk_engine.ticker import analyze_ticker
from .schema import ExplanationSource, RiskExplanation, TickerFacts, TickerReport


def _template_explanation(ticker: str, f: TickerFacts) -> RiskExplanation:
    summary = (
        f"{ticker} looks {f.risk_band.value} on its own (risk score {f.risk_score:g}/100). "
        f"Its estimated annualized volatility is {f.volatility_annualized_pct:g}%, its worst "
        f"historical decline in the sample was {f.max_drawdown_pct:g}%, and its beta of "
        f"{f.beta:g} means it tends to move {'more' if f.beta > 1 else 'less'} than the market."
    )
    top = [
        f"Volatility: estimated {f.volatility_annualized_pct:g}% annualized.",
        f"Worst historical decline in the sample: {f.max_drawdown_pct:g}%.",
        f"Market sensitivity: beta of {f.beta:g} (1.0 moves with the market).",
    ]
    checklist = [
        f"Does a beta of {f.beta:g} fit how much market swing you can stomach?",
        f"Would a decline like {f.max_drawdown_pct:g}% be acceptable for your time horizon?",
        f"Is {ticker} sized appropriately for its {f.volatility_annualized_pct:g}% volatility?",
    ]
    return RiskExplanation(
        summary=summary,
        top_risk_factors=top,
        review_checklist=checklist,
        source=ExplanationSource.demo_fixture,
    )


def build_ticker_report(config: Config, ticker: str) -> TickerReport:
    facts, spark = analyze_ticker(ticker)
    symbol = ticker.strip().upper()
    explanation = _template_explanation(symbol, facts)
    explanation.source = (
        ExplanationSource.demo_fixture if config.demo_mode else ExplanationSource.template_fallback
    )
    return TickerReport(
        ticker=symbol,
        as_of="illustrative sample data",
        facts=facts,
        spark=spark,
        explanation=explanation,
    )
