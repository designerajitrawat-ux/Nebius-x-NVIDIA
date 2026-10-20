"""Runs one test end to end: Preparing -> Recruiting -> Testing -> Reviewing -> Writing.

Every stage emits SSE events; every failure degrades to something the user can still read.
"""

from __future__ import annotations

import asyncio
import logging
import time
from urllib.parse import urlsplit

from .browser import RunBrowser, SiteUnreachable
from .config import model_label, settings
from .dryrun import DryBrain
from .events import bus_for, drop_bus, live_bus, replay_from_disk
from .expert import ScreenInfo, review
from .guard import guard
from .llm import llm
from .models import (
    FrictionRow,
    Issue,
    Lane,
    LaneStep,
    Persona,
    PersonaResult,
    Report,
    ReportPersona,
    Reference,
    RunState,
    TranscriptStep,
    Usage,
    UsageRow,
)
from .parsing import plain_dashes
from .personas import default_personas, infer_category, recruit, research, site_brief
from .report import annotate, to_markdown
from .store import store
from .synthesis import attach_references, synthesize
from .walker import NemotronBrain, WalkResult, walk

log = logging.getLogger("fiveusers.pipeline")

GENERIC_FAILURE = "Something went wrong on our side while running the test. Please try again, or explore a sample report."
OUT_OF_CREDITS = "The demo has used its model credits, so this test stopped. The sample reports still work."
RUN_TIMEOUT_S = 15 * 60  # hard stop for a whole run; a stuck run would otherwise hold a concurrency slot forever


class RunStopped(Exception):
    """Stop the run with a message for the user."""


