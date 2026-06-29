"""The guardrail tests ARE the proof artifact. Names narrate the safety story.

These feed CANNED prose into the pure guardrail — they never call OpenAI.
They are written FIRST (TDD): they describe the contract `is_grounded` must meet.
Until is_grounded is implemented they fail with NotImplementedError, which is
the RED state you implement against.
"""

from __future__ import annotations

from riskpilot.llm.number_guardrail import find_ungrounded_numbers


def test_rejects_report_when_llm_emits_number_absent_from_backend_input() -> None:
    # 23 was never computed; it must be flagged as ungrounded.
    facts = [78.0, 31.5]
    ungrounded = find_ungrounded_numbers("Your portfolio fell 23% last year.", facts)
    assert "23%" in ungrounded or "23" in [u.replace("%", "") for u in ungrounded]


def test_accepts_report_when_every_number_traces_to_engine_output() -> None:
    facts = [78.0, 31.5, 64.0]
    text = "Risk score 78/100; volatility 31.5%; tech is 64% of holdings."
    assert find_ungrounded_numbers(text, facts) == []


def test_accepts_rounded_grounded_number_within_epsilon() -> None:
    # fact is 31.5; model says "about 32%" — within rounding, must pass.
    facts = [31.5]
    assert find_ungrounded_numbers("Volatility is about 32%.", facts) == []


def test_passes_benign_small_count_not_in_facts() -> None:
    # "3 largest" — 3 is a safe count, not a portfolio fact; must not be flagged.
    facts = [78.0]
    assert find_ungrounded_numbers("Your 3 largest holdings drive the risk.", facts) == []


def test_flags_wrong_transcription_of_a_real_fact() -> None:
    # fact 78; model writes 87 (transposed) — a real, dangerous hallucination.
    facts = [78.0, 31.5]
    ungrounded = find_ungrounded_numbers("Your risk score is 87 out of 100.", facts)
    assert any(u.replace("%", "") == "87" for u in ungrounded)
