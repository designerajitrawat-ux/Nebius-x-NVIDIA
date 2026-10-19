"""Writing: one NEMOTRON_REASON (Ultra) call turns everything into ranked issues with fixes.

The model chooses *what* the issues are; this module grounds them: screenshots and pins come
from the recorded steps (element bounding boxes, not model guesses), quotes must be real
inner-voice lines, persona ids are validated. Fallbacks: Ultra x2 -> Super (degraded) ->
deterministic synthesis from the step logs (also what dry runs use).
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import Any

from . import tavily_client
from .expert import ScreenInfo
from .llm import LLM, LLMError
from .models import ExpertFinding, Fix, Issue, Observation, Persona, Quote, Reference, Step
from .parsing import short
from .report import pin_for_bbox, task_phrase
from .walker import WalkResult

log = logging.getLogger("fiveusers.synthesis")

SEVERITY_ORDER = {"critical": 0, "major": 1, "minor": 2}
MAX_ISSUES = 6

SYNTH_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "subline": {"type": "string"},
        "wrong_path": {"type": "array", "items": {"type": "string"}},
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": ["critical", "major", "minor"]},
                    "title": {"type": "string"},
                    "screen": {"type": "string"},
                    "evidence": {
                        "type": "object",
                        "properties": {"persona_id": {"type": "string"}, "step": {"type": "integer"}},
                        "required": ["persona_id", "step"],
                    },
                    "element_id": {"type": ["integer", "null"]},
                    "personas_hit": {"type": "array", "items": {"type": "string"}},
                    "quote": {
                        "type": "object",
                        "properties": {"persona_id": {"type": "string"}, "text": {"type": "string"}},
                        "required": ["persona_id", "text"],
                    },
                    "why": {"type": "string"},
                    "fix": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["copy", "css", "flow"]},
                            "summary": {"type": "string"},
                            "before": {"type": "string"},
                            "after": {"type": "string"},
                        },
                        "required": ["type", "summary", "before", "after"],
                    },
                },
                "required": ["severity", "title", "screen", "evidence", "personas_hit", "quote", "why", "fix"],
            },
        },
    },
    "required": ["headline", "subline", "issues"],
}


@dataclass
class Synthesis:
    headline: str
    subline: str
    issues: list[Issue]
    wrong_path: set[str]
    degraded: bool


# ---------- context for the model ----------


def build_context(
    *, task: str, url: str, category: str, walks: list[WalkResult], screens: list[ScreenInfo], expert: list[ExpertFinding]
) -> tuple[str, dict[str, str]]:
    """Compact text dossier + map of screen ids (S1..) -> fingerprints."""
    sid = {s.screen: f"S{i + 1}" for i, s in enumerate(screens)}
    lines = [f"TASK: {task}", f"SITE: {url} ({category})", "", "PERSONAS:"]
    for w in walks:
        p, r = w.persona, w.result
        lines.append(
            f"- {p.id}: {p.name}, {p.age}, {p.archetype}, {p.viewport}; outcome={r.outcome} after {r.steps} steps ({r.reason})"
        )
    lines += ["", "SCREENS:"]
    for s in screens:
        lines.append(f"- {sid[s.screen]}: {s.label}, visited by {', '.join(sorted(s.visitors))}")
    lines += ["", "STEP LOGS (persona #step screen confusion: inner voice -> action [result]):"]
    for w in walks:
        for st in w.steps:
            scr = sid.get(st.screen, "S?")
            res = "" if st.action_ok else f" [FAILED: {st.action_error}]"
            target = f" (element {st.action.element_id})" if st.action.element_id is not None else ""
            lines.append(f"{w.persona.id} #{st.index} {scr} c={st.confusion}: \"{st.inner_voice}\" -> {st.action.label}{target}{res}")
            if st.see and st.confusion >= 2:
                lines.append(f"    sees: {short(st.see, 200)}")
    if expert:
        lines += ["", "EXPERT FINDINGS:"]
        for e in expert[:30]:
            el = f" (element {e.element_id})" if e.element_id is not None else ""
            lines.append(f"- {sid.get(e.screen, 'S?')} [{e.source}/{e.severity}] {e.heuristic}: {e.finding}{el}")
    return "\n".join(lines), {v: k for k, v in sid.items()}


SYSTEM = (
    "You are a principal UX researcher writing the findings of a moderated usability test with five participants. "
    "You are precise, evidence-driven and practical. You never invent evidence. JSON only."
)


def instructions(n: int, completed: int, task: str) -> str:
    return f"""Write the findings as JSON.

