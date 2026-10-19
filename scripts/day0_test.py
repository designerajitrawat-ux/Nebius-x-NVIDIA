"""
Day 0 smoke test for FiveUsers.

Checks, in order:
  1. .env has NEBIUS_API_KEY and TAVILY_API_KEY
  2. Token Factory is reachable; lists NVIDIA models
  3. One Nemotron chat call works; prints reply + estimated cost
  4. One Tavily search works

Run from repo root:
    python scripts/day0_test.py

Never prints API keys.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    from openai import OpenAI
except ImportError:
    print("Missing deps. Run:  pip install openai tavily-python python-dotenv")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

BASE_URL = os.getenv("TOKEN_FACTORY_URL", "https://api.tokenfactory.nebius.com/v1/")
NEBIUS_KEY = os.getenv("NEBIUS_API_KEY")
TAVILY_KEY = os.getenv("TAVILY_API_KEY")

# Rough public list prices (USD per 1M tokens), update after checking the endpoints page.
PRICES = {
    "lightning": (0.06, 0.24),
    "nano": (0.06, 0.24),
    "omni": (0.06, 0.24),
    "super": (0.30, 0.90),
    "ultra": (1.00, 3.00),
}


def mask(s: str | None) -> str:
    if not s:
        return "(missing)"
    return s[:4] + "…" + s[-3:] + f" (len {len(s)})"


def price_for(model_id: str) -> tuple[float, float]:
    m = model_id.lower()
    for key, p in PRICES.items():
        if key in m:
            return p
    return (0.0, 0.0)


def main() -> int:
    print("== 1. Env ==")
    print("NEBIUS_API_KEY:", mask(NEBIUS_KEY))
    print("TAVILY_API_KEY:", mask(TAVILY_KEY))
    if not NEBIUS_KEY:
        print("Put NEBIUS_API_KEY in .env (copy .env.example → .env).")
        return 1

    client = OpenAI(base_url=BASE_URL, api_key=NEBIUS_KEY)

    print("\n== 2. Models on Token Factory (NVIDIA only) ==")
    try:
        models = client.models.list()
    except Exception as e:  # noqa: BLE001
        print("Could not list models:", type(e).__name__, str(e)[:200])
        return 1
    nvidia = sorted(m.id for m in models.data if "nvidia" in m.id.lower() or "nemotron" in m.id.lower())
    if not nvidia:
        print("No NVIDIA models found. Full list (first 30):")
        for m in list(models.data)[:30]:
            print("  ", m.id)
        return 1
    for mid in nvidia:
        print("  ", mid)

    # Pick a cheap model for the smoke call: prefer lightning > nano > anything.
    pick = next((m for m in nvidia if "lightning" in m.lower()), None) \
        or next((m for m in nvidia if "nano" in m.lower() and "omni" not in m.lower()), None) \
        or nvidia[0]

    print(f"\n== 3. Chat call on {pick} ==")
    t0 = time.time()
    try:
        r = client.chat.completions.create(
            model=pick,
            messages=[
                {"role": "system", "content": "You are a usability researcher. Be concise."},
                {"role": "user", "content": "In one sentence: why do teams skip usability testing?"},
            ],
            max_tokens=80,
            temperature=0.4,
        )
    except Exception as e:  # noqa: BLE001
        print("Chat call failed:", type(e).__name__, str(e)[:300])
        return 1
    ms = int((time.time() - t0) * 1000)
    text = (r.choices[0].message.content or "").strip()
    u = r.usage
    pin, pout = price_for(pick)
    cost = (u.prompt_tokens * pin + u.completion_tokens * pout) / 1_000_000 if u else 0.0
    print("Reply:", text)
    print(f"Tokens: {u.prompt_tokens} in / {u.completion_tokens} out · {ms} ms · est ${cost:.6f}")

    print("\n== 4. Tavily ==")
    if not TAVILY_KEY:
        print("TAVILY_API_KEY missing, skip (add it before Day 1).")
    else:
        try:
            from tavily import TavilyClient

            tv = TavilyClient(api_key=TAVILY_KEY)
            res = tv.search("usability testing with five users Nielsen", max_results=2, search_depth="basic")
            first = (res.get("results") or [{}])[0]
            print("Top result:", first.get("title"), "-", first.get("url"))
        except Exception as e:  # noqa: BLE001
            print("Tavily failed:", type(e).__name__, str(e)[:200])
            return 1

    print("\nAll good. Copy the model IDs above into .env (NEMOTRON_FAST / VISION / AGENT / REASON).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
