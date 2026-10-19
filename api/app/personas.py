"""Recruiting: Tavily research on the product category -> NEMOTRON_AGENT writes five personas."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from pydantic import ValidationError

from . import tavily_client
from .config import settings
from .llm import LLM, LLMError
from .models import Observation, Persona, Reference
from .parsing import short

log = logging.getLogger("fiveusers.personas")

# Default mix (docs/02-product-spec.md). The model adapts these to the product; we fall back to them.
ARCHETYPES = [
    "First-timer: has never used this category of product",
    "Power user in a hurry: knows the category, zero patience, skims",
    "Mobile-only: does everything on a phone (this one uses the small viewport)",
    "Older, lower digital confidence: reads everything, afraid of making mistakes",
    "Non-native English reader: trips on jargon and idioms",
]

_HOSTING_SUFFIXES = ("localhost", "127.0.0.1", "vercel.app", "hf.space", "github.io", "netlify.app", "pages.dev")


@dataclass
class SiteBrief:
    url: str
    host: str
    title: str
    heading: str
    text: str
    category: str = ""
    research: list[Reference] = field(default_factory=list)


def site_brief(url: str, first: Observation) -> SiteBrief:
    return SiteBrief(
        url=url,
        host=urlsplit(url).hostname or url,
        title=first.title,
        heading=first.heading,
        text=short(first.text, 900),
    )


PERSONA_SCHEMA = {
    "type": "object",
    "properties": {
        "personas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"},
                    "archetype": {"type": "string"},
                    "bio": {"type": "string"},
                    "goal": {"type": "string"},
                    "tech_confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "patience": {"type": "integer"},
                    "reading_style": {"type": "string"},
                    "frustrations": {"type": "array", "items": {"type": "string"}},
                    "voice": {"type": "string"},
                    "viewport": {"type": "string", "enum": ["desktop", "mobile"]},
                },
                "required": [
                    "name", "age", "archetype", "bio", "goal", "tech_confidence",
                    "patience", "reading_style", "frustrations", "voice", "viewport",
                ],
            },
        }
    },
    "required": ["personas"],
}

CATEGORY_SCHEMA = {
    "type": "object",
    "properties": {"category": {"type": "string"}},
    "required": ["category"],
}


async def infer_category(llm: LLM, brief: SiteBrief, task: str, run_id: str) -> str:
    try:
        data, _ = await llm.chat_json(
            "fast",
            [
                {"role": "system", "content": "You classify websites. Answer with JSON only."},
                {
                    "role": "user",
                    "content": (
                        f"Website: {brief.host}\nTitle: {brief.title}\nHeading: {brief.heading}\n"
                        f"Visible text: {brief.text}\nUsers will try to: {task}\n\n"
                        'In 2-6 words, what category of product is this? e.g. "B2B project management SaaS", '
                        '"online clothing store", "hair salon booking". Return {"category": "..."}'
                    ),
                },
            ],
            schema=CATEGORY_SCHEMA,
            name="category",
            max_tokens=60,
            temperature=0,
            run_id=run_id,
            step="category",
        )
        return short(str(data.get("category", "")), 60) or "website"
    except LLMError as e:
        log.warning("category inference failed: %s", e)
        return "website"


async def research(brief: SiteBrief, task: str, audience: str | None, run_id: str) -> list[Reference]:
    """Two basic Tavily searches. Empty list if Tavily is unavailable."""
    queries = [f"{brief.category} onboarding usability common complaints"]
    if brief.host.endswith(_HOSTING_SUFFIXES) or brief.host.count(".") == 0:
        queries.append(f"{brief.category} {audience or 'first-time users'} frustrations user research")
    else:
        queries.append(f"{brief.host} what is it")
    results = await asyncio.gather(
        *(tavily_client.search(q, max_results=3, run_id=run_id, step="research") for q in queries),
        return_exceptions=True,
    )
    refs: list[Reference] = []
    for r in results:
        if isinstance(r, list):
            refs += r
    return refs


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.split()[0].lower()).strip("-")
    return s or "user"


def finalize(raw: list[dict], *, count: int, max_steps: int) -> list[Persona]:
    """Validate, give unique ids, clamp patience, guarantee exactly one mobile persona."""
    people: list[Persona] = []
    used: set[str] = set()
    for item in raw:
        if len(people) >= count or not isinstance(item, dict):
            continue
        name = short(str(item.get("name", "")).strip(), 40)
        if not name:
            continue
        pid = base = _slug(name)
        n = 2
        while pid in used:
            pid, n = f"{base}-{n}", n + 1
        used.add(pid)
        frustrations = item.get("frustrations") or []
        if isinstance(frustrations, str):
            frustrations = [frustrations]
        try:
            people.append(
                Persona(
                    id=pid,
                    name=name,
                    age=max(16, min(90, int(item.get("age") or 35))),
                    initial=name[0].upper(),
                    archetype=short(str(item.get("archetype", "")), 60),
                    bio=short(str(item.get("bio", "")), 160),
                    goal=short(str(item.get("goal", "")), 160),
                    tech_confidence=item.get("tech_confidence") if item.get("tech_confidence") in {"low", "medium", "high"} else "medium",
                    patience=max(4, min(max_steps, int(item.get("patience") or 8))),
                    reading_style=short(str(item.get("reading_style", "")), 120),
                    frustrations=[short(str(f), 80) for f in frustrations][:4],
                    voice=short(str(item.get("voice", "")), 120),
                    viewport="mobile" if item.get("viewport") == "mobile" else "desktop",
                )
            )
        except (ValidationError, ValueError, TypeError):
            continue
    mobiles = [p for p in people if p.viewport == "mobile"]
    if people and not mobiles:
        pick = next((p for p in people if "mobile" in p.archetype.lower()), people[min(2, len(people) - 1)])
        pick.viewport = "mobile"
    for extra in mobiles[1:]:
        extra.viewport = "desktop"
    return people


def default_personas(task: str, count: int, max_steps: int) -> list[Persona]:
    goal = task[:1].upper() + task[1:]
    raw = [
        dict(name="Priya Nair", age=34, archetype="First-timer", bio="Runs a small design studio; new to this kind of product.",
             goal=goal, tech_confidence="medium", patience=10, reading_style="Reads headings, then the first line of each block",
             frustrations=["Jargon", "Being asked to pay before trying"], voice="Warm, a little unsure, asks herself questions",
             viewport="desktop"),
        dict(name="Rohan Mehta", age=27, archetype="Power user in a hurry", bio="Product manager who has tried every tool in the category.",
             goal=goal, tech_confidence="high", patience=6, reading_style="Skims; clicks the most obvious button",
             frustrations=["Extra steps", "Slow pages", "Forced tours"], voice="Blunt, short sentences",
             viewport="desktop"),
        dict(name="Maya Lopez", age=41, archetype="Mobile-only", bio="Nurse on shift work; does everything on her phone between tasks.",
             goal=goal, tech_confidence="medium", patience=8, reading_style="Scrolls quickly, taps what's under her thumb",
             frustrations=["Tiny buttons", "Things covering the screen"], voice="Practical, slightly rushed",
             viewport="mobile"),
        dict(name="Dev Malhotra", age=63, archetype="Lower digital confidence", bio="Retired teacher; careful online, worried about mistakes.",
             goal=goal, tech_confidence="low", patience=12, reading_style="Reads everything, including small print",
             frustrations=["Unclear errors", "Being rushed", "Hidden costs"], voice="Polite, cautious, explains what he's doing",
             viewport="desktop"),
        dict(name="Asha Okafor", age=29, archetype="Non-native English reader", bio="Accountant who reads English well but not idioms or jargon.",
             goal=goal, tech_confidence="medium", patience=9, reading_style="Reads carefully, rereads unfamiliar words",
             frustrations=["Idioms", "Ambiguous labels", "Formats she doesn't recognise"], voice="Precise, notices odd wording",
             viewport="desktop"),
    ]
    return finalize(raw, count=count, max_steps=max_steps)


async def recruit(
    llm: LLM, brief: SiteBrief, *, task: str, audience: str | None, run_id: str
) -> tuple[list[Persona], bool]:
    """Returns (personas, generated_by_model)."""
    notes = "\n".join(f"- {r.title}: {r.note}" for r in brief.research[:6]) or "- (no research available)"
    prompt = (
        f"Product: {brief.host}, {brief.title}\nCategory: {brief.category}\nWhat the first screen says: {brief.text}\n"
        f"Task every participant will attempt: {task}\n"
        f"Target audience: {audience or 'not specified, pick realistic users for this category'}\n\n"
        f"Research notes (from web search):\n{notes}\n\n"
        f"Recruit exactly {settings.max_personas} participants, one per archetype, adapted to this product:\n"
        + "\n".join(f"{i + 1}. {a}" for i, a in enumerate(ARCHETYPES[: settings.max_personas]))
        + "\n\nRules:\n"
        "- Realistic, specific people (job, context, why they'd use this product). No stereotypes or caricatures.\n"
        "- Distinct first names with distinct first letters; a globally diverse mix; ages 20-75.\n"
        "- Exactly one participant has viewport \"mobile\" (the mobile-only one); all others \"desktop\".\n"
        f"- patience = how many screens they'll try before quitting (4-{settings.max_steps}); the power user is lowest.\n"
        "- goal restates the task in their own words; frustrations are concrete (2-3 items); voice is how they talk.\n"
        'Return JSON: {"personas": [...]} following the schema.'
    )
    try:
        data, _ = await llm.chat_json(
            "agent",
            [
                {
                    "role": "system",
                    "content": "You are a senior UX researcher recruiting participants for a usability test. JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            schema=PERSONA_SCHEMA,
            name="personas",
            max_tokens=2200,
            temperature=0.7,
            run_id=run_id,
            step="personas",
        )
        people = finalize(data.get("personas", []), count=settings.max_personas, max_steps=settings.max_steps)
        if len(people) == settings.max_personas:
            return people, True
        log.warning("model returned %d usable personas; using defaults", len(people))
    except LLMError as e:
        log.warning("persona generation failed: %s", e)
    return default_personas(task, settings.max_personas, settings.max_steps), False
