# Data Source

## What this dataset is

`backend/data/prices.csv` is a **synthetic, illustrative** price dataset — it is
**not real market data**. It is generated deterministically by
[`backend/src/riskpilot/risk_engine/dataset.py`](backend/src/riskpilot/risk_engine/dataset.py).

## How it's generated

- **Model:** correlated geometric Brownian motion (GBM), 504 trading days (~2 years).
- **Seed:** `42` — fully reproducible. Same seed → identical prices.
- **Per-ticker parameters:** realistic annual drift and volatility (e.g. NVDA ~45%
  vol, MSFT ~25%, KO ~16%) and a hand-built **correlation matrix** (the three tech
  names move together; staples/healthcare are more independent). The realized
  volatilities match the targets within ~1%.
- **Tickers:** NVDA, AMD, MSFT, KO, JNJ, plus SPY as a market proxy.

Regenerate with:

```bash
cd backend && python -m riskpilot.risk_engine.dataset
```

## Why synthetic, not real

1. **License-clean.** Redistributing real price data (e.g. scraped from Yahoo) has
   murky terms. Synthetic data has none.
2. **Reproducible.** Anyone can regenerate the exact dataset from the seed — the
   reliability numbers are reproducible without a live data feed.
3. **The math is the artifact.** The risk formulas (covariance-based portfolio
   volatility, value-weighted concentration, historical max drawdown) are real and
   correct on this data. The data is a faithful stand-in chosen so those formulas
   have a realistic correlation structure to operate on.

This is labeled **"illustrative sample data"** everywhere it appears in the UI. A
production version would swap in a license-clean real dataset here without changing
any of the math.

## Honesty note

Because the data is synthetic, the resulting risk numbers describe a *plausible*
portfolio, not a real one. The point of the project is to demonstrate a correct,
tested, guardrailed risk-analysis pipeline — not to publish real market analysis.
