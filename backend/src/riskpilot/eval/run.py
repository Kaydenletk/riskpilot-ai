"""Eval harness (M1 skeleton).

The real harness (M2) runs the full live pipeline R times over K portfolios and
reports the headline reliability numbers. M1 proves the wiring on fixtures, with
NO key required, so CI and reviewers can run `make eval` for free.

M1 metric: over a set of canned explanations (some grounded, some with an
injected hallucination), the guardrail's catch rate. With the fixture set this
should be 100% caught -> the README can cite a real number once is_grounded lands.
"""

from __future__ import annotations

import json

from ..llm.number_guardrail import find_ungrounded_numbers

# (explanation prose, fact_values, should_be_caught)
_CASES = [
    ("Top 3 holdings are 78% of the portfolio; volatility is 31.5%.", [78.0, 31.5], False),
    ("Your portfolio fell 23% in the last drawdown.", [78.0, 31.5], True),
    ("Technology is 64% of holdings across your 5 positions.", [64.0, 5.0], False),
    ("Risk score is 95 out of 100.", [78.0], True),
    # Rounded restatement cases (grounded and ungrounded)
    ("The annualized volatility of your portfolio is about ~24%.", [24.3], False),
    ("The annualized volatility of your portfolio is about ~20%.", [24.3], True),
    # Fabricated dollar figures
    ("You have an uninvested cash balance of $1,250.", [78.0, 31.5], True),
    # Percentages the engine never produced
    ("Your portfolio returned 45% over the past year.", [78.0, 31.5], True),
    # Numbers embedded in checklist questions (grounded and ungrounded)
    ("Did you confirm the $1,234 invoice?", [78.0, 31.5], True),
    ("Did you confirm the risk score is 78?", [78.0], False),
    # Locale-formatted numbers — currently caught, but ONLY because the regex
    # fails to parse ",90" as a decimal/thousands separator and truncates the
    # match to "5.678". This is a false-positive-by-accident, not real locale
    # support. See issue #2 (or follow-up issue on European formats) — guardrail 
    # should be fixed to either properly parse European formats or explicitly reject them.
    ("The cash buffer is €5.678,90.", [1234.5], True),
]


def main() -> None:
    total_hallucinated = sum(1 for *_, caught in _CASES if caught)
    caught = 0
    try:
        for prose, facts, should_catch in _CASES:
            flagged = bool(find_ungrounded_numbers(prose, facts))
            if should_catch and flagged:
                caught += 1
        rate = 100.0 * caught / total_hallucinated if total_hallucinated else 0.0
        result = {
            "cases": len(_CASES),
            "hallucinated_cases": total_hallucinated,
            "caught": caught,
            "catch_rate_pct": round(rate, 1),
        }
    except NotImplementedError:
        result = {"status": "is_grounded not implemented yet — fill it in, then re-run."}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
