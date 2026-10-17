"""Small authored diagnostic set. This is not an independent quality benchmark."""
from __future__ import annotations

import json
from importlib.resources import files

from .catalog import Catalog
from .retrieval import RETRIEVAL_VERSION, retrieve


def evaluate(catalog: Catalog) -> dict:
    cases = json.loads(files(__package__).joinpath("data/eval_cases.json").read_text())
    known = {note.id for company in catalog.companies for note in company.evidence}
    rows = []
    categories = {}
    for case in cases:
        if not set(case["expectedIds"]) <= known:
            raise ValueError("Evaluation references an unknown source note")
        result = retrieve(catalog, case["symbol"], case["query"])
        expected = set(case["expectedIds"])
        passed = bool(expected & set(result.evidenceIds)) if expected else not result.evidenceIds
        category = categories.setdefault(case["category"], {"total": 0, "passed": 0})
        category["total"] += 1
        category["passed"] += int(passed)
        rows.append({**case, "retrievedIds": result.evidenceIds, "passed": passed,
                     "abstentionReason": result.abstentionReason})
    return {"corpusVersion": catalog.version, "retrievalVersion": RETRIEVAL_VERSION,
            "strategy": "lexical", "caseCount": len(rows), "categories": categories,
            "definition": "Answerable: at least one expected note in top 3. Other: zero retrieved notes. No generation scoring.",
            "limitation": "30 manually authored development cases; not user interviews or an independent held-out benchmark. Semantic provider not evaluated.",
            "cases": rows}
