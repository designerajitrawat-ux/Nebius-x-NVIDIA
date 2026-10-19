"""Expert pass: for every distinct screen the personas saw -
NEMOTRON_VISION heuristic review (Nielsen's 10) + deterministic accessibility checks (no LLM)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path

from .browser import describe_element
from .llm import LLM, LLMError, image_part
from .models import A11yIssue, ExpertFinding, Observation
from .parsing import short

log = logging.getLogger("fiveusers.expert")

MAX_SCREENS = 8
MAX_VISION_FINDINGS = 4
HEURISTICS = [
    "Visibility of system status",
    "Match between system and the real world",
    "User control and freedom",
    "Consistency and standards",
    "Error prevention",
    "Recognition rather than recall",
    "Flexibility and efficiency of use",
    "Aesthetic and minimalist design",
    "Help users recognize, diagnose, and recover from errors",
    "Help and documentation",
]

EXPERT_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heuristic": {"type": "string", "enum": HEURISTICS},
                    "severity": {"type": "string", "enum": ["critical", "major", "minor"]},
                    "finding": {"type": "string"},
                    "suggestion": {"type": "string"},
                    "element_id": {"type": ["integer", "null"]},
                },
                "required": ["heuristic", "severity", "finding", "suggestion"],
            },
        }
    },
    "required": ["findings"],
}

# kind -> (heuristic label, severity, finding template, suggestion)
A11Y_RULES: dict[str, tuple[str, str, str, str]] = {
    "input_no_label": (
        "Form fields need labels (WCAG 1.3.1)",
        "major",
        "A form field has no label{text}, placeholder text disappears as soon as you type.",
        "Add a visible <label> tied to the field with for/id; keep the placeholder only as an example.",
    ),
    "control_no_name": (
        "Controls need accessible names (WCAG 4.1.2)",
        "major",
        "A {text}control has no accessible name, so screen readers announce just \"button\".",
        "Give icon-only buttons an aria-label (e.g. aria-label=\"Close\") or visible text.",
    ),
    "img_no_alt": (
        "Images need text alternatives (WCAG 1.1.1)",
        "minor",
        "An image has no alt attribute{text}.",
        "Add alt text describing what the image conveys, or alt=\"\" if purely decorative.",
    ),
    "small_target": (
        "Touch targets too small (WCAG 2.5.8)",
        "minor",
        "Tap target{text} is smaller than 40×40 px on a phone.",
        "Make interactive elements at least 44×44 px (min-height/min-width or padding).",
    ),
    "low_contrast": (
        "Text contrast (WCAG 1.4.3)",
        "minor",
        "Low-contrast text{text}.",
        "Darken the text or lighten the background to reach at least 4.5:1 (3:1 for large text).",
    ),
    "positive_tabindex": (
        "Focus order (WCAG 2.4.3)",
        "minor",
        "A positive tabindex{text} changes the keyboard focus order.",
        "Remove positive tabindex values; let DOM order define focus order.",
    ),
}


@dataclass
class ScreenInfo:
    screen: str
    label: str
    obs: Observation  # representative observation (first desktop visit if any)
    all_obs: list[Observation]
    visitors: set[str]


def screen_label(obs: Observation) -> str:
    """Human name of a screen: its heading, else the page title, else the path."""
    name = (obs.heading or obs.title or obs.path.split("?")[0] or "Home").strip().rstrip(".:;!")
    return short(name, 60)


def group_screens(observations: dict[str, list[Observation]]) -> list[ScreenInfo]:
    screens: dict[str, ScreenInfo] = {}
    for persona_id, obs_list in observations.items():
        for obs in obs_list:
            info = screens.get(obs.screen)
            if info is None:
                info = screens[obs.screen] = ScreenInfo(obs.screen, screen_label(obs), obs, [], set())
            elif info.obs.viewport[0] < 600 <= obs.viewport[0]:
                info.obs = obs  # prefer a desktop screenshot as the representative
            info.all_obs.append(obs)
            info.visitors.add(persona_id)
    return sorted(screens.values(), key=lambda s: -len(s.visitors))


def a11y_findings(info: ScreenInfo) -> list[ExpertFinding]:
    """Merge every observation of this screen; one finding per rule, examples folded in."""
    by_kind: dict[str, list[tuple[A11yIssue, Observation]]] = {}
    seen: set[tuple[str, str]] = set()
    for obs in info.all_obs:
        for issue in obs.a11y:
            key = (issue.kind, issue.text or str(issue.element_id))
            if key in seen:
                continue
            seen.add(key)
            by_kind.setdefault(issue.kind, []).append((issue, obs))
    out: list[ExpertFinding] = []
    for kind, items in by_kind.items():
        heuristic, severity, template, suggestion = A11Y_RULES[kind]
        examples = [i.text for i, _ in items if i.text][:3]
        if kind == "small_target" and items and any(_tiny(i) for i, _ in items):
            severity = "major"
        if kind == "low_contrast" and any(i.element_id is not None for i, _ in items):
            severity = "major"  # a control, not just body text
        text = ""
        if examples:
            text = " (" + "; ".join(f"“{short(e, 40)}”" for e in examples) + (f" +{len(items) - 3} more" if len(items) > 3 else "") + ")"
        if kind == "control_no_name":
            text = ""
        detail = items[0][0].detail
        finding = template.format(text=text)
        if kind in {"low_contrast", "small_target"} and detail:
            finding = finding.rstrip(".") + f", {detail}."
        first_issue, first_obs = items[0]
        out.append(
            ExpertFinding(
                screen=info.screen,
                screen_label=info.label,
                source="a11y",
                heuristic=heuristic,
                severity=severity,  # type: ignore[arg-type]
                finding=finding,
                suggestion=suggestion,
                element_id=first_issue.element_id,
                screenshot=first_obs.screenshot,
            )
        )
    return out


def _tiny(issue: A11yIssue) -> bool:
    return bool(issue.bbox) and min(issue.bbox[2], issue.bbox[3]) < 24  # type: ignore[index]


async def vision_findings(llm: LLM, info: ScreenInfo, *, task: str, run_dir: Path, run_id: str) -> list[ExpertFinding]:
    obs = info.obs
    elements = "\n".join(describe_element(e) for e in obs.elements[:40])
    try:
        data, _ = await llm.chat_json(
            "vision",
            [
                {
                    "role": "system",
                    "content": "You are a senior UX reviewer doing a heuristic evaluation (Nielsen's 10 usability heuristics). "
                    "You report only problems you can actually see in the screenshot. JSON only.",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"Page: {obs.path}, \"{obs.title}\". Users on this page are trying to: {task}.\n"
                                f"Interactive elements (id, role, name):\n{elements}\n\n"
                                f"List at most {MAX_VISION_FINDINGS} real usability problems on this screen, most severe first. "
                                "Each: heuristic (one of Nielsen's 10, exact name), severity (critical = blocks the task, "
                                "major = slows or confuses most people, minor = polish), finding (one sentence, specific: name the "
                                "element and what's wrong), suggestion (one concrete change), element_id if it's about one element. "
                                'Return {"findings": [...]}. If the screen is fine, return {"findings": []}.'
                            ),
                        },
                        image_part((run_dir / obs.screenshot).read_bytes()),
                    ],
                },
            ],
            schema=EXPERT_SCHEMA,
            name="expert_findings",
            max_tokens=900,
            temperature=0.2,
            run_id=run_id,
            step=f"expert:{info.screen}",
        )
    except LLMError as e:
        log.warning("expert vision failed on %s: %s", info.screen, e)
        return []
    out = []
    raw = data.get("findings")
    for f in (raw if isinstance(raw, list) else [])[:MAX_VISION_FINDINGS]:
        if not isinstance(f, dict) or not f.get("finding"):
            continue
        heuristic = f.get("heuristic") if f.get("heuristic") in HEURISTICS else "Consistency and standards"
        out.append(
            ExpertFinding(
                screen=info.screen,
                screen_label=info.label,
                source="vision",
                heuristic=heuristic,
                severity=f.get("severity") if f.get("severity") in ("critical", "major", "minor") else "minor",
                finding=short(str(f["finding"]), 240),
                suggestion=short(str(f.get("suggestion", "")), 240),
                element_id=f.get("element_id") if isinstance(f.get("element_id"), int) else None,
                screenshot=obs.screenshot,
            )
        )
    return out


async def review(
    llm: LLM | None, observations: dict[str, list[Observation]], *, task: str, run_dir: Path, run_id: str
) -> tuple[list[ScreenInfo], list[ExpertFinding]]:
    """llm=None (dry run) => accessibility checks only."""
    screens = group_screens(observations)[:MAX_SCREENS]
    findings: list[ExpertFinding] = []
    for info in screens:
        findings += a11y_findings(info)
    if llm is not None:
        sem = asyncio.Semaphore(3)

        async def one(info: ScreenInfo) -> list[ExpertFinding]:
            async with sem:
                return await vision_findings(llm, info, task=task, run_dir=run_dir, run_id=run_id)

        for batch in await asyncio.gather(*(one(s) for s in screens)):
            findings += batch
    order = {"critical": 0, "major": 1, "minor": 2}
    findings.sort(key=lambda f: (order[f.severity], f.source != "vision"))
    return screens, findings
