from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from typing import Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .catalog import Catalog, EvidenceNote

Embed = Callable[[list[str]], list[list[float]]]
RETRIEVAL_VERSION = "research-retrieval-v1"
STOP_WORDS = set("what why how is are the a an and or of to in it its this that stock shares company does do for can i you about me tell explain will be next year current today now la gi cua toi nay va ve co phieu".split())


def normalize(text: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFD", text.lower())
                   if unicodedata.category(char) != "Mn").replace("đ", "d")


def query_boundary(query: str, company_years: set[str]) -> str | None:
    normalized = normalize(query)
    years = re.findall(r"\b20\d{2}\b", normalized)
    if any(year not in company_years for year in years):
        return "unsupported_time"
    if re.search(r"\b(latest|current|today)\b|hien tai|moi nhat|hom nay", normalized):
        return "unsupported_time"
    if re.search(r"current.*price|price.*(today|now|next|future)|share price|price target|buy or sell|should i buy|gia.*(hien tai|hom nay|tuong lai)", normalized):
        return "outside_scope"
    return None


def lexical_rank(notes: list[EvidenceNote], symbol: str, query: str) -> list[tuple[str, int]]:
    normalized = re.sub(r"\brisks\b", "risk", normalize(query))
    terms = {term for term in re.findall(r"[a-z0-9]+", normalized)
             if len(term) > 2 and term not in STOP_WORDS and term != symbol.lower()}
    scored = []
    for note in notes:
        words = set(re.findall(r"[a-z0-9]+", normalize(
            f"{note.title} {note.summary} {note.keywords}")))
        score = len(terms & words)
        if score:
            scored.append((note.id, score))
    return sorted(scored, key=lambda item: -item[1])


class VectorIndex(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: Literal[1] = 1
    corpusVersion: str
    model: str = Field(min_length=1)
    dimensions: int = Field(ge=1, le=16384)
    vectors: dict[str, list[float]]

    @model_validator(mode="after")
    def valid_vectors(self):
        if not self.vectors:
            raise ValueError("Index must contain vectors")
        for vector in self.vectors.values():
            values = np.asarray(vector, dtype=float)
            if len(vector) != self.dimensions or not np.isfinite(values).all() or np.linalg.norm(values) == 0:
                raise ValueError("Vectors must have consistent dimensions and finite, nonzero values")
        return self


class RetrievalResult(BaseModel):
    engine: Literal["python"] = "python"
    strategy: Literal["lexical", "hybrid", "lexical_fallback"] = "lexical"
    retrievalVersion: str = RETRIEVAL_VERSION
    corpusVersion: str
    symbol: str
    evidenceIds: list[str] = Field(default_factory=list)
    abstentionReason: str | None = None
    fallbackReason: str | None = None


def build_index(catalog: Catalog, model: str, embed: Embed) -> VectorIndex:
    notes = [note for company in catalog.companies for note in company.evidence]
    vectors = embed([f"{note.title}\n{note.summary}\n{note.section}\n{note.period}" for note in notes])
    if len(vectors) != len(notes):
        raise ValueError("Embedding result count does not match catalogue")
    return VectorIndex(corpusVersion=catalog.version, model=model,
                       dimensions=len(vectors[0]), vectors=dict(zip((n.id for n in notes), vectors)))


def retrieve(catalog: Catalog, symbol: str, query: str, *, semantic: bool = False,
             index: VectorIndex | None = None, model: str = "", embed: Embed | None = None,
             min_similarity: float = 0.35) -> RetrievalResult:
    company = catalog.company(symbol)
    if company is None:
        raise KeyError("unknown_company")
    result = RetrievalResult(corpusVersion=catalog.version, symbol=company.symbol)
    boundary = query_boundary(query, {str(note.periodEnd.year) for note in company.evidence})
    if boundary:
        result.abstentionReason = boundary
        return result
    lexical = lexical_rank(company.evidence, company.symbol, query)
    result.evidenceIds = [item[0] for item in lexical[:3]]
    if semantic:
        result.strategy = "lexical_fallback"
        expected_ids = {note.id for item in catalog.companies for note in item.evidence}
        if index is None:
            result.fallbackReason = "index_unavailable"
        elif index.corpusVersion != catalog.version or set(index.vectors) != expected_ids:
            result.fallbackReason = "stale_index"
        elif index.model != model:
            result.fallbackReason = "incompatible_model"
        elif embed is None:
            result.fallbackReason = "semantic_not_configured"
        else:
            try:
                vector = np.asarray(embed([query])[0], dtype=float)
                if vector.shape != (index.dimensions,) or not np.isfinite(vector).all() or np.linalg.norm(vector) == 0:
                    raise ValueError("Invalid query embedding")
                similarities = []
                for note in company.evidence:
                    candidate = np.asarray(index.vectors[note.id], dtype=float)
                    score = float(np.dot(candidate, vector) / (np.linalg.norm(candidate) * np.linalg.norm(vector)))
                    if score >= min_similarity:
                        similarities.append((note.id, score))
                similarities.sort(key=lambda item: -item[1])
                # Reciprocal-rank fusion combines ranks, not incomparable raw
                # lexical/cosine scores. 60 is a fixed ranking constant, not confidence.
                fused: dict[str, float] = {}
                for ranking in [lexical, similarities]:
                    for rank, (note_id, _) in enumerate(ranking, 1):
                        fused[note_id] = fused.get(note_id, 0) + 1 / (60 + rank)
                result.evidenceIds = sorted(fused, key=lambda key: -fused[key])[:3]
                result.strategy = "hybrid"
            except Exception:
                result.fallbackReason = "embedding_unavailable"
    if not result.evidenceIds:
        result.abstentionReason = "no_matching_notes"
    return result
