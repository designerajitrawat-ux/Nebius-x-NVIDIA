"""The single entry point for every model call: Nebius Token Factory, NVIDIA Nemotron only.

- one AsyncOpenAI client pointed at Token Factory
- per-tier model IDs from env, per-tier timeouts, retries that honor Retry-After
- cost ledger (SQLite `usage`), read by the budget guard
- JSON helper (response_format + extraction + one repair call on the fast tier)
- tool-call helper that also recovers tool calls returned as plain text
"""

from __future__ import annotations

import asyncio
import base64
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    BadRequestError,
    RateLimitError,
)

from .config import Settings, Tier, model_label, settings
from .parsing import ToolCall, _coerce_args, extract_json, parse_text_tool_calls, strip_think
from .store import Store, store

log = logging.getLogger("fiveusers.llm")

TIMEOUT_S: dict[Tier, float] = {"fast": 30, "vision": 45, "agent": 60, "reason": 180}
MAX_ATTEMPTS = 3  # 1 call + 2 retries
MAX_RETRY_WAIT_S = 20.0


class LLMError(RuntimeError):
    pass


class OutOfCredits(LLMError):
    """Token Factory says the account balance is used up."""


_CREDIT_PHRASES = (
    "insufficient balance", "insufficient funds", "insufficient credit", "not enough credit", "out of credit",
    "balance is too low", "top up your balance", "payment required", "exceeded your current quota",
)


def is_out_of_credits(status: int | None, text: str) -> bool:
    low = text.lower()
    return status == 402 or any(p in low for p in _CREDIT_PHRASES)


@dataclass
class LLMResult:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    tier: str = ""
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0
    ms: int = 0
    finish_reason: str | None = None

    @property
    def label(self) -> str:
        return model_label(self.model, self.tier)  # type: ignore[arg-type]


def compute_cost(prompt_tokens: int, completion_tokens: int, price: tuple[float, float]) -> float:
    """USD for one call given (input, output) prices per 1M tokens."""
    p_in, p_out = price
    return (max(0, prompt_tokens) * p_in + max(0, completion_tokens) * p_out) / 1_000_000


def retry_wait(attempt: int, retry_after: str | None) -> float:
    """Seconds to wait before retry `attempt` (1-based). Honors Retry-After, capped."""
    if retry_after:
        try:
            return min(MAX_RETRY_WAIT_S, max(0.5, float(retry_after)))
        except ValueError:
            pass
    return min(MAX_RETRY_WAIT_S, 1.5 * (2 ** (attempt - 1)) + random.uniform(0, 0.5))


def estimate_prompt_tokens(messages: list[dict[str, Any]]) -> int:
    """Rough input size when the API never told us: ~4 chars per token, ~1.5k tokens per screenshot."""
    chars, images = 0, 0
    for m in messages:
        content = m.get("content")
        if isinstance(content, str):
            chars += len(content)
        elif isinstance(content, list):
            for part in content:
                if part.get("type") == "image_url":
                    images += 1
                else:
                    chars += len(str(part.get("text", "")))
    return chars // 4 + images * 1500


def image_part(jpeg: bytes) -> dict[str, Any]:
    b64 = base64.b64encode(jpeg).decode("ascii")
    return {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}


