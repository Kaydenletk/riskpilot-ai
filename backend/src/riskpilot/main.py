"""FastAPI app — the PRIVATE math+LLM service.

Topology guard: the only legitimate caller is the Next.js server, which presents
INTERNAL_SHARED_SECRET. There is no browser-facing CORS here because the browser
never talks to this service directly (see PLAN.md eng E4).
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from .config import Config, load_config
from .report import build_report_from_holdings, build_sample_report
from .risk_engine.portfolio import UnknownHolding
from .risk_engine.ticker import UnknownTicker, available_tickers
from .schema import Holding, RiskReport, TickerOption, TickerReport
from .ticker_report import build_ticker_report

MAX_HOLDINGS = 50

app = FastAPI(title="RiskPilot AI — internal math+LLM service", version="0.1.0")


def get_config() -> Config:
    return load_config()


def require_internal_secret(
    x_internal_secret: str | None = Header(default=None),
    config: Config = Depends(get_config),
) -> None:
    """Reject anything that isn't the Next.js server with the shared secret."""
    if x_internal_secret != config.internal_shared_secret:
        raise HTTPException(status_code=401, detail="invalid internal secret")


@app.get("/health")
def health(config: Config = Depends(get_config)) -> dict[str, object]:
    """Unauthenticated liveness + mode. Used by docker healthcheck and deploy smoke."""
    return {
        "status": "ok",
        "demo_mode": config.demo_mode,
        "live_llm": config.has_live_llm,
        "version": app.version,
    }


@app.get("/report/sample", response_model=RiskReport)
def sample_report(
    _: None = Depends(require_internal_secret),
    config: Config = Depends(get_config),
) -> RiskReport:
    """The M1 demo report. Facts are deterministic; explanation is grounded by
    construction in DEMO_MODE."""
    return build_sample_report(config)


class PortfolioRequest(BaseModel):
    holdings: list[Holding]


@app.post("/report", response_model=RiskReport)
def report_from_holdings(
    body: PortfolioRequest,
    _: None = Depends(require_internal_secret),
    config: Config = Depends(get_config),
) -> RiskReport:
    """Score an uploaded portfolio. Unknown tickers -> 422 (allow-list boundary)."""
    if not body.holdings:
        raise HTTPException(status_code=400, detail={"error": "empty"})
    if len(body.holdings) > MAX_HOLDINGS:
        raise HTTPException(status_code=400, detail={"error": "too_many", "max": MAX_HOLDINGS})
    shares = {h.ticker: h.shares for h in body.holdings}
    try:
        return build_report_from_holdings(config, shares)
    except UnknownHolding as e:
        raise HTTPException(
            status_code=422, detail={"error": "unknown_tickers", "symbols": e.symbols}
        ) from None
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": "invalid", "message": str(e)}) from None


@app.get("/tickers", response_model=list[TickerOption])
def list_tickers(_: None = Depends(require_internal_secret)) -> list[TickerOption]:
    """The searchable demo universe — also the allow-list / injection boundary."""
    return available_tickers()


@app.get("/analyze/{ticker}", response_model=TickerReport)
def analyze(
    ticker: str,
    _: None = Depends(require_internal_secret),
    config: Config = Depends(get_config),
) -> TickerReport:
    """Single-ticker risk read. 404s anything outside the demo universe (which is
    the allow-list defense — an injection 'ticker' never reaches the model)."""
    try:
        return build_ticker_report(config, ticker)
    except UnknownTicker:
        raise HTTPException(
            status_code=404,
            detail=f"'{ticker.strip().upper()}' is not in the demo universe.",
        ) from None
