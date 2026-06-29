"""RiskPilot AI backend.

Thesis encoded in the package layout:

  risk_engine/  deterministic financial math. ZERO LLM/OpenAI imports.
                Every number the product shows is computed here.
  llm/          the LLM explanation layer + the number-hallucination guardrail.
                The LLM may ONLY explain numbers that risk_engine produced.

M1 is a deployable skeleton: /health + a DEMO_MODE report served from a fixture.
M2 fills risk_engine with real formulas and llm/ with the live guardrailed call.
"""

__version__ = "0.1.0"
