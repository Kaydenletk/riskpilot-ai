"""API smoke tests — boot the app, hit /health and the guarded report endpoint.
No OpenAI key needed (DEMO_MODE)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from riskpilot.main import app

client = TestClient(app)
SECRET = "dev-local-secret-change-me"


def test_health_reports_demo_mode_without_a_key() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["demo_mode"] is True
    assert body["live_llm"] is False


def test_report_requires_the_internal_secret() -> None:
    assert client.get("/report/sample").status_code == 401


def test_report_returns_a_grounded_demo_report() -> None:
    r = client.get("/report/sample", headers={"x-internal-secret": SECRET})
    assert r.status_code == 200
    body = r.json()
    assert body["facts"]["holdings_count"] == 5
    assert body["explanation"]["source"] == "demo_fixture"
    # every checklist item is a question, never a buy/sell imperative (compliance)
    assert all(item.strip().endswith("?") for item in body["explanation"]["review_checklist"])
    assert "not financial advice" in body["disclaimer"].lower()


def test_tickers_endpoint_lists_the_demo_universe() -> None:
    r = client.get("/tickers", headers={"x-internal-secret": SECRET})
    assert r.status_code == 200
    tickers = {o["ticker"] for o in r.json()}
    assert "NVDA" in tickers
    assert "SPY" not in tickers  # benchmark, not searchable


def test_tickers_endpoint_requires_secret() -> None:
    assert client.get("/tickers").status_code == 401


def test_analyze_known_ticker_returns_a_report() -> None:
    r = client.get("/analyze/NVDA", headers={"x-internal-secret": SECRET})
    assert r.status_code == 200
    body = r.json()
    assert body["ticker"] == "NVDA"
    assert "beta" in body["facts"]
    assert len(body["spark"]) > 0


def test_analyze_unknown_ticker_404s() -> None:
    r = client.get("/analyze/DOGE", headers={"x-internal-secret": SECRET})
    assert r.status_code == 404


def test_post_report_scores_known_holdings() -> None:
    r = client.post(
        "/report",
        headers={"x-internal-secret": SECRET},
        json={"holdings": [{"ticker": "NVDA", "shares": 40, "sector": "x", "market_value": 1},
                           {"ticker": "KO", "shares": 30, "sector": "x", "market_value": 1}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["facts"]["holdings_count"] == 2
    assert "not financial advice" in body["disclaimer"].lower()


def test_post_report_rejects_unknown_ticker() -> None:
    r = client.post(
        "/report",
        headers={"x-internal-secret": SECRET},
        json={"holdings": [{"ticker": "DOGE", "shares": 1, "sector": "x", "market_value": 1}]},
    )
    assert r.status_code == 422
    assert "DOGE" in r.json()["detail"]["symbols"]


def test_post_report_requires_secret() -> None:
    assert client.post("/report", json={"holdings": []}).status_code == 401
