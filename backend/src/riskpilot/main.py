"""FastAPI app — the PRIVATE math+LLM service.

Topology guard: the only legitimate caller is the Next.js server, which presents
INTERNAL_SHARED_SECRET. There is no browser-facing CORS here because the browser
never talks to this service directly (see PLAN.md eng E4).
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException

from .config import Config, load_config
from .report import build_sample_report
from .schema import RiskReport

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
