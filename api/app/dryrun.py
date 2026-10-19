"""DRY_RUN=1: a scripted brain so the whole pipeline (browser, SSE, report, UI) runs with no
model calls and no credits. Never used in live mode; reports are marked mode="dry_run".

The policy is a simple, persona-flavoured heuristic: fill visible empty fields with plausible
fake data, pick the control that best matches the task, scroll when stuck, quit when patience
runs out. Good enough to exercise every code path; not a usability judgement.
"""

from __future__ import annotations

import hashlib
import random
import re

from .models import Action, Element, FieldEntry, Observation, Persona
from .walker import Decision

LABEL = "Dry run (scripted)"

SUCCESS = re.compile(
    r"\b(order confirmed|you'?re booked|booking confirmed|is ready|project (is )?created|thank you for your order|"
    r"all set|you'?re all set|welcome aboard|payment (successful|received)|order #\s?\d+|confirmation number)\b",
    re.I,
)
CTA_WORDS = (
    "continue", "next", "sign up", "signup", "get started", "start", "create", "checkout", "check out", "pay",
    "book", "confirm", "place order", "submit", "add to bag", "add to cart", "proceed", "free", "try", "save",
    "select", "choose", "register", "join", "buy",
)
STOP = {"a", "an", "the", "and", "or", "to", "for", "your", "my", "of", "in", "on", "with", "by", "first", "next", "it"}


def _rng(persona: Persona, step: int) -> random.Random:
    seed = int(hashlib.sha1(f"{persona.id}:{step}".encode()).hexdigest()[:8], 16)
    return random.Random(seed)


def _fake_value(p: Persona, el: Element) -> str | None:
    hint = f"{el.name} {el.placeholder or ''} {el.type or ''}".lower()
    first = p.name.split()[0]
    last = p.name.split()[-1] if len(p.name.split()) > 1 else "Test"
    table = [
        (("email", "e-mail"), f"{first.lower()}.{last.lower()}@example.com"),
        (("password",), "Sunrise-2026!"),
        (("card number", "card", "cc-number"), "4242 4242 4242 4242"),
        (("expir", "mm/yy", "mm / yy"), "12/28"),
        (("cvc", "cvv", "security code"), "123"),
        (("phone", "mobile", "tel"), "555 010 2026"),
        (("zip", "postal", "postcode", "pin code"), "94110"),
        (("city", "town"), "Springfield"),
        (("address", "street"), "12 Elm Street"),
        (("country",), "United States"),
        (("company", "organization", "organisation", "team", "workspace"), f"{last} Studio"),
        (("project",), "Spring launch"),
        (("first name", "given"), first),
        (("last name", "surname", "family"), last),
        (("name", "full name"), p.name),
        (("search", "find"), "blue t-shirt"),
        (("coupon", "promo", "discount"), None),
        (("note", "message", "comment"), None),
    ]
    for keys, value in table:
        if any(k in hint for k in keys):
            return value
    if el.type in {"text", "", None} and el.role == "textbox":
        return f"{first} test"
    return None


