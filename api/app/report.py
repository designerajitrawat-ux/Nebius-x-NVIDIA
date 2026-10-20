"""Report helpers: pin placement, annotated screenshots (Pillow), Markdown export."""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .models import Issue, Pin, Report

SIGNAL = (0xE4, 0x57, 0x2E)
PAPER = (0xF7, 0xF6, 0xF2)
PIN_D = 22  # px, matches the UI
RING = 2

OUTCOME_TEXT = {
    "completed": "Completed",
    "gave_up": "Gave up",
    "stuck": "Got stuck",
    "out_of_steps": "Hit the screen limit",
    "wrong_path": "Finished on the wrong path",
    "error": "Run error",
}


def pin_for_bbox(bbox: tuple[float, float, float, float] | None, viewport: tuple[int, int]) -> Pin:
    """Center of the element, relative to the screenshot, kept clear of the edges.

    Elements partly off-screen are clamped to the visible part. No bbox => upper-middle of the screen.
    """
    w, h = max(1, viewport[0]), max(1, viewport[1])
    if not bbox:
        return Pin(x=0.5, y=0.35)
    x, y, bw, bh = bbox
    x0, y0 = max(0.0, x), max(0.0, y)
    x1, y1 = min(float(w), x + bw), min(float(h), y + bh)
    if x1 <= x0 or y1 <= y0:  # entirely outside the viewport
        cx, cy = min(max(x + bw / 2, 0), w), min(max(y + bh / 2, 0), h)
    else:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    mx, my = (PIN_D / 2 + RING) / w, (PIN_D / 2 + RING) / h
    return Pin(x=round(min(1 - mx, max(mx, cx / w)), 4), y=round(min(1 - my, max(my, cy / h)), 4))


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def draw_pins(src: Path, dst: Path, pins: list[tuple[int, Pin]]) -> None:
    """Numbered signal-colored pins with a paper ring (same look as the web report)."""
    img = Image.open(src).convert("RGB")
    draw = ImageDraw.Draw(img)
    font = _font(13)
    r = PIN_D / 2
    for number, pin in pins:
        cx, cy = pin.x * img.width, pin.y * img.height
        draw.ellipse((cx - r - RING, cy - r - RING, cx + r + RING, cy + r + RING), fill=PAPER)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=SIGNAL)
        draw.text((cx, cy), str(number), fill=(255, 255, 255), font=font, anchor="mm")
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "JPEG", quality=82)


def annotated_name(screenshot: str) -> str:
    return "annotated/" + screenshot.replace("/", "_")


def annotate(report_dir: Path, issues: list[Issue]) -> None:
    by_shot: dict[str, list[tuple[int, Pin]]] = {}
    for issue in issues:
        by_shot.setdefault(issue.screenshot, []).append((issue.id, issue.pin))
    for shot, pins in by_shot.items():
        src = report_dir / shot
        if src.is_file():
            draw_pins(src, report_dir / annotated_name(shot), pins)


def task_phrase(task: str) -> str:
    """'Sign up and create your first project' -> 'sign up and create their first project'."""
    t = task.strip().rstrip(".")
    if not t:
        return "finish the task"
    t = t[0].lower() + t[1:]
    for a, b in ((" your ", " their "), (" you ", " they "), (" my ", " their ")):
        t = (" " + t + " ").replace(a, b).strip()
    return t


def to_markdown(rep: Report, file_base: str) -> str:
    """file_base: absolute URL prefix for this report's files, e.g. https://api/files/<id>"""
    names = {p.id: p.name for p in rep.personas}
    date = dt.datetime.fromtimestamp(rep.created_at, dt.timezone.utc).strftime("%d %b %Y")
    gave_up = rep.total - rep.completed
    out: list[str] = [
        f"# {rep.headline}",
        "",
        rep.subline,
        "",
        f"**Task:** {rep.task}  ",
        f"**Site:** {rep.url}  ",
        f"**Date:** {date} · {rep.total} personas · {rep.completed} completed · {gave_up} did not",
    ]
    if rep.mode == "dry_run":
        out += ["", "> Dry run, persona decisions were scripted; no models were called."]
    if rep.degraded:
        out += ["", "> Written by Nemotron Super because Nemotron Ultra was unavailable."]
    out += ["", "## Issues", ""]
    for i in rep.issues:
        out += [f"### {i.id}. {i.severity.capitalize()}, {i.title}", ""]
        out += [f"![{i.alt or i.title}]({file_base}/{annotated_name(i.screenshot)})", ""]
        out += [f"**Screen:** {i.screen_label}  ", f"**Hit by:** {', '.join(names.get(p, p) for p in i.personas_hit) or '-'}", ""]
        if i.quote:
            out += [f"> “{i.quote.text}”, {names.get(i.quote.persona_id, i.quote.persona_id)}", ""]
        out += [f"**Why it matters:** {i.why}", "", f"**Fix ({i.fix.type}):** {i.fix.summary}", ""]
        if i.fix.type == "css" and i.fix.after:
            out += ["```css", i.fix.after, "```", ""]
        elif i.fix.before or i.fix.after:
            if i.fix.before:
                out.append(f"- Before: {i.fix.before}")
            if i.fix.after:
                out.append(f"- After: {i.fix.after}")
            out.append("")
        if i.refs:
            out += ["See how others do it (via Tavily): " + " · ".join(f"[{r.title}]({r.url})" for r in i.refs), ""]
    if rep.friction_map:
        out += ["## Friction map", "", "| Screen | Personas in trouble | Visits | Worst issue |", "|---|---|---|---|"]
        out += [f"| {f.label} | {f.hits} | {f.visits} | {f'#{f.worst_issue_id}' if f.worst_issue_id else '-'} |" for f in rep.friction_map]
        out.append("")
    out += ["## Personas", "", "| Persona | Archetype | Device | Outcome | Steps | Time |", "|---|---|---|---|---|---|"]
    out += [
        f"| {p.name}, {p.age} | {p.archetype} | {p.viewport} | {OUTCOME_TEXT.get(p.outcome, p.outcome)}, {p.reason} | {p.steps} | {p.seconds:.0f} s |"
        for p in rep.personas
    ]
    if rep.expert:
        out += ["", "## Expert review", "", "| Screen | Source | Heuristic | Severity | Finding | Suggestion |", "|---|---|---|---|---|---|"]
        out += [
            f"| {e.screen_label} | {e.source} | {e.heuristic} | {e.severity} | {e.finding} | {e.suggestion} |".replace("\n", " ")
            for e in rep.expert
        ]
    out += ["", "## Model usage", "", "| Step | Model | Calls | Tokens in | Tokens out | Cost |", "|---|---|---|---|---|---|"]
    out += [
        f"| {u.tier} | {u.label} | {u.calls} | {u.prompt_tokens:,} | {u.completion_tokens:,} | ${u.cost_usd:.4f} |"
        for u in rep.usage.rows
    ]
    out += [
        f"| **Total** | | | | | **${rep.usage.total_cost_usd:.4f}** |",
        "",
        "---",
        "Generated by FiveUsers · Runs on Nebius Token Factory with NVIDIA Nemotron · References via Tavily",
        "",
    ]
    return "\n".join(out)
