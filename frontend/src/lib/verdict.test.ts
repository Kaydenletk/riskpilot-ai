import { describe, it, expect } from 'vitest';
import { generateVerdict } from './verdict';
import type { RiskFacts } from './types';

describe('generateVerdict', () => {
  it('generates a verdict for conservative risk band', () => {
    const facts: RiskFacts = {
      risk_score: 25,
      risk_band: 'conservative',
      concentration_pct_top3: 45,
      volatility_annualized_pct: 8.5,
      max_drawdown_pct: -12.3,
      largest_sector: 'Healthcare',
      largest_sector_pct: 22,
      holdings_count: 35,
    };

    const verdict = generateVerdict(facts);
    expect(verdict).toBe('Conservative — 45% in 3 stocks');
  });

  it('generates a verdict for moderate risk band', () => {
    const facts: RiskFacts = {
      risk_score: 50,
      risk_band: 'moderate',
      concentration_pct_top3: 62,
      volatility_annualized_pct: 12.1,
      max_drawdown_pct: -18.5,
      largest_sector: 'Technology',
      largest_sector_pct: 28,
      holdings_count: 22,
    };

    const verdict = generateVerdict(facts);
    expect(verdict).toBe('Moderate — 62% in 3 stocks');
  });

  it('generates a verdict for aggressive risk band', () => {
    const facts: RiskFacts = {
      risk_score: 75,
      risk_band: 'aggressive',
      concentration_pct_top3: 78,
      volatility_annualized_pct: 18.9,
      max_drawdown_pct: -28.2,
      largest_sector: 'Consumer Discretionary',
      largest_sector_pct: 35,
      holdings_count: 8,
    };

    const verdict = generateVerdict(facts);
    expect(verdict).toBe('Aggressive — 78% in 3 stocks');
  });

  it('capitalizes risk band correctly', () => {
    const facts: RiskFacts = {
      risk_score: 40,
      risk_band: 'conservative',
      concentration_pct_top3: 55,
      volatility_annualized_pct: 10,
      max_drawdown_pct: -15,
      largest_sector: 'Energy',
      largest_sector_pct: 20,
      holdings_count: 18,
    };

    const verdict = generateVerdict(facts);
    expect(verdict).toBe('Conservative — 55% in 3 stocks');
    // Verify first letter is capitalized
    expect(verdict[0]).toBe('C');
  });

  it('formats percentage without decimal places', () => {
    const facts: RiskFacts = {
      risk_score: 50,
      risk_band: 'moderate',
      concentration_pct_top3: 62.7,
      volatility_annualized_pct: 12,
      max_drawdown_pct: -20,
      largest_sector: 'Financials',
      largest_sector_pct: 25,
      holdings_count: 20,
    };

    const verdict = generateVerdict(facts);
    expect(verdict).toBe('Moderate — 63% in 3 stocks');
  });

  it('is deterministic and produces same output for same input', () => {
    const facts: RiskFacts = {
      risk_score: 55,
      risk_band: 'moderate',
      concentration_pct_top3: 70.2,
      volatility_annualized_pct: 14,
      max_drawdown_pct: -22,
      largest_sector: 'Healthcare',
      largest_sector_pct: 30,
      holdings_count: 15,
    };

    const verdict1 = generateVerdict(facts);
    const verdict2 = generateVerdict(facts);
    expect(verdict1).toBe(verdict2);
  });
});
