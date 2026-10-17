"""OpenAI Structured Outputs call. Returns a parsed draft or raises a typed error.

This is the only module that talks to OpenAI. It enforces JSON SHAPE via Structured
Outputs; it does NOT enforce that the numbers are correct — that's the guardrail's
job (number_guardrail.py), run by the explain pipeline on what this returns.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from ..config import Config
from ..schema import GoalFit, PortfolioGoal, RiskFacts


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


# Verbose prompt-facing labels — template.py keeps its own terse set
# (_GOAL_LABELS_SHORT); the two are independent by design.
_GOAL_LABELS_PROMPT = {
    PortfolioGoal.growth: "growth (long-term appreciation)",
    PortfolioGoal.balanced: "balanced (a mix of growth and income)",
    PortfolioGoal.income: "income (dividends and stability)",
}


def _facts_block(facts: RiskFacts, goal_fit: GoalFit | None = None) -> str:
    """The ONLY numbers the model is allowed to reference, in plain language.
    Mirror of explain._fact_values — update both together."""
    block = (
        f"- Risk score: {facts.risk_score} out of 100 ({facts.risk_band.value})\n"
        f"- The top 3 holdings make up {facts.concentration_pct_top3}% of the portfolio\n"
        f"- Estimated annualized volatility: {facts.volatility_annualized_pct}%\n"
        f"- Worst historical decline (max drawdown): {facts.max_drawdown_pct}%\n"
        f"- Largest sector: {facts.largest_sector}, at {facts.largest_sector_pct}% of the portfolio\n"
        f"- Number of holdings: {facts.holdings_count}"
    )
    if goal_fit is None:
        return block

    goal_lines = (
        f"\n- Stated portfolio goal: {_GOAL_LABELS_PROMPT[goal_fit.goal]}\n"
        f"- Income-oriented share of the portfolio: {goal_fit.income_orientation_pct}%\n"
        f"- Growth-oriented share of the portfolio: {goal_fit.growth_orientation_pct}%\n"
        f"- Goal-fit score: {goal_fit.fit_score} out of 100 ({goal_fit.fit_band.value})\n"
        f"- Illustrative income yield proxy: {goal_fit.income_yield_proxy_pct}% "
        "(synthetic, not a real yield)"
    )
    for s in goal_fit.sector_suggestions:
        goal_lines += (
            f"\n- {s.sector} currently sits at {s.current_pct}% of the portfolio; "
            f"its illustrative typical yield is {s.typical_yield_pct}%"
        )
    return block + goal_lines


SYSTEM_PROMPT = (
    "You are a portfolio RISK COACH writing for an everyday retail investor. You "
    "explain risk in plain, friendly language; you never give investment advice and "
    "never recommend buying or selling any security.\n"
    "WRITE NATURALLY: use ordinary words like 'risk score', 'concentration', "
    "'volatility', 'worst decline'. NEVER write internal field names or code-style "
    "identifiers (no snake_case like 'risk_score' or 'max_drawdown_pct'). Write "
    "percentages with a % sign.\n"
    "CRITICAL: use ONLY the numbers provided in the facts. Do not invent, estimate, "
    "or introduce any number that is not in the facts. The review checklist must be "
    "phrased as questions, never as instructions to buy or sell."
)


def build_messages(
    facts: RiskFacts,
    correction: str | None = None,
    goal_fit: GoalFit | None = None,
) -> list[dict[str, str]]:
    task = "Explain the risk of this portfolio in plain language for a retail investor."
    if goal_fit is not None:
        task += (
            " The investor stated a portfolio goal — also explain how well the current "
            "mix lines up with that goal and which sectors typically serve it, using "
            "ONLY the goal facts below. Frame sector context as education, never as an "
            "instruction to buy or sell."
        )
    user = f"{task}\n\nFACTS (the only numbers you may use):\n{_facts_block(facts, goal_fit)}"
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
    goal_fit: GoalFit | None = None,
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

    messages = build_messages(facts, correction, goal_fit)
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
