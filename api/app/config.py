"""Settings, read once from the environment (.env at repo root, then api/.env)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = API_DIR.parent

load_dotenv(REPO_ROOT / ".env")
load_dotenv(API_DIR / ".env")

Tier = Literal["fast", "vision", "agent", "reason"]
TIERS: tuple[Tier, ...] = ("fast", "vision", "agent", "reason")

# USD per 1M tokens (input, output). Public Token Factory list prices, Oct 2026.
# Override per tier with e.g. PRICE_AGENT="0.30,0.90".
DEFAULT_PRICES: dict[Tier, tuple[float, float]] = {
    "fast": (0.06, 0.24),
    "vision": (0.06, 0.24),
    "agent": (0.30, 0.90),
    "reason": (1.00, 3.00),
}

# Fallback badge names when a tier has no model ID yet (dry run, unconfigured).
TIER_LABELS: dict[Tier, str] = {
    "fast": "Nemotron Lightning",
    "vision": "Nemotron Nano Omni",
    "agent": "Nemotron Super",
    "reason": "Nemotron Ultra",
}


def model_label(model_id: str | None, tier: Tier) -> str:
    """Human badge for a model ID, e.g. 'nvidia/nemotron-3-super-120b-a12b' -> 'Nemotron 3 Super'."""
    m = (model_id or "").lower()
    for key, label in (
        ("lightning", "Nemotron 3.5 Lightning"),
        ("omni", "Nemotron 3 Nano Omni"),
        ("super", "Nemotron 3 Super"),
        ("ultra", "Nemotron 3 Ultra"),
        ("nano", "Nemotron 3 Nano"),
    ):
        if key in m:
            return label
    return TIER_LABELS[tier]


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


def _prices() -> dict[Tier, tuple[float, float]]:
    out = dict(DEFAULT_PRICES)
    for tier in TIERS:
        raw = os.getenv(f"PRICE_{tier.upper()}")
        if not raw:
            continue
        try:
            a, b = (float(x) for x in raw.split(","))
            out[tier] = (a, b)
        except ValueError:
            pass
    return out


def _path(name: str, default: str) -> Path:
    p = Path(os.getenv(name) or default)
    return p if p.is_absolute() else (API_DIR / p).resolve()


@dataclass(frozen=True)
class Settings:
    token_factory_url: str
    nebius_api_key: str | None
    tavily_api_key: str | None
    models: dict[Tier, str]
    prices: dict[Tier, tuple[float, float]]
    dry_run: bool
    thinking_off: bool
    budget_soft_usd: float
    budget_hard_usd: float
    rate_per_hour: int
    rate_per_day: int
    max_concurrent_runs: int
    walker_concurrency: int
    judge_token: str | None
    data_dir: Path
    samples_dir: Path
    max_personas: int
    max_steps: int
    allowed_origins: list[str]
    allow_private_urls: bool
    chromium_args: list[str] = field(default_factory=list)

    @property
    def models_configured(self) -> bool:
        return bool(self.nebius_api_key) and all(self.models.get(t) for t in TIERS)

    @property
    def mode(self) -> Literal["live", "dry_run", "unconfigured"]:
        if self.dry_run:
            return "dry_run"
        return "live" if self.models_configured else "unconfigured"


def load_settings() -> Settings:
    judge = os.getenv("JUDGE_TOKEN") or None
    if judge in {"change-me-long-random", ""}:
        judge = None  # never accept the placeholder as a real token
    return Settings(
        token_factory_url=os.getenv("TOKEN_FACTORY_URL", "https://api.tokenfactory.nebius.com/v1/"),
        nebius_api_key=os.getenv("NEBIUS_API_KEY") or None,
        tavily_api_key=os.getenv("TAVILY_API_KEY") or None,
        models={t: os.getenv(f"NEMOTRON_{t.upper()}", "").strip() for t in TIERS},
        prices=_prices(),
        dry_run=_bool("DRY_RUN"),
        thinking_off=_bool("NEMOTRON_THINKING_OFF", True),
        budget_soft_usd=_float("BUDGET_USD_SOFT", 30.0),
        budget_hard_usd=_float("BUDGET_USD_HARD", 40.0),
        rate_per_hour=_int("RATE_LIMIT_PER_HOUR", 2),
        rate_per_day=_int("RATE_LIMIT_PER_DAY", 5),
        max_concurrent_runs=max(1, _int("MAX_CONCURRENT_RUNS", 2)),
        walker_concurrency=max(1, _int("WALKER_CONCURRENCY", 5)),
        judge_token=judge,
        data_dir=_path("DATA_DIR", "./data"),
        samples_dir=_path("SAMPLES_DIR", "./samples"),
        max_personas=min(5, max(1, _int("MAX_PERSONAS", 5))),
        max_steps=min(20, max(2, _int("MAX_STEPS_PER_PERSONA", 12))),
        allowed_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
        allow_private_urls=_bool("ALLOW_PRIVATE_URLS"),
        chromium_args=[a for a in os.getenv("CHROMIUM_ARGS", "").split() if a],
    )


settings = load_settings()