async def run_pipeline(run_id: str, *, url: str, task: str, audience: str | None, mode: str) -> None:
    bus = bus_for(run_id)
    run_dir = store.run_dir(run_id)
    dry = mode == "dry_run"
    model = None if dry else llm
    stage = "preparing"
    browser = RunBrowser()

    def credits_gone() -> str | None:
        return OUT_OF_CREDITS if (not dry and guard.credits_exhausted) else None

    def stopped() -> None:
        if credits_gone():
            raise RunStopped(OUT_OF_CREDITS)

    async def set_stage(s: str) -> None:
        nonlocal stage
        stage = s
        store.set_stage(run_id, s)
        await bus.emit("stage", stage=s, at=time.time(), cost_usd=round(store.run_cost(run_id), 4))

    try:
        async with asyncio.timeout(RUN_TIMEOUT_S):
            # 1. Preparing: can we load the site at all?
            await set_stage("preparing")
            await browser.start()
            probe = await browser.session(persona_id="prep", viewport="desktop", start_url=url, run_dir=run_dir)
            try:
                await probe.open()
                first = await probe.observe("home")
                # Redirects (example.com -> www.example.com, apex -> app.) define the site under test.
                start_url = probe.page.url if probe.page.url.startswith(("http://", "https://")) else url
            finally:
                await probe.close()
            brief = site_brief(url, first)

            # 2. Recruiting: research + personas
            await set_stage("recruiting")
            if dry:
                brief.category = "website"
                personas = default_personas(task, settings.max_personas, settings.max_steps)
            else:
                brief.category = await infer_category(llm, brief, task, run_id)
                brief.research = await research(brief, task, audience, run_id)
                personas, _ = await recruit(llm, brief, task=task, audience=audience, run_id=run_id)
            stopped()
            store.write_json(run_id, "personas.json", [p.model_dump() for p in personas])
            store.write_json(run_id, "brief.json", {"category": brief.category, "research": [r.model_dump() for r in brief.research]})
            await bus.emit("personas", lanes=[Lane(persona=p).model_dump() for p in personas])

            # 3. Testing: five walkers in parallel
            await set_stage("testing")
            brain = DryBrain() if dry else NemotronBrain(llm)
            sem = asyncio.Semaphore(settings.walker_concurrency)

            async def one(p: Persona) -> WalkResult:
                async with sem:
                    t0 = time.time()
                    session = None

                    async def on_step(step, lane: LaneStep) -> None:
                        store.append_jsonl(run_id, f"{p.id}/steps.jsonl", step.model_dump())
                        await bus.emit("persona_step", persona_id=p.id, step=lane.model_dump(),
                                       cost_usd=round(store.run_cost(run_id), 4))

                    try:
                        session = await browser.session(persona_id=p.id, viewport=p.viewport, start_url=start_url, run_dir=run_dir)
                        await session.open()
                        wr = await walk(p, session, brain, task=task, run_id=run_id, run_dir=run_dir,
                                        max_steps=settings.max_steps, on_step=on_step, should_stop=credits_gone)
                    except Exception as e:  # noqa: BLE001 (one persona failing must not sink the run)
                        log.exception("walker %s failed", p.id)
                        reason = str(e) if isinstance(e, SiteUnreachable) else "This persona's browser session failed"
                        wr = WalkResult(p, PersonaResult(persona_id=p.id, outcome="error", reason=reason, steps=0,
                                                         seconds=round(time.time() - t0, 1)))
                    finally:
                        if session is not None:
                            await session.close()
                    await bus.emit("persona_done", persona_id=p.id, result=wr.result.model_dump())
                    return wr

            walks = list(await asyncio.gather(*(one(p) for p in personas)))
            stopped()
            if not any(w.steps for w in walks):
                raise SiteUnreachable("None of the personas could use the site. Check the URL, or try a sample.")

            # 4. Reviewing: expert pass on every visited screen
            await set_stage("reviewing")
            screens, expert = await review(
                model, {w.persona.id: w.observations for w in walks if w.observations}, task=task, run_dir=run_dir, run_id=run_id
            )

            # 5. Writing: synthesis, references, annotated screenshots
            await set_stage("writing")
            syn = await synthesize(model, task=task, url=url, category=brief.category, walks=walks,
                                   screens=screens, expert=expert, run_id=run_id)
            for w in walks:
                if w.persona.id in syn.wrong_path:
                    w.result.outcome = "wrong_path"
            refs_status = "skipped" if dry else await attach_references(syn.issues, category=brief.category, run_id=run_id)

            rep = assemble(
                run_id, url=url, task=task, audience=audience, mode="dry_run" if dry else "live", category=brief.category,
                walks=walks, screens=screens, expert=expert, issues=syn.issues, headline=syn.headline, subline=syn.subline,
                degraded=syn.degraded, refs_status=refs_status, research=brief.research,
            )
            annotate(run_dir, rep.issues)
            # Models and web snippets still slip in em dashes now and then; the published report never shows one.
            store.write_json(run_id, "report.json", plain_dashes(rep.model_dump()))
            store.finish_run(run_id, status="done")
            await bus.emit("stage", stage="done", at=time.time(), cost_usd=rep.usage.total_cost_usd)
            await bus.emit("report_ready", report_id=run_id)
            log.info("run %s done: %d issues, $%.4f", run_id, len(rep.issues), rep.usage.total_cost_usd)
    except (SiteUnreachable, RunStopped) as e:
        await _fail(run_id, stage, str(e))
    except TimeoutError:
        log.warning("run %s hit the %ds limit in %s", run_id, RUN_TIMEOUT_S, stage)
        await _fail(run_id, stage, "The test took longer than 15 minutes and was stopped. Try a shorter task, or explore a sample.")
    except Exception:  # noqa: BLE001
        log.exception("run %s failed in %s", run_id, stage)
        await _fail(run_id, stage, GENERIC_FAILURE)
    finally:
        try:
            await browser.close()
        except Exception:  # noqa: BLE001
            log.warning("browser close failed for %s", run_id)
        guard.release()
        drop_bus(run_id)


async def _fail(run_id: str, stage: str, message: str) -> None:
    store.finish_run(run_id, status="failed", error=message)
    await bus_for(run_id).emit("error", stage=stage, message=message)


def friction_map(walks: list[WalkResult], screens: list[ScreenInfo], issues: list[Issue]) -> list[FrictionRow]:
    rows = []
    for s in screens:
        trouble: set[str] = set()
        for w in walks:
            on_screen = [st for st in w.steps if st.screen == s.screen]
            if any(st.confusion >= 2 or not st.action_ok for st in on_screen):
                trouble.add(w.persona.id)
            if w.result.outcome != "completed" and w.steps and w.steps[-1].screen == s.screen:
                trouble.add(w.persona.id)
        worst = next((i.id for i in issues if i.screen == s.screen), None)
        rows.append(FrictionRow(screen=s.screen, label=s.label, path=s.obs.path, hits=len(trouble),
                                visits=len(s.visitors), worst_issue_id=worst))
    rows.sort(key=lambda r: (-r.hits, -r.visits))
    hot = [r for r in rows if r.hits > 0]
    return (hot or rows)[:8]


