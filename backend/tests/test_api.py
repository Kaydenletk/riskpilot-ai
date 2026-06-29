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
