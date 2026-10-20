"""The walk loop's stopping rules: equal screen budget, persona-driven quitting, one final look."""

import asyncio
from pathlib import Path

from app.models import Action, Element, Observation, Persona
from app.walker import Decision, observation_prompt, walk


def persona(patience: int = 4) -> Persona:
    return Persona(
        id="diego", name="Diego", age=35, initial="D", archetype="Power user in a hurry", bio="PM.", goal="Sign up.",
        tech_confidence="high", patience=patience, reading_style="Skims", frustrations=[], voice="Short",
    )


class FakeSession:
    """Every action moves to a new screen, so stuck detection never fires."""

    def __init__(self, run_dir: Path, done_after: int | None = None) -> None:
        self.run_dir, self.done_after, self.acts = run_dir, done_after, 0

    async def observe(self, name: str) -> Observation:
        shot = f"diego/{name}.jpg"
        (self.run_dir / "diego").mkdir(exist_ok=True)
        (self.run_dir / shot).write_bytes(b"jpeg")
        finished = self.done_after is not None and self.acts >= self.done_after
        return Observation(
            url="http://x/", path="/", title="Welcome" if finished else "Form", heading="", screen=f"s{self.acts}",
            state=f"s{self.acts}", viewport=(1280, 800), scroll_y=0, page_height=800, screenshot=shot,
            elements=[Element(id=1, tag="button", role="button", name="Next", bbox=(0, 0, 10, 10))],
        )

    async def act(self, action: Action) -> tuple[bool, str | None]:
        self.acts += 1
        return True, None


class FakeBrain:
    def __init__(self, claims_done_on: str = "Welcome") -> None:
        self.calls: list[dict] = []
        self.claims_done_on = claims_done_on

    async def perceive(self, persona, obs, jpeg, *, task, run_id, step):
        return None, "fake"

    async def decide(self, persona, obs, see, history, *, task, step, cap, run_id, final=False):
        self.calls.append({"step": step, "cap": cap, "final": final, "history": list(history)})
        if obs.title == self.claims_done_on:
            return Decision(Action(kind="done", reason="Account created"), "Done.", 0, "fake")
        return Decision(Action(kind="click", element_id=1), "Next.", 1, "fake")

    async def confirm_done(self, persona, obs, jpeg, *, task, run_id, step):
        return obs.title == "Welcome"


async def _noop(step, lane) -> None:
    return None


def run(tmp_path: Path, *, patience: int, max_steps: int, done_after: int | None, brain: FakeBrain | None = None):
    brain = brain or FakeBrain()
    result = asyncio.run(walk(
        persona(patience), FakeSession(tmp_path, done_after), brain, task="Sign up", run_id="r", run_dir=tmp_path,
        max_steps=max_steps, on_step=_noop,
    ))
    return result, brain


def test_low_patience_persona_gets_the_full_screen_budget(tmp_path):
    result, brain = run(tmp_path, patience=4, max_steps=10, done_after=7)
    assert result.result.outcome == "completed" and result.result.steps == 8
    assert {c["cap"] for c in brain.calls} == {10}


def test_final_look_counts_a_last_click_that_finished_the_task(tmp_path):
    result, brain = run(tmp_path, patience=4, max_steps=5, done_after=5)
    assert result.result.outcome == "completed"
    assert brain.calls[-1]["final"] is True and len(brain.calls) == 6


def test_final_look_that_wants_to_keep_going_is_not_recorded(tmp_path):
    result, brain = run(tmp_path, patience=4, max_steps=5, done_after=None)
    assert result.result.outcome == "out_of_steps" and result.result.steps == 5
    assert brain.calls[-1]["final"] is True


def test_unconfirmed_done_gets_a_second_look_then_counts_as_giving_up(tmp_path):
    brain = FakeBrain(claims_done_on="Form")  # insists it's finished on a screen that isn't a confirmation
    result, brain = run(tmp_path, patience=4, max_steps=5, done_after=None, brain=brain)
    assert result.result.outcome == "gave_up" and "never confirmed" in result.result.reason
    assert len(brain.calls) == 2 and "nothing on this screen confirms" in brain.calls[1]["history"][-1]


def test_goal_on_screen_counts_even_if_the_persona_kept_going(tmp_path):
    brain = FakeBrain(claims_done_on="never")  # reaches the confirmation screen but keeps clicking
    result, _ = run(tmp_path, patience=4, max_steps=6, done_after=3, brain=brain)
    assert result.result.outcome == "completed" and "didn't recognise" in result.result.reason


def test_headline_with_the_wrong_outcome_is_replaced():
    from app.synthesis import checked_headline

    ok = "4 of 5 users could not sign up, mostly because the card form wiped their details."
    assert checked_headline(ok, n=5, completed=1, task="Sign up") == ok
    assert checked_headline("All 5 users completed the flow, but the slug confused them.", n=5, completed=0,
                            task="Sign up").startswith("5 of 5 users could not")
    assert checked_headline("3 of 5 users could not sign up.", n=5, completed=1, task="Sign up").startswith("4 of 5")
    assert checked_headline("All 5 users finished, but the + button was hard to find.", n=5, completed=5,
                            task="Sign up").startswith("All 5 users finished, but")


def test_prompt_nudges_only_after_patience_is_used_up():
    obs = Observation(
        url="http://x/", path="/", title="Form", heading="", screen="s", state="s", viewport=(1280, 800), scroll_y=0,
        page_height=800, screenshot="p.jpg", elements=[],
    )
    assert "put up with" not in observation_prompt(obs, None, [], 4, 16, patience=4)
    assert "put up with" in observation_prompt(obs, None, [], 5, 16, patience=4)
    assert "last look" in observation_prompt(obs, None, [], 17, 16, patience=4, final=True)
