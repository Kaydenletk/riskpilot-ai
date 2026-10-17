from __future__ import annotations

import hashlib
import json
from datetime import date
from functools import lru_cache
from importlib.resources import files
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvidenceNote(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z]+-[a-z0-9-]+$")
    topic: Literal["business", "growth", "risk"]
    title: str = Field(min_length=3, max_length=200)
    summary: str = Field(min_length=10, max_length=12000)
    question: str = Field(min_length=3, max_length=500)
    keywords: str = Field(max_length=1000)
    section: str = Field(min_length=3, max_length=200)
    period: str = Field(min_length=3, max_length=100)
    filed: str = Field(min_length=3, max_length=100)
    url: str
    periodEnd: date
    publishedAt: date
    retrievedAt: date
    contentKind: Literal["curated_summary"]

    @model_validator(mode="after")
    def validate_provenance(self):
        url = urlparse(self.url)
        if url.scheme != "https" or url.hostname not in {"www.sec.gov", "www.microsoft.com"}:
            raise ValueError("Only approved public filing hosts are accepted in this catalogue")
        if url.username or url.password or url.port:
            raise ValueError("Source URLs cannot include credentials or custom ports")
        if self.periodEnd > self.publishedAt or self.publishedAt > self.retrievedAt:
            raise ValueError("Source dates must satisfy period end <= publication <= retrieval")
        return self


class AnnualRevenue(BaseModel):
    model_config = ConfigDict(extra="forbid")
    year: int = Field(ge=2000, le=2100)
    amount: int = Field(gt=0, strict=True)


class RevenueCategory(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z-]+$")
    label: str = Field(min_length=1, max_length=60)
    explanation: str = Field(min_length=1, max_length=160)
    amount: int = Field(gt=0, strict=True)


class FinancialSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    unit: Literal["USD_millions"]
    revenueHistory: list[AnnualRevenue] = Field(min_length=3, max_length=3)
    netIncome: int = Field(strict=True)
    revenueMix: list[RevenueCategory] = Field(min_length=2, max_length=3)
    mixBasis: Literal["end_market", "reportable_segment", "product_category"]
    sourceSection: str = Field(min_length=3, max_length=250)

    @model_validator(mode="after")
    def reconcile(self):
        years = [row.year for row in self.revenueHistory]
        if any(right != left + 1 for left, right in zip(years, years[1:])):
            raise ValueError("Revenue history must contain consecutive ascending fiscal years")
        if sum(row.amount for row in self.revenueMix) != self.revenueHistory[-1].amount:
            raise ValueError("Revenue categories must reconcile with the latest annual total")
        if len({row.id for row in self.revenueMix}) != len(self.revenueMix):
            raise ValueError("Revenue category IDs must be unique")
        return self


class Company(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(pattern=r"^[A-Z]{1,10}$")
    name: str = Field(min_length=1, max_length=100)
    monogram: str = Field(min_length=1, max_length=3)
    sector: str = Field(max_length=100)
    description: str = Field(max_length=300)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    source: str = Field(max_length=200)
    period: str = Field(max_length=100)
    evidence: list[EvidenceNote] = Field(min_length=1, max_length=1000)
    financials: FinancialSnapshot | None = None

    @model_validator(mode="after")
    def same_reporting_period(self):
        if self.financials and any(note.periodEnd.year != self.financials.revenueHistory[-1].year
                                   for note in self.evidence):
            raise ValueError("Chart snapshot must match the company source-note reporting year")
        return self


class Catalog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: Literal[1]
    companies: list[Company] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_ids(self):
        if len({company.symbol for company in self.companies}) != len(self.companies):
            raise ValueError("Company symbols must be unique")
        ids = set()
        for company in self.companies:
            for note in company.evidence:
                if note.id in ids or not note.id.startswith(company.symbol.lower() + "-"):
                    raise ValueError("Evidence IDs must be unique and belong to their company")
                ids.add(note.id)
        return self

    @property
    def version(self) -> str:
        encoded = json.dumps(self.model_dump(mode="json"), sort_keys=True, ensure_ascii=False,
                             separators=(",", ":")).encode()
        return "sha256:" + hashlib.sha256(encoded).hexdigest()

    def company(self, symbol: str) -> Company | None:
        return next((company for company in self.companies
                     if company.symbol == symbol.strip().upper()), None)

    def snapshot(self) -> dict:
        return {**self.model_dump(mode="json"), "corpusVersion": self.version}


@lru_cache(maxsize=1)
def load_catalog() -> Catalog:
    return Catalog.model_validate_json(files(__package__).joinpath("data/catalog.json").read_text())


def read_catalog(path: Path) -> Catalog:
    return Catalog.model_validate_json(path.read_text())
