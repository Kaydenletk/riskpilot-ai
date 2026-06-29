# Private Python math+LLM service. Deploys to Render/Fly.
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
CMD ["sh", "-c", "uvicorn riskpilot.main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}"]
