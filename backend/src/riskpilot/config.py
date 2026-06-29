"""Runtime config from env. DEMO_MODE is the safe default: no key -> fixtures."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    demo_mode: bool
    openai_api_key: str
    openai_model: str
    internal_shared_secret: str

    @property
    def has_live_llm(self) -> bool:
        """Live LLM only when explicitly out of DEMO_MODE AND a key exists."""
        return not self.demo_mode and bool(self.openai_api_key)


def load_config() -> Config:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    # DEMO_MODE default-on. Also forced on whenever no key is present, so the
    # app can never try a live call it can't make.
    demo_env = os.getenv("DEMO_MODE", "1").strip().lower()
    demo_mode = demo_env in {"1", "true", "yes"} or not key
    return Config(
        demo_mode=demo_mode,
        openai_api_key=key,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5.5").strip(),
        internal_shared_secret=os.getenv(
            "INTERNAL_SHARED_SECRET", "dev-local-secret-change-me"
        ).strip(),
    )
