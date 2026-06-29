#!/usr/bin/env bash
# make doctor — preflight checks with actionable fixes. Never fails silently.
set -uo pipefail

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
err()  { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=1; }

FAIL=0
echo "RiskPilot AI — preflight (make doctor)"
echo

# Python 3.11+
if command -v python3 >/dev/null 2>&1; then
  PYV=$(python3 -c 'import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  if python3 -c 'import sys;exit(0 if sys.version_info>=(3,11) else 1)'; then
    ok "Python $PYV"
  else
    err "Python $PYV found, need >= 3.11. Fix: install Python 3.11+ (pyenv install 3.11)."
  fi
else
  err "python3 not found. Fix: install Python 3.11+."
fi

# Node 20+
if command -v node >/dev/null 2>&1; then
  NODEV=$(node -v | sed 's/v//')
  NODE_MAJOR=${NODEV%%.*}
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    ok "Node $NODEV"
  else
    err "Node $NODEV found, need >= 20. Fix: nvm install 20 (see .nvmrc)."
  fi
else
  err "node not found. Fix: install Node 20+ (nvm install 20)."
fi

# .env
if [ -f .env ]; then
  ok ".env present"
  # shellcheck disable=SC1091
  set -a; . ./.env 2>/dev/null; set +a
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    warn "OPENAI_API_KEY unset -> running in DEMO_MODE (cached fixture reports). This is fine."
  else
    ok "OPENAI_API_KEY set -> live LLM available (set DEMO_MODE=0 to use it)."
  fi
  if [ "${INTERNAL_SHARED_SECRET:-}" = "dev-local-secret-change-me" ]; then
    warn "INTERNAL_SHARED_SECRET is the default. Fine for local; change before deploy."
  fi
else
  warn ".env missing. Fix: cp .env.example .env  (defaults run with no key)."
fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf "\033[32mAll required checks passed.\033[0m  Next: make install && make dev\n"
else
  printf "\033[31mSome required checks failed — fix the ✗ lines above.\033[0m\n"
  exit 1
fi