class LLM:
    def __init__(self, cfg: Settings, ledger: Store, on_out_of_credits: Callable[[], None] | None = None) -> None:
        self.cfg = cfg
        self.ledger = ledger
        self.on_out_of_credits = on_out_of_credits
        self._client: AsyncOpenAI | None = None
        self._sem = asyncio.Semaphore(8)  # server-wide cap on in-flight model calls
        self._thinking_kwargs_ok = cfg.thinking_off
        self._json_schema_ok: dict[str, bool] = {}

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            if not self.cfg.nebius_api_key:
                raise LLMError("NEBIUS_API_KEY is not set")
            self._client = AsyncOpenAI(base_url=self.cfg.token_factory_url, api_key=self.cfg.nebius_api_key, max_retries=0)
        return self._client

    def model_for(self, tier: Tier) -> str:
        model = self.cfg.models.get(tier)
        if not model:
            raise LLMError(f"NEMOTRON_{tier.upper()} is not set")
        return model

    async def chat(
        self,
        tier: Tier,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] | None = None,
        json_schema: dict[str, Any] | None = None,
        max_tokens: int = 700,
        temperature: float = 0.4,
        run_id: str | None = None,
        step: str | None = None,
    ) -> LLMResult:
        model = self.model_for(tier)
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = tool_choice or "auto"
        if json_schema and self._json_schema_ok.get(tier, True):
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": json_schema["name"], "schema": json_schema["schema"], "strict": False},
            }
        if self._thinking_kwargs_ok and tier != "reason":
            # Nemotron 3 reasoning toggle. Per-step calls don't need long thinking; Ultra keeps it.
            kwargs["extra_body"] = {"chat_template_kwargs": {"enable_thinking": False}}

        attempt = 0
        resp = None
        t0 = time.perf_counter()
        while resp is None:
            attempt += 1
            try:
                async with self._sem:
                    t0 = time.perf_counter()
                    resp = await self.client.chat.completions.create(**kwargs, timeout=TIMEOUT_S[tier])
            except APIStatusError as e:
                if is_out_of_credits(e.status_code, str(e)):
                    log.error("Token Factory reports the balance is used up")
                    if self.on_out_of_credits:
                        self.on_out_of_credits()
                    raise OutOfCredits(f"{tier}: out of model credits") from e
                if isinstance(e, RateLimitError):
                    if attempt >= MAX_ATTEMPTS:
                        raise LLMError(f"{tier}: rate limited") from e
                    wait = retry_wait(attempt, e.response.headers.get("retry-after") if e.response else None)
                    log.info("429 on %s, retrying in %.1fs", tier, wait)
                    await asyncio.sleep(wait)
                    continue
                if isinstance(e, BadRequestError):
                    msg = str(e).lower()
                    if "extra_body" in kwargs and ("chat_template" in msg or "enable_thinking" in msg or "extra" in msg):
                        log.warning("endpoint rejected chat_template_kwargs; disabling for this process")
                        self._thinking_kwargs_ok = False
                        kwargs.pop("extra_body")
                        attempt -= 1
                        continue
                    if "response_format" in kwargs and ("response_format" in msg or "schema" in msg or "json" in msg):
                        log.warning("tier %s rejected response_format; using prompt-only JSON", tier)
                        self._json_schema_ok[tier] = False
                        kwargs.pop("response_format")
                        attempt -= 1
                        continue
                    raise LLMError(f"{tier}: bad request ({_safe(e)})") from e
                if e.status_code >= 500 and attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(retry_wait(attempt, None))
                    continue
                raise LLMError(f"{tier}: HTTP {e.status_code} ({_safe(e)})") from e
            except (APITimeoutError, APIConnectionError) as e:
                if isinstance(e, APITimeoutError):
                    # The endpoint may still bill a call we gave up on; count a conservative estimate.
                    self._record_estimate(tier, model, messages, max_tokens, run_id, step)
                # A 550B call that timed out once will likely time out again: fall back instead of waiting.
                if attempt >= MAX_ATTEMPTS or (tier == "reason" and isinstance(e, APITimeoutError)):
                    raise LLMError(f"{tier}: {type(e).__name__}") from e
                await asyncio.sleep(retry_wait(attempt, None))

        ms = int((time.perf_counter() - t0) * 1000)
        pt = getattr(resp.usage, "prompt_tokens", 0) or 0
        ct = getattr(resp.usage, "completion_tokens", 0) or 0
        cost = compute_cost(pt, ct, self.cfg.prices[tier])
        # Record before any validation: a refusal or an empty answer is still billed.
        self.ledger.record_usage(
            run_id=run_id, tier=tier, model=model, prompt_tokens=pt, completion_tokens=ct, cost_usd=cost, ms=ms, step=step
        )
        log.info("llm tier=%s model=%s in=%d out=%d ms=%d run=%s step=%s", tier, model, pt, ct, ms, run_id, step)
        if not resp.choices:
            raise LLMError(f"{tier}: empty response")
        choice = resp.choices[0]
        msg = choice.message
        if getattr(msg, "refusal", None):
            raise LLMError(f"{tier}: model refused")
        raw = msg.content or ""
        calls = [
            ToolCall(tc.function.name, _coerce_args(tc.function.arguments))
            for tc in (msg.tool_calls or [])
            if getattr(tc, "function", None)
        ]
        if tools and not calls:
            known = {t["function"]["name"] for t in tools}
            calls = parse_text_tool_calls(raw, known)
        return LLMResult(
            text=strip_think(raw),
            tool_calls=calls,
            tier=tier,
            model=model,
            prompt_tokens=pt,
            completion_tokens=ct,
            cost_usd=cost,
            ms=ms,
            finish_reason=choice.finish_reason,
        )

    def _record_estimate(self, tier: Tier, model: str, messages: list[dict[str, Any]], max_tokens: int,
                         run_id: str | None, step: str | None) -> None:
        pt = estimate_prompt_tokens(messages)
        cost = compute_cost(pt, max_tokens, self.cfg.prices[tier])
        self.ledger.record_usage(run_id=run_id, tier=tier, model=model, prompt_tokens=pt, completion_tokens=max_tokens,
                                 cost_usd=cost, ms=0, step=f"{step}:timeout-estimate" if step else "timeout-estimate")

    async def chat_json(
        self,
        tier: Tier,
        messages: list[dict[str, Any]],
        *,
        schema: dict[str, Any],
        name: str,
        want: type = dict,
        max_tokens: int = 1200,
        temperature: float = 0.3,
        run_id: str | None = None,
        step: str | None = None,
    ) -> tuple[Any, LLMResult]:
        """Chat expecting JSON. Tries response_format, then extraction, then one repair on the fast tier."""
        res = await self.chat(
            tier,
            messages,
            json_schema={"name": name, "schema": schema},
            max_tokens=max_tokens,
            temperature=temperature,
            run_id=run_id,
            step=step,
        )
        required = tuple(schema.get("required", ()))
        try:
            return extract_json(res.text, want=want, required=required), res
        except ValueError:
            pass
        if not res.text:
            raise LLMError(f"{tier}: empty output for {name}")
        repair = await self.chat(
            "fast",
            [
                {
                    "role": "system",
                    "content": "You convert text into valid JSON. Output only JSON, no prose, no code fences.",
                },
                {
                    "role": "user",
                    "content": f"JSON schema:\n{_compact(schema)}\n\nText to convert:\n{res.text[:12000]}",
                },
            ],
            max_tokens=max_tokens,
            temperature=0,
            run_id=run_id,
            step=f"{step}:repair" if step else "repair",
        )
        try:
            return extract_json(repair.text, want=want), res
        except ValueError as e:
            raise LLMError(f"{tier}: could not parse JSON for {name}") from e


def _compact(obj: Any) -> str:
    import json

    return json.dumps(obj, separators=(",", ":"))


def _safe(e: Exception) -> str:
    """Error text without anything that could echo a key."""
    text = str(e)
    return text[:240].replace(settings.nebius_api_key or "\0", "***")


def _mark_out_of_credits() -> None:
    from .guard import guard  # late import: guard doesn't depend on llm

    guard.mark_out_of_credits()


llm = LLM(settings, store, on_out_of_credits=_mark_out_of_credits)
