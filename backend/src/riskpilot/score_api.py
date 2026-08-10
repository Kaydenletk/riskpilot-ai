"""Math-only scoring service for the what-if simulator.

TOPOLOGY GUARANTEE: this module (and everything it imports) contains zero LLM
code — enforced by test_no_llm_in_engine.py. The simulator can hammer /score
on every slider change without ever paying for or waiting on a model call."""
from __future__ import annotations

from .risk_engine.portfolio import compute_report_from_weights
from .risk_engine.score import SCORE_VERSION
from .schema import ScoreResponse, WeightedHolding


def score_weights(holdings: list[WeightedHolding]) -> ScoreResponse:
    weights = {h.ticker: h.weight_pct for h in holdings}
    computed_holdings, facts = compute_report_from_weights(weights)
    return ScoreResponse(holdings=computed_holdings, facts=facts, score_version=SCORE_VERSION)