def usage_for(run_id: str) -> Usage:
    rows = []
    tavily = 0
    order = {"fast": 0, "vision": 1, "agent": 2, "reason": 3, "tavily": 4}
    for r in sorted(store.run_usage(run_id), key=lambda r: order.get(r["tier"], 9)):
        if r["tier"] == "tavily":
            tavily += r["calls"]
            continue
        rows.append(UsageRow(
            tier=r["tier"], model=r["model"], label=model_label(r["model"], r["tier"]), calls=r["calls"],
            prompt_tokens=r["prompt_tokens"] or 0, completion_tokens=r["completion_tokens"] or 0,
            cost_usd=round(r["cost_usd"] or 0.0, 5),
        ))
    return Usage(rows=rows, total_cost_usd=round(sum(r.cost_usd for r in rows), 4), tavily_calls=tavily)


def assemble(
    run_id: str, *, url: str, task: str, audience: str | None, mode: str, category: str, walks: list[WalkResult],
    screens: list[ScreenInfo], expert, issues: list[Issue], headline: str, subline: str, degraded: bool,
    refs_status: str, research: list[Reference],
) -> Report:
    personas = [
        ReportPersona(
            id=w.persona.id, name=w.persona.name, age=w.persona.age, initial=w.persona.initial,
            archetype=w.persona.archetype, bio=w.persona.bio, viewport=w.persona.viewport,
            outcome=w.result.outcome, reason=w.result.reason, steps=w.result.steps, seconds=w.result.seconds,
        )
        for w in walks
    ]
    transcripts = {
        w.persona.id: [
            TranscriptStep(
                index=st.index, path=st.path, screenshot=st.screenshot, see=st.see, inner_voice=st.inner_voice,
                confusion=st.confusion, action=st.action.label + ("" if st.action_ok else f": {st.action_error}"),
            )
            for st in w.steps
        ]
        for w in walks
    }
    run = store.get_run(run_id) or {}
    return Report(
        id=run_id, mode=mode, degraded=degraded, created_at=run.get("created_at", time.time()), url=url,  # type: ignore[arg-type]
        site=urlsplit(url).netloc, task=task, audience=audience, category=category, headline=headline, subline=subline,
        completed=sum(1 for p in personas if p.outcome == "completed"), total=len(personas), personas=personas,
        issues=issues, friction_map=friction_map(walks, screens, issues), expert=expert, transcripts=transcripts,
        usage=usage_for(run_id), refs_status=refs_status, research=research[:6],  # type: ignore[arg-type]
    )


def run_state(run_id: str) -> RunState | None:
    """Snapshot for GET /runs/{id}, rebuilt from the event log (works after restarts)."""
    run = store.get_run(run_id)
    if not run:
        return None
    bus = live_bus(run_id)
    events = bus.events if bus else replay_from_disk(run_id)
    lanes: dict[str, Lane] = {}
    cost = 0.0
    for ev in events:
        t = ev.get("type")
        if t == "personas":
            lanes = {lane["persona"]["id"]: Lane(**lane) for lane in ev["lanes"]}
        elif t == "persona_step" and ev["persona_id"] in lanes:
            lanes[ev["persona_id"]].latest = LaneStep(**ev["step"])
        elif t == "persona_done" and ev["persona_id"] in lanes:
            lanes[ev["persona_id"]].result = PersonaResult(**ev["result"])
        elif t == "stage":
            cost = ev.get("cost_usd", cost)
    return RunState(
        id=run_id, mode="dry_run" if run["mode"] == "dry_run" else "live", url=run["url"], task=run["task"],
        audience=run["audience"], stage=run["stage"], status=run["status"], error=run["error"],
        created_at=run["created_at"], lanes=list(lanes.values()), report_ready=(store.run_dir(run_id) / "report.json").is_file(),
        cost_usd=round(store.run_cost(run_id) or cost, 4),
    )


def markdown_for(report_id: str, file_base: str) -> str | None:
    data = store.read_json(report_id, "report.json")
    return to_markdown(Report(**data), file_base) if data else None
