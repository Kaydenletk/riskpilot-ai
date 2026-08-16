"""POST /score: the simulator's fast path. Facts only — the LLM never runs here."""

from __future__ import annotations

from fastapi.testclient import TestClient

from riskpilot.main import app

client = TestClient(app)
SECRET = "dev-local-secret-change-me"


def test_score_returns_facts_no_explanation() -> None:
    res = client.post(
        "/score",
        json={
            "holdings": [
                {"ticker": "NVDA", "weight_pct": 60},
                {"ticker": "KO", "weight_pct": 40},
            ]
        },
        headers={"x-internal-secret": SECRET},
    )
    assert res.status_code == 200
    body = res.json()
    assert "facts" in body and "holdings" in body and "score_version" in body
    assert "explanation" not in body
    assert body["facts"]["risk_score"] > 0


def test_score_rejects_bad_sum() -> None:
    res = client.post(
        "/score",
        json={
            "holdings": [
                {"ticker": "NVDA", "weight_pct": 60},
                {"ticker": "KO", "weight_pct": 20},
            ]
        },
        headers={"x-internal-secret": SECRET},
    )
    assert res.status_code == 400


def test_score_unknown_ticker_422_with_symbols() -> None:
    res = client.post(
        "/score",
        json={
            "holdings": [
                {"ticker": "ZZZZ", "weight_pct": 50},
                {"ticker": "KO", "weight_pct": 50},
            ]
        },
        headers={"x-internal-secret": SECRET},
    )
    assert res.status_code == 422
    assert res.json()["detail"]["symbols"] == ["ZZZZ"]


def test_score_requires_secret() -> None:
    res = client.post(
        "/score",
        json={
            "holdings": [
                {"ticker": "NVDA", "weight_pct": 60},
                {"ticker": "KO", "weight_pct": 40},
            ]
        },
    )
    assert res.status_code == 401
