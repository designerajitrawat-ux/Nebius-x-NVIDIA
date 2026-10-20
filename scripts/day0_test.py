"""
Day 0 smoke test for FiveUsers. Answers the three questions that decide the build:

  1. Which NVIDIA Nemotron model IDs does this Token Factory account have?
  2. Does the vision model really read screenshots? (draws a fake button, asks what it says)
  3. Does the agent model return structured tool calls, or text we have to parse?
  + one Tavily search, and an estimated cost for everything.

Run from repo root, with the API venv:
    api\\.venv\\Scripts\\python scripts\\day0_test.py        (Windows)
    api/.venv/bin/python scripts/day0_test.py               (macOS/Linux)

Never prints API keys. Total cost is a fraction of a cent.
"""

from __future__ import annotations

import base64
import io
import os
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    from openai import OpenAI
except ImportError:
    print("Missing deps. Run:  pip install -r api/requirements.txt")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

BASE_URL = os.getenv("TOKEN_FACTORY_URL", "https://api.tokenfactory.nebius.com/v1/")
NEBIUS_KEY = os.getenv("NEBIUS_API_KEY")
TAVILY_KEY = os.getenv("TAVILY_API_KEY")

# USD per 1M tokens (input, output), Token Factory list prices Oct 2026.
PRICES = {"lightning": (0.06, 0.24), "omni": (0.06, 0.24), "nano": (0.06, 0.24), "super": (0.30, 0.90), "ultra": (1.00, 3.00)}
spent = 0.0


def mask(s: str | None) -> str:
    return "(missing)" if not s else f"{s[:4]}…{s[-3:]} (len {len(s)})"


def price_for(model_id: str) -> tuple[float, float]:
    m = model_id.lower()
    return next((p for k, p in PRICES.items() if k in m), (0.0, 0.0))


def account(model: str, usage) -> str:
    global spent
    if not usage:
        return ""
    pin, pout = price_for(model)
    cost = (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1_000_000
    spent += cost
    return f"{usage.prompt_tokens} in / {usage.completion_tokens} out · ${cost:.6f}"


def pick(ids: list[str], *keys: str, exclude: str = "") -> str | None:
    for k in keys:
        hit = next((m for m in ids if k in m.lower() and (not exclude or exclude not in m.lower())), None)
        if hit:
            return hit
    return None


def button_png() -> str | None:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None
    img = Image.new("RGB", (480, 200), (247, 246, 242))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((140, 70, 340, 130), radius=8, fill=(228, 87, 46))
    d.text((240, 100), "START FREE TRIAL", fill="white", anchor="mm")
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def main() -> int:
    print("== 1. Env ==")
    print("NEBIUS_API_KEY:", mask(NEBIUS_KEY))
    print("TAVILY_API_KEY:", mask(TAVILY_KEY))
    if not NEBIUS_KEY:
        print("Put NEBIUS_API_KEY in .env (copy .env.example → .env).")
        return 1
    client = OpenAI(base_url=BASE_URL, api_key=NEBIUS_KEY, max_retries=1)

    print("\n== 2. NVIDIA models on Token Factory ==")
    try:
        models = client.models.list()
    except Exception as e:  # noqa: BLE001
        print("Could not list models:", type(e).__name__, str(e)[:200])
        return 1
    ids = sorted(m.id for m in models.data if "nvidia" in m.id.lower() or "nemotron" in m.id.lower())
    if not ids:
        print("No NVIDIA models found. First 30 models:")
        for m in list(models.data)[:30]:
            print("  ", m.id)
        return 1
    for mid in ids:
        print("  ", mid)
    fast = pick(ids, "lightning", "nano-30b", "nano", exclude="omni")
    vision = pick(ids, "omni", "vl", "vision")
    agent = pick(ids, "super")
    reason = pick(ids, "ultra")

    print(f"\n== 3. Text on {fast} ==")
    if fast:
        t0 = time.time()
        try:
            r = client.chat.completions.create(
                model=fast,
                messages=[{"role": "system", "content": "You are a usability researcher. Be concise."},
                          {"role": "user", "content": "In one sentence: why do teams skip usability testing?"}],
                max_tokens=120, temperature=0.4, extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            print("Reply:", (r.choices[0].message.content or "").strip())
            print(f"{account(fast, r.usage)} · {int((time.time() - t0) * 1000)} ms")
        except Exception as e:  # noqa: BLE001
            print("Failed:", type(e).__name__, str(e)[:300])
            print("(If the error mentions chat_template_kwargs, set NEMOTRON_THINKING_OFF=false.)")

    print(f"\n== 4. Vision on {vision} ==")
    image = button_png()
    if vision and image:
        try:
            r = client.chat.completions.create(
                model=vision,
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": "What does the button in this image say? Answer with the exact text only."},
                    {"type": "image_url", "image_url": {"url": image}},
                ]}],
                max_tokens=40, temperature=0, extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            answer = (r.choices[0].message.content or "").strip()
            ok = "free trial" in answer.lower()
            print(f"Reply: {answer!r} → {'READS IMAGES ✓' if ok else 'did not read the button. Check this model'}")
            print(account(vision, r.usage))
        except Exception as e:  # noqa: BLE001
            print("Vision failed:", type(e).__name__, str(e)[:300])
    else:
        print("Skipped (no vision model found, or Pillow missing).")

    print(f"\n== 5. Tool calling on {agent} ==")
    if agent:
        tool = {"type": "function", "function": {
            "name": "click", "description": "Click an element",
            "parameters": {"type": "object", "properties": {"element_id": {"type": "integer"},
                                                            "inner_voice": {"type": "string"}},
                           "required": ["element_id", "inner_voice"]}}}
        try:
            r = client.chat.completions.create(
                model=agent,
                messages=[{"role": "system", "content": "You are a first-time visitor testing a website. Call one tool."},
                          {"role": "user", "content": "Elements on screen:\n[3] link \"Pricing\"\n[7] button \"Start free trial\"\n"
                                                      "Your task: sign up. What do you do?"}],
                tools=[tool], tool_choice="auto", max_tokens=200, temperature=0.3,
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            msg = r.choices[0].message
            if msg.tool_calls:
                tc = msg.tool_calls[0].function
                print(f"Structured tool call ✓  {tc.name}({tc.arguments})")
            else:
                print("No structured tool_calls; text was:", (msg.content or "")[:300])
                print("→ The app parses text tool calls and falls back to JSON mode automatically.")
            print(account(agent, r.usage))
        except Exception as e:  # noqa: BLE001
            print("Tool call failed:", type(e).__name__, str(e)[:300])

    print("\n== 6. Tavily ==")
    if not TAVILY_KEY:
        print("TAVILY_API_KEY missing. Skipped (add it before Day 1).")
    else:
        try:
            from tavily import TavilyClient

            res = TavilyClient(api_key=TAVILY_KEY).search("usability testing with five users Nielsen", max_results=2, search_depth="basic")
            first = (res.get("results") or [{}])[0]
            print("Top result:", first.get("title"), "| URL:", first.get("url"))
        except Exception as e:  # noqa: BLE001
            print("Tavily failed:", type(e).__name__, str(e)[:200])

    print(f"\nEstimated spend for this test: ${spent:.6f}")
    print("\nPaste into .env:")
    for name, val in (("NEMOTRON_FAST", fast), ("NEMOTRON_VISION", vision), ("NEMOTRON_AGENT", agent), ("NEMOTRON_REASON", reason)):
        print(f"{name}={val or ''}" + ("" if val else "    # not found. Pick one from the list above"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
