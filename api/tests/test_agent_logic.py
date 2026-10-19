"""Walker action handling, persona finalization and synthesis grounding, no model calls."""

from app.models import Element, Observation, Persona, PersonaResult, Step, Action
from app.parsing import ToolCall
from app.personas import default_personas, finalize
from app.synthesis import deterministic, finalize_issues, ground_issue
from app.expert import group_screens
from app.walker import WalkResult, action_from_call, invalid_reason, label_action


def obs(screen="s1", path="/signup", elements=None, shot="p/01.jpg", viewport=(1280, 800)) -> Observation:
    return Observation(
        url="http://x" + path, path=path, title="Sign up", heading="Create your account", screen=screen, state=screen,
        viewport=viewport, scroll_y=0, page_height=800, screenshot=shot,
        elements=elements or [
            Element(id=1, tag="input", role="textbox", name="", placeholder="you@example.com", type="email", bbox=(100, 100, 300, 40)),
            Element(id=2, tag="input", role="textbox", name="Password", type="password", bbox=(100, 160, 300, 40)),
            Element(id=3, tag="button", role="button", name="Submit", bbox=(100, 220, 120, 40)),
        ],
    )


def test_fill_action_parsing_and_label():
    action, voice, confusion = action_from_call(ToolCall("fill", {
        "fields": [{"element_id": 1, "text": "a@example.com"}, {"element_id": "2", "text": "Secret-1"}],
        "inner_voice": "Filling it in", "confusion": "1",
    }))
    assert action.kind == "fill" and [f.element_id for f in action.fields] == [1, 2]
    assert confusion == 1 and voice == "Filling it in"
    assert invalid_reason(action, obs()) is None
    assert label_action(action, obs()) == 'Filled in "you@example.com", "Password"'


def test_invalid_ids_are_rejected():
    action, _, _ = action_from_call(ToolCall("click", {"element_id": 99, "inner_voice": "", "confusion": 0}))
    assert "no element [99]" in invalid_reason(action, obs())
    fill, _, _ = action_from_call(ToolCall("fill", {"fields": [{"element_id": 42, "text": "x"}]}))
    assert "42" in invalid_reason(fill, obs())


def test_password_is_masked_in_labels():
    action, _, _ = action_from_call(ToolCall("type", {"element_id": 2, "text": "hunter2"}))
    assert "hunter2" not in label_action(action, obs())


def test_finalize_personas_one_mobile_unique_ids():
    raw = [
        {"name": "Ana Silva", "age": 30, "viewport": "mobile", "patience": 50},
        {"name": "Ana Costa", "age": 40, "viewport": "mobile"},
        {"name": "Ben", "age": 5},
        {"name": ""},
    ]
    people = finalize(raw, count=5, max_steps=12)
    assert [p.id for p in people] == ["ana", "ana-2", "ben"]
    assert sum(p.viewport == "mobile" for p in people) == 1
    assert people[0].patience == 12  # clamped
    assert people[2].age == 16  # clamped to adult-ish minimum


def test_default_personas_cover_archetypes():
    people = default_personas("Book a table", 5, 12)
    assert len(people) == 5 and sum(p.viewport == "mobile" for p in people) == 1
    assert len({p.initial for p in people}) == 5


def _walk(pid: str, voices: list[str], outcome="gave_up", screen="s1") -> WalkResult:
    persona = default_personas("t", 5, 12)[0].model_copy(update={"id": pid, "name": pid.title()})
    steps, observations = [], []
    for i, v in enumerate(voices, start=1):
        o = obs(screen=screen, shot=f"{pid}/{i:02d}.jpg")
        observations.append(o)
        steps.append(Step(persona_id=pid, index=i, url=o.url, path=o.path, title=o.title, screen=screen, screenshot=o.screenshot,
                          viewport=o.viewport, inner_voice=v, confusion=2, action=Action(kind="click", element_id=3, label="Clicked"),
                          target_bbox=(100, 220, 120, 40)))
    return WalkResult(persona, PersonaResult(persona_id=pid, outcome=outcome, steps=len(steps), seconds=1.0), steps, observations)


