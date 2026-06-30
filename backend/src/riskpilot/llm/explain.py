"""The guardrailed explanation pipeline.

  call model -> run guardrail on prose -> if ungrounded numbers:
    regenerate ONCE with a correction -> if STILL bad: deterministic template.

Invariant: a delivered explanation NEVER contains a number absent from the facts,
because the terminal fallback (template) is grounded by construction. The source
flag records what actually happened.
"""

from __future__ import annotations

import logging

from ..schema import ExplanationSource, RiskExplanation, RiskFacts
from .number_guardrail import find_ungrounded_numbers
from .openai_client import LLMError, LLMExplanationDraft, call_openai
from .template import build_template_explanation

log = logging.getLogger("riskpilot.explain")

MAX_LLM_RETRIES = 1  # one regeneration attempt, then fail closed. NEVER loop.


def _fact_values(facts: RiskFacts) -> list[float]:
    """The numbers the guardrail treats as grounded."""
    return [
        facts.risk_score,
        facts.concentration_pct_top3,
        facts.volatility_annualized_pct,
        abs(facts.max_drawdown_pct),
        facts.max_drawdown_pct,
        facts.largest_sector_pct,
        float(facts.holdings_count),
    ]


def _draft_prose(draft: LLMExplanationDraft) -> str:
    """All free-text the guardrail must scan."""
    return " ".join([draft.summary, *draft.top_risk_factors, *draft.review_checklist])


def _to_explanation(draft: LLMExplanationDraft, source: ExplanationSource) -> RiskExplanation:
    return RiskExplanation(
        summary=draft.summary,
        top_risk_factors=draft.top_risk_factors,
        review_checklist=draft.review_checklist,
        source=source,
    )


def explain(config, facts: RiskFacts, *, client: object | None = None) -> RiskExplanation:
    """Produce a grounded explanation. Live model when configured, else template."""
    if not config.has_live_llm:
        expl = build_template_explanation(facts)
        expl.source = ExplanationSource.demo_fixture if config.demo_mode else ExplanationSource.template_fallback
        return expl

    fact_values = _fact_values(facts)

    # Attempt 1: model.
    try:
        draft = call_openai(config, facts, client=client)
    except LLMError as e:
        log.warning("LLM call failed (%s) -> template fallback", e)
        return _to_explanation_from_template(facts)

    ungrounded = find_ungrounded_numbers(_draft_prose(draft), fact_values)
    if not ungrounded:
        return _to_explanation(draft, ExplanationSource.model)

    # Attempt 2: regenerate once with a correction naming the bad numbers.
    log.info("guardrail caught ungrounded numbers %s -> regenerating once", ungrounded)
    correction = (
        f"Your previous answer used numbers that are NOT in the facts: {ungrounded}. "
        "Rewrite using ONLY the provided facts. Do not introduce any other number."
    )
    try:
        draft2 = call_openai(config, facts, correction=correction, client=client)
    except LLMError as e:
        log.warning("regeneration failed (%s) -> template fallback", e)
        return _to_explanation_from_template(facts)

    if not find_ungrounded_numbers(_draft_prose(draft2), fact_values):
        return _to_explanation(draft2, ExplanationSource.model_regenerated)

    # Still hallucinating after one retry: fail closed to the grounded template.
    log.warning("LLM still ungrounded after retry -> template fallback")
    return _to_explanation_from_template(facts)


def _to_explanation_from_template(facts: RiskFacts) -> RiskExplanation:
    expl = build_template_explanation(facts)
    expl.source = ExplanationSource.template_fallback
    return expl
