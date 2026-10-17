"""POST /report with a portfolio goal: goal_fit facts ride the report envelope,
and the explanation layer may reference goal numbers ONLY via the guardrail
whitelist. Uses the same secret-header client pattern as test_api.py."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from riskpilot.config import Config
from riskpilot.llm.explain import _fact_values
from riskpilot.main import app, get_config
from riskpilot.risk_engine.goal import compute_goal_fit
from riskpilot.schema import PortfolioGoal, RiskReport

SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _demo_config() -> Iterator[None]:
    """Force DEMO_MODE + a known secret for this module, and CLEAN UP — the app
    object is shared across test modules, so a leaked override 401s everything."""
    app.dependency_overrides[get_config] = lambda: Config(
        demo_mode=True,
        openai_api_key=None,
        openai_model="gpt-5.5",
        internal_shared_secret=SECRET,
    )
    yield
    app.dependency_overrides.pop(get_config, None)


def _client() -> TestClient:
    return TestClient(app)


def _weighted_body(goal: str | None = None) -> dict:
    body: dict = {
        "weighted": [
            {"ticker": "NVDA", "weight_pct": 40},
            {"ticker": "MSFT", "weight_pct": 35},
            {"ticker": "KO", "weight_pct": 25},
        ]
    }
    if goal is not None:
        body["goal"] = goal
    return body


class TestReportGoalEndpoint:
    def test_no_goal_means_no_goal_fit(self):
        client = _client()
        res = client.post(
            "/report", json=_weighted_body(), headers={"x-internal-secret": SECRET}
        )
        assert res.status_code == 200
        assert res.json()["goal_fit"] is None

    def test_income_goal_returns_goal_fit_block(self):
        client = _client()
        res = client.post(
            "/report", json=_weighted_body("income"), headers={"x-internal-secret": SECRET}
        )
        assert res.status_code == 200
        report = RiskReport.model_validate(res.json())
        assert report.goal_fit is not None
        assert report.goal_fit.goal == PortfolioGoal.income
        assert report.goal_fit.sector_suggestions

    def test_shares_branch_also_honors_goal(self):
        client = _client()
        res = client.post(
            "/report",
            json={
                "holdings": [
                    {"ticker": "NVDA", "shares": 2, "sector": "x", "market_value": 1},
                    {"ticker": "KO", "shares": 5, "sector": "x", "market_value": 1},
                ],
                "goal": "income",
            },
            headers={"x-internal-secret": SECRET},
        )
        assert res.status_code == 200
        report = RiskReport.model_validate(res.json())
        assert report.goal_fit is not None
        assert report.goal_fit.goal == PortfolioGoal.income

    def test_invalid_goal_rejected_422(self):
        client = _client()
        res = client.post(
            "/report", json=_weighted_body("yolo"), headers={"x-internal-secret": SECRET}
        )
        assert res.status_code == 422  # pydantic enum validation

    def test_goal_numbers_join_guardrail_whitelist(self):
        weights = {"NVDA": 40.0, "MSFT": 35.0, "KO": 25.0}
        goal_fit = compute_goal_fit(weights, PortfolioGoal.income)
        client = _client()
        res = client.post(
            "/report", json=_weighted_body("income"), headers={"x-internal-secret": SECRET}
        )
        report = RiskReport.model_validate(res.json())
        values = _fact_values(report.facts, report.goal_fit)
        for expected in (
            goal_fit.income_orientation_pct,
            goal_fit.growth_orientation_pct,
            goal_fit.fit_score,
            goal_fit.income_yield_proxy_pct,
        ):
            assert expected in values
        for suggestion in goal_fit.sector_suggestions:
            assert suggestion.current_pct in values
            assert suggestion.typical_yield_pct in values

    def test_demo_explanation_stays_grounded_with_goal(self):
        from riskpilot.llm.number_guardrail import find_ungrounded_numbers

        client = _client()
        res = client.post(
            "/report", json=_weighted_body("income"), headers={"x-internal-secret": SECRET}
        )
        report = RiskReport.model_validate(res.json())
        prose = " ".join(
            [
                report.explanation.summary,
                *report.explanation.top_risk_factors,
                *report.explanation.review_checklist,
            ]
        )
        assert not find_ungrounded_numbers(
            prose, _fact_values(report.facts, report.goal_fit)
        )
