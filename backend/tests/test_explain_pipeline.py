"""Pipeline tests with a STUB OpenAI client — no real API calls, no key.

Proves the guardrailed flow end to end: grounded -> model; ungrounded-then-clean
-> regenerated; ungrounded-twice -> template fallback; refusal/timeout -> template.
The stub mimics client.beta.chat.completions.parse(...).
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from riskpilot.config import Config
from riskpilot.llm.explain import explain
from riskpilot.llm.openai_client import LLMExplanationDraft
from riskpilot.schema import ExplanationSource, RiskBand, RiskFacts

FACTS = RiskFacts(
    risk_score=67.0,
    risk_band=RiskBand.aggressive,
    concentration_pct_top3=73.8,
    volatility_annualized_pct=27.3,
    max_drawdown_pct=-54.0,
    largest_sector="Technology",
    largest_sector_pct=68.5,
    holdings_count=5,
)

LIVE = Config(
    demo_mode=False,
    openai_api_key="sk-test",
    openai_model="gpt-test",
    internal_shared_secret="x",
)


# ── stub client ──────────────────────────────────────────────────────────────
@dataclass
class _Msg:
    parsed: LLMExplanationDraft | None
    refusal: str | None = None


@dataclass
class _Choice:
    message: _Msg


@dataclass
class _Completion:
    choices: list[_Choice]


class StubClient:
    """Returns queued drafts (or raises) on each parse() call. Mimics the SDK shape."""

    def __init__(self, drafts: list[object]) -> None:
        self._drafts = list(drafts)
        self.calls = 0

        outer = self

        class _Parse:
            def parse(self, **_kw: object) -> _Completion:
                outer.calls += 1
                item = outer._drafts.pop(0)
                if isinstance(item, Exception):
                    raise item
                if isinstance(item, str):  # refusal
                    return _Completion([_Choice(_Msg(parsed=None, refusal=item))])
                return _Completion([_Choice(_Msg(parsed=item))])

        class _Completions:
            parse = _Parse().parse

        class _Chat:
            completions = _Completions()

        class _Beta:
            chat = _Chat()

        self.beta = _Beta()


def _grounded() -> LLMExplanationDraft:
    return LLMExplanationDraft(
        summary="This portfolio is aggressive with a risk score of 67. Its top 3 holdings are 73.8% of the book.",
        top_risk_factors=["Technology is 68.5% of holdings.", "Annualized volatility is 27.3%."],
        review_checklist=["Is 73.8% in three names intentional?", "Does this volatility fit your horizon?", "Are you comfortable with this concentration?"],
    )


def _hallucinated() -> LLMExplanationDraft:
    return LLMExplanationDraft(
        summary="Your portfolio dropped 23% last quarter and could fall another 40%.",  # 23, 40 not facts
        top_risk_factors=["Concentration is high."],
        review_checklist=["Have you reviewed your allocation?", "Is your risk acceptable?", "Do you have a plan?"],
    )


# ── tests ────────────────────────────────────────────────────────────────────
def test_grounded_first_try_is_marked_model() -> None:
    stub = StubClient([_grounded()])
    expl = explain(LIVE, FACTS, client=stub)
    assert expl.source == ExplanationSource.model
    assert stub.calls == 1


def test_hallucinated_then_clean_is_marked_regenerated() -> None:
    stub = StubClient([_hallucinated(), _grounded()])
    expl = explain(LIVE, FACTS, client=stub)
    assert expl.source == ExplanationSource.model_regenerated
    assert stub.calls == 2  # one retry only


def test_hallucinated_twice_falls_back_to_template() -> None:
    stub = StubClient([_hallucinated(), _hallucinated()])
    expl = explain(LIVE, FACTS, client=stub)
    assert expl.source == ExplanationSource.template_fallback
    assert stub.calls == 2  # MAX_LLM_RETRIES=1 -> never a 3rd call
    # template is grounded by construction
    from riskpilot.llm.number_guardrail import find_ungrounded_numbers
    from riskpilot.llm.explain import _draft_prose, _fact_values  # noqa: PLC0415

    prose = " ".join([expl.summary, *expl.top_risk_factors, *expl.review_checklist])
    assert find_ungrounded_numbers(prose, _fact_values(FACTS)) == []


def test_refusal_falls_back_to_template() -> None:
    stub = StubClient(["I can't help with that."])
    expl = explain(LIVE, FACTS, client=stub)
    assert expl.source == ExplanationSource.template_fallback


def test_transport_error_falls_back_to_template() -> None:
    stub = StubClient([TimeoutError("boom")])
    expl = explain(LIVE, FACTS, client=stub)
    assert expl.source == ExplanationSource.template_fallback


def test_demo_mode_never_calls_the_model() -> None:
    demo = Config(demo_mode=True, openai_api_key="", openai_model="x", internal_shared_secret="x")
    stub = StubClient([_grounded()])
    expl = explain(demo, FACTS, client=stub)
    assert expl.source == ExplanationSource.demo_fixture
    assert stub.calls == 0  # DEMO_MODE short-circuits before any call


def test_delivered_checklist_is_questions_only() -> None:
    expl = explain(LIVE, FACTS, client=StubClient([_grounded()]))
    assert all(item.strip().endswith("?") for item in expl.review_checklist)