headline: one plain sentence stating the result as a fact with counts, e.g. "{n - completed} of {n} users could not {task_phrase(task)}." (if everyone finished: "All {n} users finished, but ..."). No hype, no "insights".
subline: one sentence naming the main cause.
wrong_path: ids of personas who called the task done but actually ended somewhere that doesn't complete it (usually empty).
issues: {3 if n > 2 else 1}-{MAX_ISSUES} distinct problems, most severe first. Each:
- severity: critical (blocked or made people quit), major (slowed/confused several), minor (polish).
- title: short, specific, plain ("Pricing page appears before signup").
- screen: the S-id where it happens. evidence: a persona_id + step number where it is visible on screen.
- element_id: the element involved on that step's screen if one is (from the step logs / expert findings), else null.
- personas_hit: ids of everyone affected (from the logs).
- quote: copy one inner-voice line VERBATIM from the step logs, from an affected persona.
- why: one or two sentences on the impact, grounded in what happened.
- fix: type "copy" (before = current wording, after = exact new wording), "css" (before = what's wrong, after = a CSS snippet), or "flow" (before = current flow, after = the changed flow). summary = one sentence. Be concrete and implementable.
Combine duplicates. Prefer issues that explain why people failed. Use expert/accessibility findings when they caused real trouble."""


# ---------- grounding ----------


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", "", s.lower()).strip()


def _find_step(walks: dict[str, WalkResult], persona_id: str, index: int) -> tuple[Step, Observation] | None:
    w = walks.get(persona_id)
    if not w:
        return None
    for st, obs in zip(w.steps, w.observations):
        if st.index == index:
            return st, obs
    return None


def _best_step_on_screen(walks: dict[str, WalkResult], screen: str, personas: list[str]) -> tuple[Step, Observation] | None:
    best: tuple[int, Step, Observation] | None = None
    for pid, w in walks.items():
        for st, obs in zip(w.steps, w.observations):
            if st.screen != screen:
                continue
            score = st.confusion * 2 + (1 if pid in personas else 0) + (2 if not st.action_ok else 0)
            if best is None or score > best[0]:
                best = (score, st, obs)
    return (best[1], best[2]) if best else None


def ground_issue(
    raw: dict[str, Any], *, walks: dict[str, WalkResult], screen_ids: dict[str, str], labels: dict[str, str]
) -> Issue | None:
    personas = [p for p in (raw.get("personas_hit") or []) if p in walks]
    ev = raw.get("evidence") or {}
    found = _find_step(walks, str(ev.get("persona_id", "")), int(ev.get("step") or 0)) if isinstance(ev, dict) else None
    screen = screen_ids.get(str(raw.get("screen", "")).strip())
    if found and screen and found[0].screen != screen:
        found = None  # evidence contradicts the screen; trust the screen
    if not found:
        if not screen:
            return None
        found = _best_step_on_screen(walks, screen, personas)
        if not found:
            return None
    step, obs = found
    screen = step.screen
    if step.persona_id not in personas:
        personas.insert(0, step.persona_id)

    element = None
    if isinstance(raw.get("element_id"), int):
        element = next((e for e in obs.elements if e.id == raw["element_id"]), None)
    bbox = element.bbox if element else step.target_bbox
    if bbox is None:
        # Evidence is a give-up/scroll step: point at what this persona last tried on the same screen.
        # (Each step has its own screenshot, so switch the evidence to that earlier step.)
        earlier = [s for s in walks[step.persona_id].steps if s.screen == screen and s.index < step.index and s.target_bbox]
        if earlier:
            step = earlier[-1]
            obs = next(o for s, o in zip(walks[step.persona_id].steps, walks[step.persona_id].observations) if s is step)
            bbox = step.target_bbox
    pin = pin_for_bbox(bbox, obs.viewport)

    quote = _ground_quote(raw.get("quote"), walks, personas, screen)
    fix_raw = raw.get("fix") or {}
    fix_type = fix_raw.get("type") if fix_raw.get("type") in {"copy", "css", "flow"} else "flow"
    return Issue(
        id=0,
        severity=raw.get("severity") if raw.get("severity") in SEVERITY_ORDER else "major",
        title=short(str(raw.get("title") or "Usability problem"), 90),
        screen=screen,
        screen_label=labels.get(screen, step.path),
        screenshot=step.screenshot,
        viewport=obs.viewport,
        pin=pin,
        personas_hit=personas,
        quote=quote,
        why=short(str(raw.get("why") or ""), 400),
        fix=Fix(
            type=fix_type,  # type: ignore[arg-type]
            summary=short(str(fix_raw.get("summary") or ""), 240),
            before=short(str(fix_raw.get("before") or ""), 400),
            after=str(fix_raw.get("after") or "")[:800],
        ),
        alt=short(step.see or f"Screenshot of {labels.get(screen, step.path)}", 300),
    )


def _ground_quote(raw: Any, walks: dict[str, WalkResult], personas: list[str], screen: str) -> Quote | None:
    if isinstance(raw, dict) and raw.get("persona_id") in walks and raw.get("text"):
        want = _norm(str(raw["text"]))
        for st in walks[raw["persona_id"]].steps:
            if want and (want in _norm(st.inner_voice) or _norm(st.inner_voice) in want) and len(_norm(st.inner_voice)) > 3:
                return Quote(persona_id=raw["persona_id"], text=st.inner_voice)
    # Model paraphrased or invented: use the most confused real line from an affected persona on this screen.
    best: tuple[int, str, str] | None = None
    for pid in personas or list(walks):
        for st in walks[pid].steps:
            if st.screen == screen and st.inner_voice and (best is None or st.confusion > best[0]):
                best = (st.confusion, pid, st.inner_voice)
    return Quote(persona_id=best[1], text=best[2]) if best else None


def finalize_issues(issues: list[Issue]) -> list[Issue]:
    """Drop duplicates (same screen + same pin area), rank, number 1..n."""
    kept: list[Issue] = []
    for i in sorted(issues, key=lambda x: (SEVERITY_ORDER[x.severity], -len(x.personas_hit))):
        dup = any(
            k.screen == i.screen and abs(k.pin.x - i.pin.x) < 0.03 and abs(k.pin.y - i.pin.y) < 0.03 and _norm(k.title)[:20] == _norm(i.title)[:20]
            for k in kept
        )
        if not dup:
            kept.append(i)
    for n, i in enumerate(kept[:MAX_ISSUES], start=1):
        i.id = n
    return kept[:MAX_ISSUES]


# ---------- deterministic synthesis (fallback + dry run) ----------


def deterministic(
    *, task: str, walks: list[WalkResult], screens: list[ScreenInfo], expert: list[ExpertFinding]
) -> tuple[str, str, list[Issue]]:
    by_id = {w.persona.id: w for w in walks}
    labels = {s.screen: s.label for s in screens}
    issues: list[Issue] = []

    # 1) where people quit
    ends: dict[str, list[WalkResult]] = {}
    for w in walks:
        if w.result.outcome != "completed" and w.steps:
            ends.setdefault(w.steps[-1].screen, []).append(w)
    for screen, quitters in ends.items():
        last = quitters[0].steps[-1]
        obs = quitters[0].observations[len(quitters[0].steps) - 1]
        prev_target = next((s.target_bbox for s in reversed(quitters[0].steps) if s.target_bbox), None)
        label = labels.get(screen, last.path)
        issues.append(
            Issue(
                id=0,
                severity="critical" if len(quitters) >= 2 else "major",
                title=short(f"{len(quitters)} {'people' if len(quitters) > 1 else 'person'} gave up on {label}", 90),
                screen=screen,
                screen_label=label,
                screenshot=last.screenshot,
                viewport=obs.viewport,
                pin=pin_for_bbox(prev_target, obs.viewport),
                personas_hit=[w.persona.id for w in quitters],
                quote=Quote(persona_id=quitters[0].persona.id, text=last.inner_voice),
                why=f"{', '.join(w.persona.name.split()[0] for w in quitters)} could not see how to continue from this screen.",
                fix=Fix(type="flow", summary="Make the next step on this screen obvious: one primary action, labelled with what it does.",
                        before="Several competing or unclear options", after="One clearly labelled primary button for the task's next step"),
                alt=short(last.see or f"Screenshot of {label}", 300),
            )
        )

    # 2) clicks that didn't land because something covered the control
    for w in walks:
        for st, obs in zip(w.steps, w.observations):
            if not st.action_ok and st.action_error and "covering" in st.action_error:
                label = labels.get(st.screen, st.path)
                issues.append(
                    Issue(
                        id=0, severity="major", title=short(f"Something covers the button on {label}", 90), screen=st.screen,
                        screen_label=label, screenshot=st.screenshot, viewport=obs.viewport,
                        pin=pin_for_bbox(st.target_bbox, obs.viewport), personas_hit=[w.persona.id],
                        quote=Quote(persona_id=w.persona.id, text=st.inner_voice),
                        why="A fixed banner or overlay sits on top of the control, so taps never reach it.",
                        fix=Fix(type="css", summary="Keep overlays from covering primary actions.",
                                before="position: fixed banner over page content",
                                after=".banner { position: sticky; bottom: 0; }\nbody { padding-bottom: var(--banner-height); }"),
                        alt=short(st.see or f"Screenshot of {label}", 300),
                    )
                )
                break

    # 3) accessibility problems that are also usability problems
    shots = {(s.screen): s for s in screens}
    seen_rules: set[str] = set()
    for e in expert:
        if e.source != "a11y" or e.severity != "major" or e.screen not in shots or e.heuristic in seen_rules:
            continue
        seen_rules.add(e.heuristic)
        info = shots[e.screen]
        el = next((x for x in info.obs.elements if x.id == e.element_id), None)
        issues.append(
            Issue(
                id=0, severity="major", title=short(e.heuristic.split(" (")[0] + f" on {info.label}", 90), screen=e.screen,
                screen_label=info.label, screenshot=info.obs.screenshot, viewport=info.obs.viewport,
                pin=pin_for_bbox(el.bbox if el else None, info.obs.viewport), personas_hit=sorted(info.visitors),
                quote=_ground_quote(None, by_id, sorted(info.visitors), e.screen), why=e.finding,
                fix=Fix(type="css" if "contrast" in e.heuristic.lower() or "target" in e.heuristic.lower() else "copy",
                        summary=e.suggestion, before="", after=""),
                alt=short(f"Screenshot of {info.label}", 300),
            )
        )

    # 4) confusion hot spots (screens not already explained by a give-up issue)
    quit_screens = set(ends)
    for s in screens:
        if s.screen in quit_screens:
            continue
        confused = [(w.persona.id, st) for w in walks for st in w.steps if st.screen == s.screen and st.confusion >= 2]
        people = sorted({pid for pid, _ in confused})
        if len(people) >= 2:
            pid, st = max(confused, key=lambda t: t[1].confusion)
            w = by_id[pid]
            obs = w.observations[w.steps.index(st)]
            issues.append(
                Issue(
                    id=0, severity="major", title=short(f"{len(people)} people were confused on {s.label}", 90), screen=s.screen,
                    screen_label=s.label, screenshot=st.screenshot, viewport=obs.viewport,
                    pin=pin_for_bbox(st.target_bbox, obs.viewport), personas_hit=people,
                    quote=Quote(persona_id=pid, text=st.inner_voice),
                    why="Several personas hesitated or guessed here before acting.",
                    fix=Fix(type="copy", summary="Rewrite labels on this screen to say exactly what each action does.", before="", after=""),
                    alt=short(st.see or f"Screenshot of {s.label}", 300),
                )
            )

    n = len(walks)
    completed = sum(1 for w in walks if w.result.outcome == "completed")
    final = finalize_issues(issues)
    if completed == n:
        headline = f"All {n} users finished the task."
    else:
        headline = f"{n - completed} of {n} users could not {task_phrase(task)}."
    subline = f"The biggest problem: {final[0].title[:1].lower() + final[0].title[1:]}." if final else "No major problems were found."
    return headline, subline, final


# ---------- main entry ----------


async def synthesize(
    llm: LLM | None,
    *,
    task: str,
    url: str,
    category: str,
    walks: list[WalkResult],
    screens: list[ScreenInfo],
    expert: list[ExpertFinding],
    run_id: str,
) -> Synthesis:
    if llm is None:
        h, s, issues = deterministic(task=task, walks=walks, screens=screens, expert=expert)
        return Synthesis(h, s, issues, set(), degraded=False)

    context, screen_ids = build_context(task=task, url=url, category=category, walks=walks, screens=screens, expert=expert)
    n = len(walks)
    completed = sum(1 for w in walks if w.result.outcome == "completed")
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": context + "\n\n" + instructions(n, completed, task)},
    ]
    by_id = {w.persona.id: w for w in walks}
    labels = {s.screen: s.label for s in screens}
    for tier, attempts in (("reason", 2), ("agent", 1)):
        for attempt in range(attempts):
            try:
                data, _ = await llm.chat_json(
                    tier,  # type: ignore[arg-type]
                    messages,
                    schema=SYNTH_SCHEMA,
                    name="report",
                    max_tokens=12000 if tier == "reason" else 4000,
                    temperature=0.3,
                    run_id=run_id,
                    step=f"synthesis:{tier}",
                )
            except LLMError as e:
                log.warning("synthesis on %s failed (attempt %d): %s", tier, attempt + 1, e)
                continue
            grounded = [g for g in (ground_issue(r, walks=by_id, screen_ids=screen_ids, labels=labels)
                                    for r in data.get("issues") or [] if isinstance(r, dict)) if g]
            issues = finalize_issues(grounded)
            if not issues and any(w.result.outcome != "completed" for w in walks):
                log.warning("synthesis on %s produced no usable issues", tier)
                continue
            wrong = {p for p in (data.get("wrong_path") or []) if p in by_id and by_id[p].result.outcome == "completed"}
            return Synthesis(
                headline=short(str(data.get("headline") or ""), 160) or f"{n - completed} of {n} users could not {task_phrase(task)}.",
                subline=short(str(data.get("subline") or ""), 200),
                issues=issues,
                wrong_path=wrong,
                degraded=tier != "reason",
            )
    h, s, issues = deterministic(task=task, walks=walks, screens=screens, expert=expert)
    return Synthesis(h, s, issues, set(), degraded=True)


async def attach_references(issues: list[Issue], *, category: str, run_id: str) -> str:
    """Tavily: 1-2 'how others do it' references for the top 3 issues. Returns refs_status."""
    top = issues[:3]
    if not top:
        return "ok"

    async def one(issue: Issue) -> list[Reference]:
        q = f"{category} {issue.title} UX best practice example"
        return await tavily_client.search(q, max_results=3, run_id=run_id, step=f"refs:{issue.id}")

    results = await asyncio.gather(*(one(i) for i in top), return_exceptions=True)
    ok = False
    for issue, res in zip(top, results):
        if isinstance(res, list):
            ok = True
            issue.refs = res[:2]
    return "ok" if ok else "unavailable"
