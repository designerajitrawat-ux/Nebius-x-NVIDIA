"""Budget guard, per-IP rate limit, judge access and server-wide concurrency."""

from __future__ import annotations

import hmac
import ipaddress
import time
from dataclasses import dataclass
from typing import Literal

from .config import Settings, settings
from .store import Store, store
from .url_safety import is_public_ip

HOUR = 3600.0
DAY = 86400.0


class GuardError(Exception):
    def __init__(self, status: int, code: str, message: str, retry_after: int | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.retry_after = retry_after


@dataclass
class BudgetState:
    spent_usd: float
    soft_usd: float
    hard_usd: float
    remaining_usd: float
    state: Literal["ok", "soft", "hard"]


def budget_state(spent: float, soft: float, hard: float) -> BudgetState:
    state: Literal["ok", "soft", "hard"] = "hard" if spent >= hard else ("soft" if spent >= soft else "ok")
    return BudgetState(round(spent, 4), soft, hard, round(max(0.0, hard - spent), 2), state)


def rate_decision(starts: list[float], now: float, per_hour: int, per_day: int) -> int | None:
    """None if a new run is allowed, else seconds until it would be."""
    last_hour = sorted(t for t in starts if t > now - HOUR)
    last_day = sorted(t for t in starts if t > now - DAY)
    waits = []
    if len(last_hour) >= per_hour:
        waits.append(last_hour[len(last_hour) - per_hour] + HOUR - now)
    if len(last_day) >= per_day:
        waits.append(last_day[len(last_day) - per_day] + DAY - now)
    return max(1, int(max(waits)) + 1) if waits else None


def is_judge(header_value: str | None, token: str | None) -> bool:
    if not (token and header_value):
        return False
    # Compare bytes: compare_digest raises on non-ASCII str, which would turn a bad header into a 500.
    return hmac.compare_digest(header_value.strip().encode("utf-8"), token.encode("utf-8"))


def client_ip(forwarded_for: str | None, peer: str | None) -> str:
    """Who to rate-limit: the right-most public address in X-Forwarded-For.

    Proxies append the address they saw; a client can only add entries on the left, so the left-most
    entry is forgeable. IPv6 clients are bucketed by /64 (one household or VPS usually owns a whole /64).
    """
    hops = [h.strip() for h in (forwarded_for or "").split(",") if h.strip()]
    chosen = next((h for h in reversed(hops) if is_public_ip(h)), None) or (peer or "unknown")
    try:
        addr = ipaddress.ip_address(chosen)
    except ValueError:
        return chosen
    if isinstance(addr, ipaddress.IPv6Address) and not addr.ipv4_mapped:
        return str(ipaddress.ip_network(f"{addr}/64", strict=False))
    return str(addr.ipv4_mapped or addr) if isinstance(addr, ipaddress.IPv6Address) else str(addr)


def _human_wait(seconds: int) -> str:
    if seconds < 90:
        return f"{seconds} seconds"
    if seconds < 5400:
        return f"{round(seconds / 60)} minutes"
    return f"{round(seconds / 3600)} hours"


class Guard:
    def __init__(self, cfg: Settings, db: Store) -> None:
        self.cfg = cfg
        self.db = db
        self.active = 0
        self.credits_exhausted = False  # set when Token Factory says the balance is used up

    def budget(self) -> BudgetState:
        b = budget_state(self.db.spent_usd() + self.cfg.spent_offset_usd, self.cfg.budget_soft_usd, self.cfg.budget_hard_usd)
        if self.credits_exhausted:
            b.state, b.remaining_usd = "hard", 0.0
        return b

    def mark_out_of_credits(self) -> None:
        self.credits_exhausted = True

    def admit(self, ip: str, judge: bool) -> None:
        """Raise GuardError if this run can't start now. Call release() when the run ends."""
        if not self.cfg.dry_run and self.budget().state == "hard":
            raise GuardError(
                402,
                "budget_exhausted",
                "The demo has used its model credits. You can still explore the sample reports.",
            )
        if not judge:
            wait = rate_decision(self.db.run_starts(ip, time.time() - DAY), time.time(), self.cfg.rate_per_hour, self.cfg.rate_per_day)
            if wait is not None:
                raise GuardError(
                    429,
                    "rate_limited",
                    f"You've reached the free limit ({self.cfg.rate_per_hour} runs an hour, {self.cfg.rate_per_day} a day). "
                    f"Try again in about {_human_wait(wait)}, or explore the sample reports.",
                    retry_after=wait,
                )
        if not judge and self.db.count_public_runs(time.time() - HOUR) >= self.cfg.rate_global_per_hour:
            raise GuardError(
                429,
                "busy",
                "The demo is very popular right now, so new tests are paused for a little while. "
                "The sample reports show what a full run looks like.",
                retry_after=600,
            )
        if self.active >= self.cfg.max_concurrent_runs:
            raise GuardError(
                503,
                "busy",
                f"{self.active} tests are already running. Please try again in a minute or two.",
                retry_after=60,
            )
        self.active += 1

    def release(self) -> None:
        self.active = max(0, self.active - 1)


guard = Guard(settings, store)
