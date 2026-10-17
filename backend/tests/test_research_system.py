from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from riskpilot.main import app
from riskpilot.research.catalog import Catalog, load_catalog
from riskpilot.research.retrieval import build_index, retrieve


def test_catalog_version_is_content_addressed_and_frontend_snapshot_matches():
    catalog = load_catalog()
    changed = catalog.model_dump(mode="json")
    changed["companies"][0]["evidence"][0]["summary"] += " Updated note."
    assert Catalog.model_validate(changed).version != catalog.version
    frontend = Path(__file__).resolve().parents[2] / "frontend/src/lib/research/companies.json"
    snapshot = json.loads(frontend.read_text())
    assert snapshot["corpusVersion"] == catalog.version
    assert snapshot["companies"] == catalog.model_dump(mode="json")["companies"]


def test_catalog_rejects_duplicates_cross_company_ids_and_invalid_source_metadata():
    valid = load_catalog().model_dump(mode="json")
    duplicate = deepcopy(valid)
    duplicate["companies"][0]["evidence"].append(duplicate["companies"][0]["evidence"][0])
    wrong_company = deepcopy(valid)
    wrong_company["companies"][0]["evidence"][0]["id"] = "msft-wrong"
    unsafe = deepcopy(valid)
    unsafe["companies"][0]["evidence"][0]["url"] = "http://localhost/private"
    bad_date = deepcopy(valid)
    bad_date["companies"][0]["evidence"][0]["publishedAt"] = "2024-01-01"
    for invalid in [duplicate, wrong_company, unsafe, bad_date]:
        with pytest.raises(ValidationError):
            Catalog.model_validate(invalid)


def test_lexical_retrieval_has_company_time_and_abstention_boundaries():
    catalog = load_catalog()
    result = retrieve(catalog, "NVDA", "export restrictions China")
    assert result.evidenceIds[0] == "nvda-export"
    assert result.strategy == "lexical"
    assert result.corpusVersion == catalog.version
    assert all(item.startswith("nvda-") for item in result.evidenceIds)
    assert retrieve(catalog, "NVDA", "What are the risks?").evidenceIds
    assert retrieve(catalog, "NVDA", "Rủi ro xuất khẩu sang Trung Quốc?").evidenceIds[0] == "nvda-export"
    assert retrieve(catalog, "NVDA", "current stock price").abstentionReason == "unsupported_time"
    assert retrieve(catalog, "NVDA", "revenue in 2026").abstentionReason == "unsupported_time"
    assert retrieve(catalog, "NVDA", "banana recipe").abstentionReason == "no_matching_notes"


def test_semantic_index_rejects_changed_content_and_model_without_using_provider():
    catalog = load_catalog()
    index = build_index(catalog, "test-model", lambda texts: [[1.0, 0.0] for _ in texts])
    index.corpusVersion = "old-version"
    calls = []
    result = retrieve(catalog, "NVDA", "export restrictions", semantic=True, index=index,
                      model="test-model", embed=lambda texts: calls.append(texts) or [[1.0, 0.0]])
    assert result.strategy == "lexical_fallback"
    assert result.fallbackReason == "stale_index"
    assert calls == []
    index.corpusVersion = catalog.version
    result = retrieve(catalog, "NVDA", "export restrictions", semantic=True, index=index,
                      model="different-model", embed=lambda texts: calls.append(texts) or [[1.0, 0.0]])
    assert result.fallbackReason == "incompatible_model"
    assert calls == []


def test_semantic_search_filters_company_and_falls_back_on_provider_failure():
    catalog = load_catalog()
    index = build_index(catalog, "test-model", lambda texts: [[1.0, 0.0] for _ in texts])
    result = retrieve(catalog, "NVDA", "dependence on overseas production", semantic=True,
                      index=index, model="test-model", embed=lambda texts: [[1.0, 0.0]])
    assert result.strategy == "hybrid"
    assert all(item.startswith("nvda-") for item in result.evidenceIds)

    def fail(texts):
        raise TimeoutError("provider timed out")

    result = retrieve(catalog, "NVDA", "export restrictions", semantic=True,
                      index=index, model="test-model", embed=fail)
    assert result.strategy == "lexical_fallback"
    assert result.evidenceIds[0] == "nvda-export"
    assert result.fallbackReason == "embedding_unavailable"


