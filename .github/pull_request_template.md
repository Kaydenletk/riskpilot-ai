## What this changes

<!-- One or two sentences. Link any issue: Closes #123 -->

## Checklist

- [ ] `make test` is green (backend suite runs with no OpenAI key)
- [ ] `make eval` still reports its reliability number (if the guardrail/LLM changed)
- [ ] `cd frontend && npm run build` builds clean (if frontend changed)
- [ ] `risk_engine/` has no LLM imports (the import-lint test passes)
- [ ] No buy/sell recommendations added (risk coaching only)
- [ ] Math changes include a hand-verified unit test
- [ ] Docs updated if behavior changed

## Notes for reviewers

<!-- Anything non-obvious, tradeoffs, or follow-ups. -->
