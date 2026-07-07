# LLM Reliability

The headline engineering claim: **the LLM never ships a number it made up.**

## The failure mode this defends against

OpenAI Structured Outputs guarantees the JSON *shape* — but not that the values are
correct, and it does not constrain free text. The realistic, dangerous hallucination
is a wrong number inside a prose field: _"your portfolio fell 23%"_ when 23 was never
computed. That's what [`number_guardrail.py`](../backend/src/riskpilot/llm/number_guardrail.py)
catches.

## How the guardrail works

1. Build an **allow-set** of every legitimate string rendering of each true fact
   (raw, rounded 0/1/2 dp, with/without `%` and `$`, thousands separators).
2. Extract every numeric token from the explanation prose.
3. A token is **grounded** if it matches the allow-set, OR is within a small relative
   epsilon of a true fact (absorbs the model's own rounding), OR is a safe count
   ("3 stocks").
4. Any ungrounded token = a hallucination. The pipeline **regenerates once** with a
   corrective message, then **fails closed** to a deterministic template explanation.
   The response carries `explanation_source: model | model_regenerated | template_fallback`.

## Reproduce the number

```bash
make eval     # runs over committed fixtures — NO OpenAI key required
```

The eval reports the **catch rate** (raw generations the guardrail flagged) and the
**post-validation hallucination rate** (ungrounded numbers in *final delivered*
reports — the headline, which should be 0 because of the fail-closed fallback).

## M1 number

`make eval` over the committed fixture set:

```
catch_rate_pct: 100.0   (7 of 7 injected hallucinations caught)
```

The eval distinguishes a hallucinated score ("95 out of 100" — flagged) from the
legitimate scale denominator ("100" — allowed), which is the kind of edge the
strict-vs-loose grounding decision has to get right.

> **M1 status:** guardrail core, tests (9 passing), and eval harness are live and
> green. **M2** swaps the fixture eval for the live OpenAI pipeline run R times over
> K portfolios, and reports the post-validation hallucination rate (the headline,
> ~0 by construction via fail-closed fallback). The `/100` scale-constant allow is
> currently a blanket allow; M2 should make it contextual (denominator-aware) so the
> model can't pass "you lost 100%" ungrounded.