def test_ground_issue_uses_real_quote_and_element_pin():
    walks = {"priya": _walk("priya", ["Which box is the email?", "I give up."])}
    raw = {
        "severity": "major", "title": "Email field has no label", "screen": "S1",
        "evidence": {"persona_id": "priya", "step": 1}, "element_id": 1, "personas_hit": ["priya", "ghost"],
        "quote": {"persona_id": "priya", "text": "which box is the email"},  # paraphrased casing/punctuation
        "why": "x", "fix": {"type": "copy", "summary": "Add a label", "before": "", "after": "Email"},
    }
    issue = ground_issue(raw, walks=walks, screen_ids={"S1": "s1"}, labels={"s1": "Create your account"})
    assert issue is not None
    assert issue.personas_hit == ["priya"]  # unknown id dropped
    assert issue.quote and issue.quote.text == "Which box is the email?"  # the verbatim line
    assert abs(issue.pin.x - 250 / 1280) < 0.01 and abs(issue.pin.y - 120 / 800) < 0.01  # element 1's center


def test_ground_issue_replaces_invented_quote():
    walks = {"priya": _walk("priya", ["Hmm.", "Where is the button?!"])}
    raw = {"severity": "critical", "title": "t", "screen": "S1", "evidence": {"persona_id": "nobody", "step": 9},
           "personas_hit": ["priya"], "quote": {"persona_id": "priya", "text": "I love this product"}, "why": "", "fix": {}}
    issue = ground_issue(raw, walks=walks, screen_ids={"S1": "s1"}, labels={})
    assert issue is not None and issue.quote is not None
    assert issue.quote.text in {"Hmm.", "Where is the button?!"}
    assert issue.fix.type == "flow"  # missing type defaults safely


def test_finalize_issues_ranks_and_numbers():
    walks = {"a": _walk("a", ["x"]), "b": _walk("b", ["y"])}
    mk = lambda sev, title, hit, el: ground_issue(  # noqa: E731
        {"severity": sev, "title": title, "screen": "S1", "evidence": {"persona_id": "a", "step": 1}, "element_id": el,
         "personas_hit": hit, "quote": None, "why": "", "fix": {"type": "copy", "summary": "", "before": "", "after": ""}},
        walks=walks, screen_ids={"S1": "s1"}, labels={})
    issues = finalize_issues([mk("minor", "Small", ["a"], 2), mk("critical", "Big", ["a", "b"], 3), mk("critical", "Big", ["a"], 3)])
    assert [(i.id, i.title) for i in issues] == [(1, "Big"), (2, "Small")]  # duplicate dropped


def test_deterministic_headline_counts():
    walks = [_walk("a", ["lost"]), _walk("b", ["fine"], outcome="completed")]
    screens = group_screens({w.persona.id: w.observations for w in walks})
    headline, _, issues = deterministic(task="Sign up for your account", walks=walks, screens=screens, expert=[])
    assert headline == "1 of 2 users could not sign up for their account."
    assert issues and issues[0].severity in {"critical", "major"}


def test_give_up_evidence_points_at_last_attempted_element():
    w = _walk("rohan", ["Clicking submit", "Nothing happens. Bye."])
    w.steps[1].action = Action(kind="give_up", reason="stuck", label="Gave up")
    w.steps[1].target_bbox = None
    raw = {"severity": "critical", "title": "Submit does nothing", "screen": "S1", "evidence": {"persona_id": "rohan", "step": 2},
           "personas_hit": ["rohan"], "quote": {"persona_id": "rohan", "text": "Nothing happens. Bye."}, "why": "", "fix": {}}
    issue = ground_issue(raw, walks={"rohan": w}, screen_ids={"S1": "s1"}, labels={})
    assert issue is not None
    assert issue.screenshot == "rohan/01.jpg"  # the screen where the button was tried
    assert abs(issue.pin.x - 160 / 1280) < 0.01 and abs(issue.pin.y - 240 / 800) < 0.01
    assert issue.quote and issue.quote.text == "Nothing happens. Bye."
