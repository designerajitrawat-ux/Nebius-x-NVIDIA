"""
Controlled experiments behind docs/feedback.md. Each one uses FiveUsers' own prompts, models and real data
(sample pages, personas and screenshots recorded by live runs), and writes raw results to
docs/research/feedback-experiments.json so every number in the feedback can be checked.

    api\\.venv\\Scripts\\python scripts\\feedback_experiments.py        (needs .env keys; costs about $0.25)

Experiments
  E1  Tool calling: Nemotron 3 Super decides the next action for 6 real pages x 5 real personas.
  E2  Reasoning on vs off: Nemotron 3 Ultra writes a report from the same ~5k-token context, 2 runs each.
  E3  Vision as a judge: Nemotron 3.5 Super VL answers "is the goal achieved?" on 24 labelled screenshots.
  E4  Default reasoning on a short vision answer: Super VL with and without enable_thinking=false.
  E5  Burst: 24 concurrent small calls to Nemotron 3.5 Lightning; any 429s, and latency under load.
  E6  Date awareness: what year the models assume without being told.
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
os.environ.setdefault("ALLOW_PRIVATE_URLS", "true")

from app.browser import RunBrowser  # noqa: E402
from app.config import settings  # noqa: E402
from app.llm import LLM, LLMError, image_part  # noqa: E402
from app.models import Persona  # noqa: E402
from app.store import Store  # noqa: E402
from app.walker import DONE_CHECK_SCHEMA, DONE_CHECK_SYSTEM, TOOLS, action_from_call, observation_prompt, persona_system  # noqa: E402

RUNS = ROOT / "api" / "data" / "runs"
OUT = ROOT / "docs" / "research" / "feedback-experiments.json"
WEB = "http://localhost:3000"
random.seed(7)


def pct(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    return round(xs[min(len(xs) - 1, int(q * len(xs)))], 3) if xs else 0.0


def latency_summary(ms: list[float]) -> dict:
    return {"n": len(ms), "p50_s": pct(ms, 0.5) / 1000, "p95_s": pct(ms, 0.95) / 1000, "max_s": round(max(ms) / 1000, 3) if ms else 0}


async def timed(coro):
    t = time.perf_counter()
    res = await coro
    return res, (time.perf_counter() - t) * 1000


# ---------- E1 ----------
async def e1_tool_calling(llm: LLM) -> dict:
    personas = [Persona(**p) for p in json.loads((RUNS / "pezej3l6vf" / "personas.json").read_text(encoding="utf-8"))]
    pages = [
        ("/samples/signup/index.html", "Sign up and create your first project"),
        ("/samples/signup/pricing.html", "Sign up and create your first project"),
        ("/samples/signup/signup.html?plan=team", "Sign up and create your first project"),
        ("/samples/checkout/product.html?id=everyday-tee", "Buy a medium t-shirt in blue and pay by card"),
        ("/samples/booking/index.html", "Book a haircut for next Saturday afternoon"),
        ("/samples/booking/services.html", "Book a haircut for next Saturday afternoon"),
    ]
    rb = RunBrowser()
    await rb.start()
    rows = []
    try:
        out_dir = Path(tempfile.mkdtemp())
        for path, task in pages:
            s = await rb.session(persona_id="e1", viewport="desktop", start_url=WEB + path, run_dir=out_dir)
            await s.open()
            obs = await s.observe("01")
            await s.close()
            ids = {e.id for e in obs.elements}
            for p in personas:
                messages = [{"role": "system", "content": persona_system(p, task)}, {"role": "user", "content": observation_prompt(obs, None, [], 1, 16, p.patience)}]
                try:
                    res, ms = await timed(llm.chat("agent", messages, tools=TOOLS, tool_choice="auto", max_tokens=400, temperature=0.5))
                except LLMError as e:
                    rows.append({"page": path, "persona": p.archetype, "error": str(e)})
                    continue
                structured = bool(res.tool_calls)
                valid = False
                kind = None
                if res.tool_calls:
                    action, _, _ = action_from_call(res.tool_calls[0])
                    kind = action.kind
                    target = action.fields[0].element_id if action.kind == "fill" and action.fields else action.element_id
                    valid = action.kind in {"scroll", "wait", "back", "give_up", "done"} or (target in ids)
                rows.append({"page": path, "persona": p.archetype, "structured": structured, "valid_target": valid, "tool": kind, "ms": round(ms), "out_tokens": res.completion_tokens})
    finally:
        await rb.close()
    ok = [r for r in rows if "error" not in r]
    return {
        "model": settings.models["agent"],
        "calls": len(rows),
        "structured_tool_calls": sum(r["structured"] for r in ok),
        "valid_targets": sum(r["valid_target"] for r in ok),
        "errors": len(rows) - len(ok),
        "tools_used": {t: sum(1 for r in ok if r["tool"] == t) for t in sorted({r["tool"] for r in ok if r["tool"]})},
        "latency": latency_summary([r["ms"] for r in ok]),
        "rows": rows,
    }


# ---------- E2 ----------
def report_context() -> str:
    r = json.loads((ROOT / "api" / "samples" / "sample-signup" / "report.json").read_text(encoding="utf-8"))
    lines = [f"Task: {r['task']}", "Personas and outcomes:"]
    for p in r["personas"]:
        lines.append(f"- {p['id']} ({p.get('archetype', '')}): {p.get('outcome')} ({p.get('reason', '')})")
    lines.append("Step logs (persona: step, page, what they did, what they thought, confusion 0-3):")
    for pid, steps in r["transcripts"].items():
        for s in steps:
            lines.append(f"- {pid} {s['index']} {s['path']} | {s.get('action', '')} | \"{s.get('inner_voice', '')}\" | {s.get('confusion')}")
    lines.append("Expert findings:")
    for e in r["expert"][:30]:
        lines.append(f"- [{e.get('severity')}] {e.get('screen_label', '')}: {e.get('finding', '')}")
    return "\n".join(lines)


ISSUES_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "issues": {"type": "array", "items": {"type": "object", "properties": {"severity": {"type": "string"}, "title": {"type": "string"}, "fix": {"type": "string"}}, "required": ["severity", "title", "fix"]}},
    },
    "required": ["headline", "issues"],
}


async def e2_reasoning(llm: LLM) -> dict:
    ctx = report_context()
    messages = [
        {"role": "system", "content": "You are a principal UX researcher. Write the findings of this usability test as JSON only."},
        {"role": "user", "content": ctx + "\n\nReturn JSON: a one-sentence headline with counts, and 3 to 8 distinct issues, most severe first, each with severity, title and a concrete fix."},
    ]
    rows = []
    for thinking in (True, False):
        for i in range(2):
            try:
                res, ms = await timed(llm.chat("reason", messages, json_schema={"name": "report", "schema": ISSUES_SCHEMA}, max_tokens=12000, temperature=0.3, thinking=thinking))
            except LLMError as e:
                rows.append({"thinking": thinking, "error": str(e)})
                continue
            parsed, n_issues = False, 0
            try:
                data = json.loads(res.text[res.text.find("{"): res.text.rfind("}") + 1])
                parsed, n_issues = True, len(data.get("issues", []))
            except Exception:  # noqa: BLE001
                pass
            rows.append({"thinking": thinking, "finish_reason": res.finish_reason, "prompt_tokens": res.prompt_tokens, "out_tokens": res.completion_tokens, "ms": round(ms), "json_parsed": parsed, "issues": n_issues, "cost_usd": round(res.cost_usd, 4)})
    return {"model": settings.models["reason"], "context_chars": len(ctx), "rows": rows}


# ---------- E3 ----------
def labelled_screens() -> list[tuple[Path, bool]]:
    """10 success screens (board.html: "Your project is ready") and 14 non-success screens from the same signup flow."""
    pos: list[Path] = []
    neg: dict[str, list[Path]] = {"projects.html": [], "signup.html": [], "pricing.html": [], "index.html": []}
    for rd in sorted(RUNS.iterdir()):
        ev = rd / "events.jsonl"
        if not ev.exists():
            continue
        for line in ev.read_text(encoding="utf-8").splitlines():
            e = json.loads(line)
            if e.get("type") != "persona_step":
                continue
            s = e["step"]
            shot = rd / s["screenshot"]
            if "/samples/signup/" not in s["path"] or not shot.exists():
                continue
            page = s["path"].split("/")[-1].split("?")[0]
            if page == "board.html":
                pos.append(shot)
            elif page in neg:
                neg[page].append(shot)
    picks = [(p, True) for p in random.sample(pos, min(10, len(pos)))]
    for page, n in (("projects.html", 5), ("signup.html", 4), ("pricing.html", 3), ("index.html", 2)):
        picks += [(x, False) for x in random.sample(neg[page], min(n, len(neg[page])))]
    return picks


async def e3_vision_judge(llm: LLM) -> dict:
    task = "Sign up and create your first project"
    rows = []
    for shot, truth in labelled_screens():
        msg = [
            {"role": "system", "content": DONE_CHECK_SYSTEM},
            {"role": "user", "content": [
                {"type": "text", "text": f"Participant's goal: \"{task}\"\nThis is the screen they are on. Has the goal been achieved, as shown on this screen (e.g. a confirmation, or the thing they were asked to create now exists)? JSON: {{\"finished\": true|false, \"why\": str}}"},
                image_part(shot.read_bytes()),
            ]},
        ]
        try:
            (data, res), ms = await timed(llm.chat_json("vision", msg, schema=DONE_CHECK_SCHEMA, name="done_check", max_tokens=150, temperature=0))
            rows.append({"screen": shot.relative_to(RUNS).as_posix(), "truth": truth, "said": data.get("finished"), "ms": round(ms)})
        except LLMError as e:
            rows.append({"screen": shot.relative_to(RUNS).as_posix(), "truth": truth, "error": str(e)})
    ok = [r for r in rows if "error" not in r]
    tp = sum(1 for r in ok if r["truth"] and r["said"] is True)
    tn = sum(1 for r in ok if not r["truth"] and r["said"] is False)
    return {"model": settings.models["vision"], "screens": len(rows), "positives": sum(r["truth"] for r in rows), "correct": tp + tn, "true_positives": tp, "true_negatives": tn, "latency": latency_summary([r["ms"] for r in ok]), "rows": rows}


# ---------- E4 ----------
async def e4_default_reasoning(llm: LLM) -> dict:
    shot = next((RUNS / "pezej3l6vf" / "aisha").glob("*.jpg"))
    msg = [{"role": "user", "content": [{"type": "text", "text": "In at most 20 words: what is the main heading on this screen?"}, image_part(shot.read_bytes())]}]
    rows = []
    for thinking in (None, False):
        for _ in range(4):
            res, ms = await timed(llm.chat("vision", msg, max_tokens=60, temperature=0, thinking=True if thinking is None else False))
            rows.append({"enable_thinking": "default (on)" if thinking is None else False, "empty": not res.text.strip(), "finish_reason": res.finish_reason, "out_tokens": res.completion_tokens, "ms": round(ms)})
    return {"model": settings.models["vision"], "max_tokens": 60, "rows": rows}


# ---------- E5 ----------
async def e5_burst(llm: LLM) -> dict:
    async def one(i: int):
        t = time.perf_counter()
        try:
            await llm.chat("fast", [{"role": "user", "content": f"Reply with the number {i} only."}], max_tokens=8, temperature=0)
            return {"ok": True, "ms": (time.perf_counter() - t) * 1000}
        except LLMError as e:
            return {"ok": False, "error": str(e)[:120], "ms": (time.perf_counter() - t) * 1000}

    llm._sem = asyncio.Semaphore(24)  # the app caps at 8; open it up for the burst
    t0 = time.perf_counter()
    rows = await asyncio.gather(*(one(i) for i in range(24)))
    wall = time.perf_counter() - t0
    return {"model": settings.models["fast"], "concurrent": 24, "succeeded": sum(r["ok"] for r in rows), "errors": [r["error"] for r in rows if not r["ok"]], "wall_s": round(wall, 2), "latency": latency_summary([r["ms"] for r in rows])}


# ---------- E6 ----------
async def e6_dates(llm: LLM) -> dict:
    q = [{"role": "user", "content": "Without explaining, what is today's date? Answer as YYYY-MM-DD only."}]
    out = {}
    for tier in ("fast", "agent", "vision"):
        res = await llm.chat(tier, q, max_tokens=20, temperature=0)
        out[settings.models[tier]] = res.text.strip()[:20]
    return {"actual_date": time.strftime("%Y-%m-%d"), "answers": out}


async def main() -> None:
    tmp = Path(tempfile.mkdtemp())
    llm = LLM(settings, Store(tmp, tmp / "s"))
    results = {"date": time.strftime("%Y-%m-%d %H:%M"), "endpoint": settings.token_factory_url}
    for name, fn in [("E1_tool_calling", e1_tool_calling), ("E2_reasoning_on_off", e2_reasoning), ("E3_vision_judge", e3_vision_judge),
                     ("E4_default_reasoning_vision", e4_default_reasoning), ("E5_burst", e5_burst), ("E6_date_awareness", e6_dates)]:
        print(f"running {name}…", flush=True)
        results[name] = await fn(llm)
        summary = {k: v for k, v in results[name].items() if k != "rows"}
        print(json.dumps(summary, ensure_ascii=False)[:900], flush=True)
    results["experiment_cost_usd"] = round(llm.ledger.spent_usd(), 4)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    asyncio.run(main())