def test_research_api_is_private_validated_and_versioned(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-research-secret")
    client = TestClient(app)
    request = {"symbol": "NVDA", "query": "export restrictions", "semantic": False}
    assert client.post("/research/search", json=request).status_code == 401
    headers = {"x-internal-secret": "test-research-secret"}
    response = client.post("/research/search", json=request, headers=headers)
    assert response.status_code == 200
    assert response.json()["corpusVersion"] == load_catalog().version
    assert response.json()["engine"] == "python"
    assert client.post("/research/search", json={**request, "symbol": "UNKNOWN"}, headers=headers).status_code == 404
    assert client.post("/research/search", json={**request, "thesis": "private"}, headers=headers).status_code == 422
    assert client.get("/research/catalog", headers=headers).json()["noteCount"] == 12


def test_evaluation_is_reproducible_and_exposes_diagnostic_failures():
    from riskpilot.research.evaluation import evaluate
    report = evaluate(load_catalog())
    assert report == evaluate(load_catalog())
    assert report["caseCount"] == 30
    assert {key: value["total"] for key, value in report["categories"].items()} == {
        "direct": 10, "paraphrase": 10, "out_of_scope": 5, "unanswerable": 5,
    }
    assert any(not case["passed"] for case in report["cases"])


def test_optional_index_rejects_malformed_vectors_and_cli_never_calls_provider_by_default(monkeypatch, capsys):
    import sys
    from riskpilot.research.cli import main
    from riskpilot.research.retrieval import VectorIndex
    for vector in [[0.0, 0.0], [float("nan"), 1.0], [1.0]]:
        with pytest.raises(ValidationError):
            VectorIndex(corpusVersion="test", model="test", dimensions=2, vectors={"test": vector})
    monkeypatch.setattr(sys, "argv", ["cli", "index"])
    with pytest.raises(SystemExit) as error:
        main()
    assert error.value.code == 2
    assert "--with-embeddings" in capsys.readouterr().err


@pytest.mark.parametrize("query", ["GPU price now", "What is the stock price now after Data Center growth?",
                                   "price today demand", "price next year revenue"])
def test_price_boundary_matches_offline_behavior(query):
    result = retrieve(load_catalog(), "NVDA", query)
    assert result.evidenceIds == []
    assert result.abstentionReason in {"unsupported_time", "outside_scope"}


def test_semantic_api_requires_opt_in_configuration_and_fresh_index(monkeypatch, tmp_path):
    from riskpilot.research import api
    catalog = load_catalog()
    index = build_index(catalog, "test-model", lambda texts: [[1.0, 0.0] for _ in texts])
    path = tmp_path / "index.json"
    path.write_text(index.model_dump_json())
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-research-secret")
    monkeypatch.setenv("RESEARCH_INDEX_PATH", str(path))
    monkeypatch.setenv("RESEARCH_EMBEDDING_MODEL", "test-model")
    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-real-key")
    calls = []
    monkeypatch.setattr(api, "embedding_provider", lambda key, model: lambda texts: calls.append(texts) or [[1.0, 0.0]])
    client = TestClient(app)
    headers = {"x-internal-secret": "test-research-secret"}
    request = {"symbol": "NVDA", "query": "export restrictions", "semantic": True}
    monkeypatch.setenv("RESEARCH_SEMANTIC_ENABLED", "0")
    assert client.post("/research/search", json=request, headers=headers).json()["strategy"] == "lexical_fallback"
    monkeypatch.setenv("RESEARCH_SEMANTIC_ENABLED", "1")
    assert client.post("/research/search", json={**request, "semantic": False}, headers=headers).json()["strategy"] == "lexical"
    index.corpusVersion = "stale"
    path.write_text(index.model_dump_json())
    assert client.post("/research/search", json=request, headers=headers).json()["fallbackReason"] == "stale_index"
    assert calls == []
    index.corpusVersion = catalog.version
    path.write_text(index.model_dump_json())
    assert client.post("/research/search", json=request, headers=headers).json()["strategy"] == "hybrid"
    assert calls == [["export restrictions"]]


def test_chart_facts_reconcile_with_report_totals_and_reject_bad_inputs():
    catalog = load_catalog()
    for company in catalog.companies:
        facts = company.financials
        assert facts is not None
        assert sum(row.amount for row in facts.revenueMix) == facts.revenueHistory[-1].amount
        assert facts.revenueHistory[-1].year == company.evidence[0].periodEnd.year
    valid = catalog.model_dump(mode="json")
    bad_sum = deepcopy(valid)
    bad_sum["companies"][0]["financials"]["revenueMix"][0]["amount"] += 1
    bad_order = deepcopy(valid)
    bad_order["companies"][0]["financials"]["revenueHistory"].reverse()
    bad_period = deepcopy(valid)
    bad_period["companies"][0]["financials"]["revenueHistory"][-1]["year"] = 2026
    bad_label = deepcopy(valid)
    bad_label["companies"][0]["financials"]["revenueMix"][1]["id"] = bad_label["companies"][0]["financials"]["revenueMix"][0]["id"]
    for invalid in [bad_sum, bad_order, bad_period, bad_label]:
        with pytest.raises(ValidationError):
            Catalog.model_validate(invalid)


def test_chart_schema_rejects_more_years_or_categories_than_the_ui_can_show():
    valid = load_catalog().model_dump(mode="json")
    extra_year = deepcopy(valid)
    extra_year["companies"][0]["financials"]["revenueHistory"].insert(0, {"year": 2022, "amount": 1000})
    extra_category = deepcopy(valid)
    mix = extra_category["companies"][0]["financials"]["revenueMix"]
    mix[-1]["amount"] -= 1
    mix.append({"id": "fourth", "label": "Fourth", "explanation": "A fourth category", "amount": 1})
    for invalid in [extra_year, extra_category]:
        with pytest.raises(ValidationError):
            Catalog.model_validate(invalid)
