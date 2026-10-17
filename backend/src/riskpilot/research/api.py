from __future__ import annotations

import os
import threading
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .catalog import load_catalog
from .provider import embedding_provider
from .retrieval import VectorIndex, retrieve


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(min_length=1, max_length=10)
    query: str = Field(min_length=3, max_length=500, strict=True)
    semantic: bool = False


# Per-process demo guard; distributed deployments require a shared limiter.
_lock = threading.Lock()
_slots = threading.BoundedSemaphore(2)
_window: list[float] = []


def create_research_router(require_secret):
    router = APIRouter(prefix="/research", dependencies=[Depends(require_secret)])

    @router.get("/catalog")
    def catalog_metadata():
        catalog = load_catalog()
        return {"corpusVersion": catalog.version, "schemaVersion": 1,
                "symbols": [company.symbol for company in catalog.companies],
                "noteCount": sum(len(company.evidence) for company in catalog.companies),
                "contentKind": "curated_summary"}

    @router.post("/search")
    def search(request: SearchRequest):
        catalog = load_catalog()
        if catalog.company(request.symbol) is None:
            raise HTTPException(404, "unknown_company")
        # Validation and scope checks occur before any provider work.
        baseline = retrieve(catalog, request.symbol, request.query)
        if not request.semantic or baseline.abstentionReason in {"unsupported_time", "outside_scope"}:
            return baseline
        model = os.getenv("RESEARCH_EMBEDDING_MODEL", "").strip()
        key = os.getenv("OPENAI_API_KEY", "").strip()
        index = None
        try:
            path = Path(os.getenv("RESEARCH_INDEX_PATH", ".research/index.json"))
            index = VectorIndex.model_validate_json(path.read_text())
        except (OSError, ValueError):
            pass
        enabled = os.getenv("RESEARCH_SEMANTIC_ENABLED") == "1" and bool(model and key)
        # A missing/stale index is resolved locally without reserving a paid slot.
        preflight = retrieve(catalog, request.symbol, request.query, semantic=True,
                             index=index, model=model)
        if not enabled or preflight.fallbackReason != "semantic_not_configured":
            return preflight
        with _lock:
            now = time.monotonic()
            _window[:] = [stamp for stamp in _window if now - stamp < 60]
            if len(_window) >= 10 or not _slots.acquire(blocking=False):
                baseline.strategy = "lexical_fallback"
                baseline.fallbackReason = "semantic_busy"
                return baseline
            _window.append(now)
        try:
            return retrieve(catalog, request.symbol, request.query, semantic=True,
                            index=index, model=model, embed=embedding_provider(key, model))
        finally:
            _slots.release()

    return router
