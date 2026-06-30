# Contributing to RiskPilot AI

Thanks for your interest. RiskPilot AI is an open project demonstrating a
**reliable, guardrailed LLM pipeline** over deterministic financial math.
Contributions that strengthen that thesis — better math, tighter guardrails,
more eval coverage, cleaner DX — are very welcome.

## Ground rules (the things that make this project what it is)

1. **`risk_engine/` stays LLM-free.** All numbers are computed deterministically.
   `backend/tests/test_no_llm_in_engine.py` enforces this — a PR that imports an
   LLM into `risk_engine/` will fail CI. This separation is the whole point.
2. **The LLM never invents numbers.** Any number in model output must trace to a
   computed fact. Changes to `llm/number_guardrail.py` must keep its tests green
   and ideally add new cases.
3. **Not financial advice.** No feature may emit buy/sell recommendations. Risk
   coaching only — review questions, never imperatives. See `COMPLIANCE.md`.
4. **Math changes need hand-verified tests.** New or changed formulas must include
   a unit test checked against a value computed by hand or a constructed fixture
   (see `backend/tests/test_metrics.py` for the pattern).

## Getting set up

```bash
git clone https://github.com/Kaydenletk/riskpilot-ai
cd riskpilot-ai
cp .env.example .env      # runs in DEMO_MODE — no OpenAI key needed
make doctor               # checks versions + env
make install
make dev                  # backend :8000 + frontend :3000
```

## Before you open a PR

```bash
make test                 # backend suite — must be green (runs with NO key)
make eval                 # LLM-reliability eval — should stay at its reported number
cd frontend && npm run build   # frontend must build clean
```

- Keep PRs focused — one logical change.
- Match the existing style. Python: ruff-clean, type hints on public functions.
  TypeScript: explicit types on exports, no `any`.
- Update docs when behavior changes (`README.md`, `COMPLIANCE.md`, `docs/RELIABILITY.md`).
- If you change the risk score or a formula, say so clearly — it changes the
  numbers users see.

## Good first contributions

- Add eval cases to `backend/src/riskpilot/eval/run.py` (more hallucination patterns).
- Make the `/100` scale-constant handling in the guardrail denominator-aware
  (see the M2 note in `docs/RELIABILITY.md`).
- Add beta + a hypothetical-shock drawdown alongside the historical one.
- Replace the synthetic dataset with a license-clean real one (see `DATA_SOURCE.md`).
- Build out the radial-gauge dashboard (the design direction is Swiss/instrument).

## Reporting bugs / ideas

Open an issue using the templates. For a security issue (e.g. a way to make the
LLM emit an ungrounded number), please describe how to reproduce it — that's a
guardrail bug and exactly the kind we want to fix.

## Code of Conduct

Be kind and constructive. See `CODE_OF_CONDUCT.md`.
