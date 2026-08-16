"""POST /report with weighted input: full pipeline (math -> LLM -> guardrail)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from riskpilot.main import app

client = TestClient(app)
SECRET = "dev-local-secret-change-me"
HEADERS = {"x-internal-secret": SECRET}

VALID_WEIGHTED = {"weighted": [
    {"ticker": "NVDA", "weight_pct": 50},
    {"ticker": "KO", "weight_pct": 30},
    {"ticker": "JNJ", "weight_pct": 20},
]}

KNOWN_SOURCES = {"model", "model_regenerated", "template_fallback", "demo_fixture"}


def test_weighted_returns_full_report():
    res = client.post("/report", json=VALID_WEIGHTED, headers=HEADERS)
    assert res.status_code == 200
    body = res.json()
    assert body["portfolio_name"] == "Your portfolio"
    assert "synthetic illustrative" in body["as_of"]
    assert body["explanation"]["source"] in KNOWN_SOURCES
    assert body["facts"]["risk_score"] > 0


def test_shares_path_still_works():
    # mirrors test_post_report_scores_known_holdings in test_api.py
    res = client.post(
        "/report",
        headers=HEADERS,
        json={"holdings": [{"ticker": "NVDA", "shares": 40, "sector": "x", "market_value": 1},
                           {"ticker": "KO", "shares": 30, "sector": "x", "market_value": 1}]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["facts"]["holdings_count"] == 2
    assert "not financial advice" in body["disclaimer"].lower()


def test_both_inputs_rejected():
    res = client.post(
        "/report",
        json={
            **VALID_WEIGHTED,
            "holdings": [{"ticker": "NVDA", "shares": 40, "sector": "x", "market_value": 1}],
        },
        headers=HEADERS,
    )
    assert res.status_code == 400


def test_neither_input_rejected():
    res = client.post("/report", json={}, headers=HEADERS)
    assert res.status_code == 400


def test_weighted_bad_sum_400():
    res = client.post("/report", json={"weighted": [
        {"ticker": "NVDA", "weight_pct": 50},
        {"ticker": "KO", "weight_pct": 20},
    ]}, headers=HEADERS)
    assert res.status_code == 400


def test_weighted_unknown_ticker_422():
    res = client.post("/report", json={"weighted": [
        {"ticker": "ZZZZ", "weight_pct": 50},
        {"ticker": "KO", "weight_pct": 50},
    ]}, headers=HEADERS)
    assert res.status_code == 422
    assert res.json()["detail"]["symbols"] == ["ZZZZ"]
