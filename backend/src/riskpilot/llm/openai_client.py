"""OpenAI Structured Outputs call. Returns a parsed draft or raises a typed error.

This is the only module that talks to OpenAI. It enforces JSON SHAPE via Structured
Outputs; it does NOT enforce that the numbers are correct — that's the guardrail's
job (number_guardrail.py), run by the explain pipeline on what this returns.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from ..config import Config
from ..schema import RiskFacts


class LLMError(Exception):
    """Any failure that should route to the template fallback (timeout, 429,
    refusal, malformed output, transport error)."""


class LLMExplanationDraft(BaseModel):
    """What the model is asked to return. Prose fields are guardrail-checked.

    The model is told to use ONLY the provided facts and write no other numbers.
    """

    summary: str = Field(..., description="2-3 sentence plain-English risk summary")
    top_risk_factors: list[str] = Field(..., description="3-4 short risk bullets")
    review_checklist: list[str] = Field(
        ..., description="3 review QUESTIONS, never buy/sell imperatives"
    )


def _facts_block(facts: RiskFacts) -> str:
    """The ONLY numbers the model is allowed to reference, listed explicitly."""
    return (
        f"- risk_score: {facts.risk_score} (out of 100)\n"
        f"- risk_band: {facts.risk_band.value}\n"
        f"- top_3_concentration_pct: {facts.concentration_pct_top3}\n"
        f"- annualized_volatility_pct: {facts.volatility_annualized_pct}\n"
        f"- max_drawdown_pct: {facts.max_drawdown_pct}\n"
        f"- largest_sector: {facts.largest_sector} at {facts.largest_sector_pct}%\n"
        f"- holdings_count: {facts.holdings_count}"
    )


SYSTEM_PROMPT = (
    "You are a portfolio RISK COACH. You explain risk; you never give investment "
    "advice and never recommend buying or selling any security. "
    "CRITICAL: use ONLY the numbers provided in the facts. Do not invent, estimate, "
    "or introduce any number that is not in the facts. The review checklist must be "
    "phrased as questions, never as instructions to buy or sell."
)


def build_messages(facts: RiskFacts, correction: str | None = None) -> list[dict[str, str]]:
    user = (
        "Explain the risk of this portfolio in plain language for a retail investor.\n\n"
        f"FACTS (the only numbers you may use):\n{_facts_block(facts)}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]
    if correction:
        messages.append({"role": "system", "content": correction})
    return messages


def call_openai(
    config: Config,
    facts: RiskFacts,
    correction: str | None = None,
    *,
    client: object | None = None,
) -> LLMExplanationDraft:
    """One Structured-Outputs call. `client` is injectable for tests (a stub).

    Raises LLMError on timeout / refusal / malformed / transport failure so the
    caller can fall back to the deterministic template.
    """
    if client is None:
        try:
            from openai import OpenAI
        except ImportError as e:  # pragma: no cover - dep always present in prod
            raise LLMError(f"openai sdk unavailable: {e}") from e
        client = OpenAI(api_key=config.openai_api_key, timeout=20.0)

    messages = build_messages(facts, correction)
    # Newer models (gpt-5.x) only accept the default temperature, so we don't pass
    # one. Determinism for the demo comes from the pinned model + the guardrail,
    # not from temperature=0.
    try:
        completion = client.beta.chat.completions.parse(  # type: ignore[attr-defined]
            model=config.openai_model,
            messages=messages,
            response_format=LLMExplanationDraft,
        )
    except Exception as e:  # noqa: BLE001 - intentionally broad: any failure -> fallback
        raise LLMError(f"openai call failed: {e}") from e

    choice = completion.choices[0]
    if getattr(choice.message, "refusal", None):
        raise LLMError(f"model refused: {choice.message.refusal}")
    parsed = choice.message.parsed
    if parsed is None:
        raise LLMError("model returned no parseable content")
    return parsed
