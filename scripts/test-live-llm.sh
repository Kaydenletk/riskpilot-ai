#!/usr/bin/env bash
# Test the REAL OpenAI call end-to-end. Run this yourself so your key never
# touches the chat or gets written to disk by anyone but you.
#
# Usage:
#   OPENAI_API_KEY=sk-... ./scripts/test-live-llm.sh
# or, if you already saved it in .env.local:
#   ./scripts/test-live-llm.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env.local if present (so a key saved there is picked up).
if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "No OPENAI_API_KEY found."
  echo "Either: OPENAI_API_KEY=sk-... ./scripts/test-live-llm.sh"
  echo "Or: add it to .env.local (line OPENAI_API_KEY=...) and re-run."
  exit 1
fi

# Force live mode for this run only.
export DEMO_MODE=0
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-5.5}"

cd backend
. .venv/bin/activate 2>/dev/null || { echo "run 'make install' first"; exit 1; }

echo "Calling OpenAI ($OPENAI_MODEL) through the guardrail pipeline..."
python - <<'PY'
from riskpilot.config import load_config
from riskpilot.report import build_sample_report

cfg = load_config()
print(f"live_llm={cfg.has_live_llm} model={cfg.openai_model}")
report = build_sample_report(cfg)
e = report.explanation
print(f"\nsource: {e.source.value}")
print(f"\nsummary:\n  {e.summary}")
print("\ntop risk factors:")
for f in e.top_risk_factors:
    print(f"  - {f}")
print("\nreview checklist:")
for q in e.review_checklist:
    print(f"  - {q}")
print(f"\n(source=model means the LLM wrote it and every number passed the "
      f"guardrail; model_regenerated means it hallucinated once then fixed it; "
      f"template_fallback means it failed twice and fell back to safe text.)")
PY
