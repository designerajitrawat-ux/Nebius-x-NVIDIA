"""Tavily search, used at runtime for persona research and competitor references."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from .config import settings
from .models import Reference
from .parsing import short
from .store import store

log = logging.getLogger("fiveusers.tavily")

TIMEOUT_S = 15.0


class TavilyUnavailable(RuntimeError):
    pass


_client: Any = None


def _get_client() -> Any:
    global _client
    if _client is None:
        if not settings.tavily_api_key:
            raise TavilyUnavailable("TAVILY_API_KEY is not set")
        from tavily import TavilyClient

        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


async def search(query: str, *, max_results: int = 3, run_id: str | None = None, step: str = "") -> list[Reference]:
    """Basic-depth search. Raises TavilyUnavailable on any failure so callers can degrade."""
    try:
        client = _get_client()
        res = await asyncio.wait_for(
            asyncio.to_thread(client.search, query, max_results=max_results, search_depth="basic"),
            timeout=TIMEOUT_S,
        )
    except TavilyUnavailable:
        raise
    except Exception as e:  # noqa: BLE001 (any Tavily/network error degrades the same way)
        log.warning("tavily failed (%s): %s", step, type(e).__name__)
        raise TavilyUnavailable(type(e).__name__) from e
    store.record_usage(
        run_id=run_id, tier="tavily", model="search", prompt_tokens=0, completion_tokens=0, cost_usd=0.0, ms=0, step=step
    )
    out: list[Reference] = []
    for r in (res or {}).get("results", [])[:max_results]:
        url = r.get("url") or ""
        if not url.startswith(("http://", "https://")):
            continue
        out.append(Reference(title=short(r.get("title") or url, 90), url=url, note=short(r.get("content"), 220)))
    return out
