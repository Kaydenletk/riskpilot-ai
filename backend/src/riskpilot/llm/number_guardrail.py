"""Number-hallucination guardrail — THE headline artifact.

Problem it solves: OpenAI Structured Outputs guarantees the JSON *shape*, but it
does NOT stop the model writing a wrong number inside a free-text field
("your portfolio fell 23%" when 23 was never computed). This module catches that.

How:
  1. From the deterministic facts, build an ALLOW-SET of every legitimate string
     rendering of each true number (raw, rounded 0/1/2 dp, with/without % and $,
     thousands separators).
  2. Extract every numeric token from the LLM prose.
  3. A token is GROUNDED if it matches the allow-set exactly OR is within a small
     relative epsilon of a true fact (absorbs the model's own rounding), OR is a
     safe non-portfolio number (small counts like "3 stocks", permitted years).
  4. Any ungrounded token = a hallucinated number. The caller regenerates once,
     then fails closed to the deterministic template.

The grounding decision (`is_grounded`) is where the strict-vs-loose tension lives
and is implemented below.
"""

from __future__ import annotations

import re

# Matches $1,234.50  18.3%  0.62  1,250  23  — capturing the numeric core.
_NUMBER_TOKEN = re.compile(r"[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\$?\d+(?:\.\d+)?%?")

# Counts/ordinals the model may legitimately use that aren't portfolio facts.
# An over-eager guardrail that flags "3 sectors" looks broken in the demo.
_SAFE_SMALL_INTEGERS = set(range(0, 13))  # 0..12: "top 5", "3 stocks", "2 sectors"

# Permitted scale constants: denominators the model uses to express a score,
# not portfolio facts. "78/100", "78 out of 100" — 100 is the scale, not a claim.
_SAFE_SCALE_CONSTANTS = {100}

# Relative epsilon: a prose number within this fraction of a true fact counts as
# the model rounding the same fact (e.g. fact 18.34 -> "about 18%"). Tunable.
EPSILON = 0.01  # 1%


def _normalize(token: str) -> float | None:
    """Strip $ , % and parse to a float. Returns None if not numeric.

    NOTE: % is stripped WITHOUT rescaling — '18%' normalizes to 18.0, matching how
    a percentage fact like volatility_annualized_pct=31.5 is stored (already in
    percent units). Facts are kept in display units so prose and facts compare
    in the same space.
    """
    cleaned = token.replace("$", "").replace(",", "").replace("%", "").strip()
    if cleaned in {"", "+", "-", "."}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _render_allow_set(fact_values: list[float]) -> set[str]:
    """Every legitimate string rendering of each true number."""
    allow: set[str] = set()
    for v in fact_values:
        for r in (v, round(v, 0), round(v, 1), round(v, 2)):
            # int-looking renderings drop the trailing .0
            if float(r).is_integer():
                allow.add(str(int(r)))
            allow.add(f"{r:g}")
    return allow


def extract_numbers(text: str) -> list[str]:
    """Every numeric token in free text, as raw matched strings."""
    return [m.group(0) for m in _NUMBER_TOKEN.finditer(text)]


def is_grounded(token: str, fact_values: list[float], allow_set: set[str]) -> bool:
    """Decide whether one prose numeric token is backed by the computed facts.

    Four checks, cheapest/most-certain first; grounded on the first hit:
      1. Not actually a number we can dispute -> grounded.
      2. Exact string rendering is in the allow-set (covers the model's own
         rounding, since the allow-set holds 0/1/2-dp forms of every fact).
      3. A small whole-number count ("3 stocks") -> grounded (benign, not a fact).
      4. Within a relative epsilon of any fact -> grounded (backstop for
         renderings the allow-set didn't enumerate).
    Otherwise the number is ungrounded = a hallucination.
    """
    value = _normalize(token)
    if value is None:
        return True

    cleaned = token.replace("$", "").replace(",", "").replace("%", "").strip()
    if cleaned in allow_set:
        return True

    if value.is_integer() and int(value) in _SAFE_SMALL_INTEGERS | _SAFE_SCALE_CONSTANTS:
        return True

    for fact in fact_values:
        if fact == 0:
            if abs(value) <= EPSILON:
                return True
        elif abs(value - fact) <= EPSILON * abs(fact):
            return True

    return False


def find_ungrounded_numbers(text: str, fact_values: list[float]) -> list[str]:
    """Return the prose number tokens that are NOT backed by any fact.

    Empty list => the explanation invents no numbers (passes the guardrail).
    """
    allow_set = _render_allow_set(fact_values)
    ungrounded: list[str] = []
    for tok in extract_numbers(text):
        if not is_grounded(tok, fact_values, allow_set):
            ungrounded.append(tok)
    return ungrounded
