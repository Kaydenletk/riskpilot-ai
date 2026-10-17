"""Optional provider boundary. Never called by catalogue export or lexical search."""
from __future__ import annotations

from openai import OpenAI


def embedding_provider(api_key: str, model: str):
    def embed(texts: list[str]) -> list[list[float]]:
        client = OpenAI(api_key=api_key, timeout=8.0, max_retries=0)
        response = client.embeddings.create(model=model, input=texts)
        return [row.embedding for row in sorted(response.data, key=lambda row: row.index)]
    return embed
