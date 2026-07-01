# Private Python math+LLM service. Deploys to Railway (any Dockerfile host works).
FROM python:3.11-slim

WORKDIR /app

# Deps first for layer caching.
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir -e .

ENV DEMO_MODE=1 \
    BACKEND_PORT=8000

EXPOSE 8000

# DEMO_MODE default-on: the container runs with no OpenAI key.
# Railway injects $PORT; docker-compose sets BACKEND_PORT (no PORT). Prefer
# $PORT so the Railway healthcheck can reach us; fall back for compose/local.
CMD ["sh", "-c", "uvicorn riskpilot.main:app --host 0.0.0.0 --port ${PORT:-${BACKEND_PORT:-8000}}"]
