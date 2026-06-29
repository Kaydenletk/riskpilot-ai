# Compliance & Safety Design

RiskPilot AI is built to demonstrate that an AI finance tool can be **reliable and
safe by design**. This document is part of the product, not an afterthought — the
safety controls are engineered, testable, and visible in the UI.

## Positioning: coaching, not advice

RiskPilot AI provides **educational risk coaching**, not personalized investment
advice. It does not, and will not:

- recommend buying or selling any security ("buy this" / "sell that");
- predict prices or returns;
- act as or hold itself out as a registered investment adviser.

It describes the **risk characteristics** of a portfolio (concentration, volatility,
sector tilt) and asks **review questions** — never imperatives. This keeps it clear of
the investment-adviser framing under SEC/FINRA rules, which centers on giving advice
about *buying or selling* securities for compensation.

## Safety controls (engineered, not promised)

| Control | How it's enforced |
|---------|-------------------|
| **Numbers are computed, never generated** | All figures come from `risk_engine/` (deterministic). An import-lint test proves it never imports the LLM. |
| **The LLM can't invent figures** | `llm/number_guardrail.py` rejects any number in the explanation prose that isn't backed by the computed facts; on repeat violation it fails closed to a deterministic template. |
| **No buy/sell language** | The review checklist is phrased as questions; an API test asserts every item ends in a question mark. |
| **No real user data** | v1 uses an illustrative, static sample portfolio. No accounts, no PII, no live personalized advice. |
| **Visible disclaimer** | Shown in the UI footer and next to the AI explanation, not just in docs. |

## Data

v1 uses **illustrative sample data**, not live market data, clearly labeled "as of"
in the UI. When real historical data is added (M2), it will be a static, license-clean
dataset with the source and retrieval date recorded in `DATA_SOURCE.md`.

## Limitations

Risk metrics are estimates from historical sample data and may not reflect current
conditions. This tool is for education and demonstration only.
