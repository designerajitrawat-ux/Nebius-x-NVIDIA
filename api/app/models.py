"""Shared data shapes. `web/lib/types.ts` mirrors these, so change both together."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Viewport = Literal["desktop", "mobile"]
Stage = Literal["queued", "preparing", "recruiting", "testing", "reviewing", "writing", "done", "failed"]
Outcome = Literal["completed", "gave_up", "stuck", "out_of_steps", "wrong_path", "error"]
Severity = Literal["critical", "major", "minor"]
ActionKind = Literal["click", "type", "fill", "scroll", "wait", "back", "give_up", "done"]
FixType = Literal["copy", "css", "flow"]
RunMode = Literal["live", "dry_run"]

VIEWPORTS: dict[str, tuple[int, int]] = {"desktop": (1280, 800), "mobile": (390, 844)}


# ---------- personas ----------


class Persona(BaseModel):
    id: str  # slug, unique within a run, e.g. "priya"
    name: str
    age: int = Field(ge=12, le=99)
    initial: str = Field(min_length=1, max_length=1)
    archetype: str  # "First-timer", "Power user in a hurry", ...
    bio: str  # one line
    goal: str
    tech_confidence: Literal["low", "medium", "high"]
    patience: int = Field(ge=3, le=20)  # max steps before they would quit
    reading_style: str
    frustrations: list[str]
    voice: str  # how they talk in notes
    viewport: Viewport = "desktop"


# ---------- browser observation ----------


class Element(BaseModel):
    id: int  # data-fu-id, stable within one document
    tag: str
    role: str
    name: str  # accessible name (best effort)
    type: str | None = None
    placeholder: str | None = None
    value: str | None = None
    href: str | None = None
    checked: bool | None = None
    options: list[str] | None = None  # <select> option texts (first 15, "…" if more)
    disabled: bool = False
    selected: bool = False  # shown as chosen/active (aria-pressed/selected/current or an "is-on"-style class)
    in_view: bool = True
    covered: bool = False  # another element sits on top of its center (e.g. a sticky banner)
    color: str | None = None  # what an unnamed small control looks like on screen, e.g. "dark blue" (colour swatches)
    bbox: tuple[float, float, float, float]  # x, y, w, h in viewport px


class A11yIssue(BaseModel):
    kind: Literal[
        "input_no_label", "img_no_alt", "control_no_name", "small_target", "low_contrast", "positive_tabindex"
    ]
    element_id: int | None = None
    text: str = ""
    detail: str = ""
    bbox: tuple[float, float, float, float] | None = None


class Observation(BaseModel):
    url: str
    path: str
    title: str
    heading: str
    screen: str  # fingerprint: same layout + same controls => same screen
    state: str  # screen + input values + scroll + dialog; used for "no effect" detection
    viewport: tuple[int, int]
    scroll_y: int
    page_height: int
    elements: list[Element]
    text: str = ""  # visible non-interactive text in the viewport (headings, prices, errors)
    a11y: list[A11yIssue] = []
    dialog: str | None = None  # text of an alert()/confirm() that just appeared
    blocked_navigation: str | None = None  # off-site URL we refused to open
    screenshot: str  # path relative to the run folder, e.g. "priya/03.jpg"


# ---------- persona walk ----------


class FieldEntry(BaseModel):
    element_id: int
    text: str


class Action(BaseModel):
    kind: ActionKind
    element_id: int | None = None
    text: str | None = None
    fields: list[FieldEntry] = []  # kind="fill": several form fields in one go
    submit: bool = False
    direction: Literal["up", "down"] | None = None
    reason: str | None = None
    label: str = ""  # human description, e.g. 'Clicked "Get started"'


class Step(BaseModel):
    persona_id: str
    index: int  # 1-based
    url: str
    path: str
    title: str
    screen: str
    screenshot: str
    viewport: tuple[int, int]
    see: str | None = None  # vision perception, in character
    inner_voice: str = ""
    confusion: int = Field(default=0, ge=0, le=3)
    action: Action
    action_ok: bool = True
    action_error: str | None = None
    target_bbox: tuple[float, float, float, float] | None = None
    models: dict[str, str] = {}  # {"perceive": "...", "decide": "..."}
    ms: int = 0
    ts: float = 0.0


class PersonaResult(BaseModel):
    persona_id: str
    outcome: Outcome
    reason: str = ""
    steps: int
    seconds: float


# ---------- expert pass ----------


class ExpertFinding(BaseModel):
    screen: str
    screen_label: str
    source: Literal["vision", "a11y"]
    heuristic: str
    severity: Severity
    finding: str
    suggestion: str
    element_id: int | None = None
    screenshot: str | None = None


# ---------- report ----------


class Pin(BaseModel):
    x: float  # 0..1 relative to screenshot width
    y: float  # 0..1 relative to screenshot height


class Quote(BaseModel):
    persona_id: str
    text: str


class Fix(BaseModel):
    type: FixType
    summary: str
    before: str = ""
    after: str = ""


class Reference(BaseModel):
    title: str
    url: str
    note: str = ""


class Issue(BaseModel):
    id: int  # 1-based, also the pin number
    severity: Severity
    title: str
    screen: str
    screen_label: str
    screenshot: str  # relative path inside the report folder
    viewport: tuple[int, int]
    pin: Pin
    personas_hit: list[str]
    quote: Quote | None = None
    why: str
    fix: Fix
    refs: list[Reference] = []
    alt: str = ""  # screenshot alt text, from the vision step


class FrictionRow(BaseModel):
    screen: str
    label: str
    path: str
    hits: int  # personas who were confused (>=2) or quit here
    visits: int
    worst_issue_id: int | None = None


class ReportPersona(BaseModel):
    id: str
    name: str
    age: int
    initial: str
    archetype: str
    bio: str
    viewport: Viewport
    outcome: Outcome
    reason: str
    steps: int
    seconds: float


class TranscriptStep(BaseModel):
    index: int
    path: str
    screenshot: str
    see: str | None
    inner_voice: str
    confusion: int
    action: str


class UsageRow(BaseModel):
    tier: str  # fast | vision | agent | reason | tavily | dry
    model: str
    label: str
    calls: int
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float


class Usage(BaseModel):
    rows: list[UsageRow]
    total_cost_usd: float
    tavily_calls: int


class Report(BaseModel):
    id: str
    mode: RunMode
    degraded: bool = False  # synthesis fell back from Ultra
    created_at: float
    url: str
    site: str  # host, e.g. "fernhill.example"
    task: str
    audience: str | None = None
    category: str = ""
    headline: str  # "3 of 5 users could not create a project."
    subline: str  # "The pricing wall before signup is the main cause."
    completed: int
    total: int
    personas: list[ReportPersona]
    issues: list[Issue]
    friction_map: list[FrictionRow]
    expert: list[ExpertFinding]
    transcripts: dict[str, list[TranscriptStep]]
    usage: Usage
    refs_status: Literal["ok", "unavailable", "skipped"] = "ok"
    research: list[Reference] = []  # Tavily sources used to build personas


# ---------- API ----------


class RunRequest(BaseModel):
    url: str = Field(min_length=4, max_length=500)
    task: str = Field(min_length=3, max_length=300)
    audience: str | None = Field(default=None, max_length=200)


class LaneStep(BaseModel):
    """What the live lane needs for one step (a trimmed Step)."""

    index: int
    path: str
    screenshot: str
    see: str | None
    inner_voice: str
    confusion: int
    action: str
    model: str  # badge of the deciding model


class Lane(BaseModel):
    persona: Persona
    latest: LaneStep | None = None
    result: PersonaResult | None = None


class RunState(BaseModel):
    id: str
    mode: RunMode
    url: str
    task: str
    audience: str | None
    stage: Stage
    status: Literal["running", "done", "failed"]
    error: str | None = None
    created_at: float
    lanes: list[Lane] = []
    report_ready: bool = False
    cost_usd: float = 0.0


class SampleInfo(BaseModel):
    id: str  # report id
    title: str  # "Signup"
    url: str
    task: str
    headline: str
    completed: int
    total: int
