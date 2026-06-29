# RiskPilot AI — one-command developer entrypoints.
# Goal: git clone && cp .env.example .env && make dev  ->  running in < 5 min, no key.

.DEFAULT_GOAL := help
.PHONY: help dev dev-backend dev-frontend install test eval seed doctor build clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install backend + frontend deps
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	cd frontend && npm install

dev: ## Run backend + frontend together (no OpenAI key needed)
	@echo "Starting RiskPilot AI in DEMO_MODE (no OpenAI key needed)..."
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend: ## Run the private Python math+LLM service
	cd backend && . .venv/bin/activate && \
		uvicorn riskpilot.main:app --reload --port $${BACKEND_PORT:-8000}

dev-frontend: ## Run the public Next.js app
	cd frontend && npm run dev

test: ## Run the test suite (NO OpenAI key required — uses fixtures)
	cd backend && . .venv/bin/activate && pytest -q

eval: ## Run the LLM-reliability eval harness (stub: prints fixture-based numbers)
	cd backend && . .venv/bin/activate && python -m riskpilot.eval.run

seed: ## (M2) load the sample portfolio dataset — placeholder in M1
	@echo "M1: sample portfolio is the committed fixture. seed lands in M2."

doctor: ## Preflight: check versions + required env, print actionable fixes
	@bash scripts/doctor.sh

build: ## Production build of the frontend
	cd frontend && npm run build

clean: ## Remove build artifacts and caches
	rm -rf backend/.venv backend/.pytest_cache backend/.ruff_cache \
		frontend/node_modules frontend/.next