class DryBrain:
    def __init__(self) -> None:
        self._clicked: dict[str, set[str]] = {}

    async def perceive(self, persona: Persona, obs: Observation, jpeg: bytes, *, task: str, run_id: str, step: int) -> tuple[str | None, str]:
        first = (obs.heading or obs.title or "this page").strip()
        visible = [e.name for e in obs.elements if e.in_view and e.name][:3]
        bits = f"I see “{first}”."
        if visible:
            bits += " There's " + ", ".join(f"“{v}”" for v in visible) + "."
        return bits + " I'm looking for how to " + task[:1].lower() + task[1:].rstrip(".") + ".", LABEL

    async def decide(
        self, persona: Persona, obs: Observation, see: str | None, history: list[str], *, task: str, step: int, cap: int, run_id: str
    ) -> Decision:
        rng = _rng(persona, step)
        page_text = f"{obs.heading}\n{obs.title}\n{obs.text}"
        if SUCCESS.search(page_text):
            return Decision(Action(kind="done", reason="The page confirms it's done"), "Great, that looks finished.", 0, LABEL)
        if step >= cap and rng.random() < 0.5:
            return Decision(Action(kind="give_up", reason="This is taking too long"), "I've spent long enough on this.", 3, LABEL)

        clicked = self._clicked.setdefault(persona.id, set())
        view = [e for e in obs.elements if e.in_view and not e.disabled]

        # 1) fill every empty field on screen in one go, like a person working down a form
        entries: list[FieldEntry] = []
        unlabeled = False
        for el in view:
            if el.role in {"textbox", "searchbox"} and not el.value and f"{obs.screen}:{el.id}:typed" not in clicked:
                value = _fake_value(persona, el)
                if value is not None:
                    clicked.add(f"{obs.screen}:{el.id}:typed")
                    entries.append(FieldEntry(element_id=el.id, text=value))
                    unlabeled = unlabeled or not el.name
        if entries:
            voice = "Some of these boxes have no labels… I'm guessing what goes where." if unlabeled else "Okay, filling in my details."
            return Decision(Action(kind="fill", fields=entries), voice, 2 if unlabeled else 0, LABEL)

        # 2) pick an option in an unanswered radio group / tick terms
        radios = [e for e in view if e.role in {"radio", "option"}]
        if radios and not any(e.checked for e in radios if e.checked is not None):
            words = _task_words(task)
            pick = max(radios, key=lambda e: _overlap(e.name, words) + rng.random() * 0.1)
            if f"{obs.screen}:{pick.id}" not in clicked:
                clicked.add(f"{obs.screen}:{pick.id}")
                voice = f"I'll go with {pick.name}." if pick.name else "These options have no names. I'll guess."
                return Decision(Action(kind="click", element_id=pick.id), voice, 0 if pick.name else 2, LABEL)
        for el in view:
            if el.role == "checkbox" and el.checked is False and re.search(r"agree|terms|accept", el.name, re.I):
                if f"{obs.screen}:{el.id}" not in clicked:
                    clicked.add(f"{obs.screen}:{el.id}")
                    return Decision(Action(kind="click", element_id=el.id), "Fine, I agree to the terms.", 1, LABEL)

        # 3) click the control that best matches the task
        words = _task_words(task)
        scored: list[tuple[float, Element]] = []
        for el in view:
            if el.role not in {"button", "link", "tab", "menuitem"} or not el.name:
                continue
            if el.href and el.href.startswith("http") and "://" in el.href and obs.url.split("/")[2] not in el.href:
                continue
            score = 2 * _overlap(el.name, words) + sum(1.5 for w in CTA_WORDS if w in el.name.lower())
            if f"{obs.screen}:{el.id}" in clicked:
                score -= 4
            score += rng.random() * (0.8 if persona.tech_confidence == "low" else 0.3)
            scored.append((score, el))
        scored.sort(key=lambda t: -t[0])
        if scored and scored[0][0] > 0.5:
            el = scored[0][1]
            clicked.add(f"{obs.screen}:{el.id}")
            confusion = 0 if scored[0][0] > 3 else 1
            voice = f"That {el.name} button should be it." if confusion == 0 else f"Maybe {el.name}? Not sure."
            return Decision(Action(kind="click", element_id=el.id), voice, confusion, LABEL)

        # 4) nothing obvious: scroll if there's more page, else go back / give up
        if obs.scroll_y + obs.viewport[1] < obs.page_height - 20:
            return Decision(Action(kind="scroll", direction="down"), "Where do I go from here? Let me scroll.", 2, LABEL)
        if step > 2 and rng.random() < 0.5:
            return Decision(Action(kind="give_up", reason="I can't find how to continue"), "I can't find the way forward. I give up.", 3, LABEL)
        return Decision(Action(kind="back"), "Maybe I took a wrong turn. Going back.", 2, LABEL)


def _task_words(task: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]+", task.lower()) if w not in STOP and len(w) > 2}


def _overlap(name: str, words: set[str]) -> float:
    toks = set(re.findall(r"[a-z]+", (name or "").lower()))
    return float(len(toks & words))
