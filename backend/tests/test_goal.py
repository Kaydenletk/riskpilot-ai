"""Goal-fit engine: deterministic portfolio-goal alignment facts.

Same contract philosophy as the rest of risk_engine: pure math over the
committed universe, zero LLM imports, numbers rounded once at the boundary so
the guardrail whitelist matches what the UI renders.
"""

from __future__ import annotations

import pytest

from riskpilot.risk_engine.goal import (
    SECTOR_PROFILES,
    compute_goal_fit,
)
from riskpilot.risk_engine.ticker import available_tickers
from riskpilot.schema import FitBand, PortfolioGoal


def _sectors_of_universe() -> set[str]:
    return {o.sector for o in available_tickers()}


class TestSectorProfiles:
    def test_every_universe_sector_has_a_profile(self):
        missing = _sectors_of_universe() - set(SECTOR_PROFILES)
        assert not missing, f"sectors without a goal profile: {missing}"

    def test_income_factors_bounded(self):
        for sector, profile in SECTOR_PROFILES.items():
            assert 0.0 <= profile.income_factor <= 1.0, sector
            assert profile.yield_proxy_pct >= 0.0, sector

    def test_utilities_lean_income_and_tech_leans_growth(self):
        assert SECTOR_PROFILES["Utilities"].income_factor > 0.8
        assert SECTOR_PROFILES["Technology"].income_factor < 0.3


class TestComputeGoalFit:
    def _tech_heavy(self) -> dict[str, float]:
        return {"NVDA": 40.0, "MSFT": 35.0, "KO": 25.0}

    def _income_heavy(self) -> dict[str, float]:
        return {"DUK": 30.0, "KO": 30.0, "XOM": 25.0, "AMT": 15.0}

    def test_orientations_sum_to_100(self):
        fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        assert fit.income_orientation_pct + fit.growth_orientation_pct == pytest.approx(
            100.0, abs=0.2
        )

    def test_income_goal_on_tech_heavy_book_is_misaligned(self):
        fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        assert fit.goal == PortfolioGoal.income
        assert fit.fit_score < 40
        assert fit.fit_band == FitBand.misaligned

    def test_income_goal_on_income_book_is_aligned(self):
        fit = compute_goal_fit(self._income_heavy(), PortfolioGoal.income)
        assert fit.fit_score >= 60
        assert fit.fit_band == FitBand.aligned

    def test_growth_goal_mirrors_income_goal(self):
        income_fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        growth_fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.growth)
        assert growth_fit.fit_score == pytest.approx(
            100.0 - income_fit.fit_score, abs=0.2
        )

    def test_balanced_goal_rewards_even_split(self):
        even = {"NVDA": 25.0, "MSFT": 25.0, "DUK": 25.0, "AMT": 25.0}
        fit = compute_goal_fit(even, PortfolioGoal.balanced)
        assert fit.fit_score > compute_goal_fit(self._tech_heavy(), PortfolioGoal.balanced).fit_score

    def test_yield_proxy_higher_for_income_book(self):
        tech = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        income = compute_goal_fit(self._income_heavy(), PortfolioGoal.income)
        assert income.income_yield_proxy_pct > tech.income_yield_proxy_pct

    def test_income_suggestions_are_income_sectors_with_examples(self):
        fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        assert fit.sector_suggestions, "income goal must suggest sectors"
        universe_tickers = {o.ticker for o in available_tickers()}
        held = set(self._tech_heavy())
        for s in fit.sector_suggestions:
            assert SECTOR_PROFILES[s.sector].income_factor >= 0.6
            assert 0 <= s.current_pct <= 100
            assert s.typical_yield_pct == SECTOR_PROFILES[s.sector].yield_proxy_pct
            assert 1 <= len(s.example_tickers) <= 3
            for t in s.example_tickers:
                assert t in universe_tickers
                assert t not in held

    def test_growth_suggestions_are_growth_sectors(self):
        fit = compute_goal_fit(self._income_heavy(), PortfolioGoal.growth)
        assert fit.sector_suggestions
        for s in fit.sector_suggestions:
            assert SECTOR_PROFILES[s.sector].income_factor <= 0.4

    def test_suggestions_sorted_most_goal_serving_first(self):
        fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        yields = [s.typical_yield_pct for s in fit.sector_suggestions]
        assert yields == sorted(yields, reverse=True)

    def test_suggestion_slots_backfill_when_top_sectors_fully_held(self):
        # All Real Estate + all Utilities held -> those sectors have no example
        # tickers left. Their slots must fall through to the next-ranked income
        # sectors (Energy, Consumer Staples, Financials), not be wasted.
        weights = {
            "AMT": 10.0, "PLD": 10.0, "SPG": 10.0,
            "NEE": 10.0, "DUK": 10.0, "SO": 10.0, "AEP": 10.0,
            "XOM": 10.0, "CVX": 10.0, "COP": 10.0,
        }
        fit = compute_goal_fit(weights, PortfolioGoal.income)
        sectors = [s.sector for s in fit.sector_suggestions]
        assert "Financials" in sectors, "freed slot must backfill with next serving sector"
        assert len(fit.sector_suggestions) == 3  # Energy, Staples, Financials remain

    def test_rejects_empty_and_zero_sum_weights(self):
        with pytest.raises(ValueError):
            compute_goal_fit({}, PortfolioGoal.income)

    def test_rounding_one_decimal(self):
        fit = compute_goal_fit(self._tech_heavy(), PortfolioGoal.income)
        for value in (
            fit.income_orientation_pct,
            fit.growth_orientation_pct,
            fit.fit_score,
            fit.income_yield_proxy_pct,
        ):
            assert value == round(value, 1)
