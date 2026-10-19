"""HTTP API. See docs/03-architecture.md → API."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, StreamingResponse

from .config import TIERS, model_label, settings
from .events import live_bus, replay_from_disk, sse_format
from .guard import GuardError, guard, is_judge
from .models import RunRequest
from .pipeline import markdown_for, run_pipeline, run_state
from .store import store, valid_id
from .url_safety import BadUrl, check_public, normalize_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("fiveusers.api")

app = FastAPI(title="FiveUsers API", version="0.1.0", docs_url="/docs", redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-FiveUsers-Key", "Last-Event-ID"],
)

_tasks: set[asyncio.Task[None]] = set()  # keep references so runs aren't garbage-collected


def api_error(status: int, code: str, message: str, retry_after: int | None = None) -> JSONResponse:
    headers = {"Retry-After": str(retry_after)} if retry_after else None
    return JSONResponse({"detail": {"code": code, "message": message}}, status_code=status, headers=headers)


@app.exception_handler(RequestValidationError)
async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
    return api_error(400, "invalid", f"Check the {field} field: {first.get('msg', 'invalid value')}.")


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.get("/")
async def root() -> dict[str, Any]:
    return {"name": "FiveUsers API", "health": "/health", "docs": "/docs"}


@app.get("/health")
async def health() -> dict[str, Any]:
    b = guard.budget()
    return {
        "ok": True,
        "mode": settings.mode,
        "models": {t: {"id": settings.models.get(t) or "", "label": model_label(settings.models.get(t), t)} for t in TIERS},
        "budget": {"spent_usd": b.spent_usd, "soft_usd": b.soft_usd, "hard_usd": b.hard_usd,
                   "remaining_usd": b.remaining_usd, "state": b.state},
        "limits": {"per_hour": settings.rate_per_hour, "per_day": settings.rate_per_day,
                   "max_personas": settings.max_personas, "max_steps": settings.max_steps},
        "active_runs": guard.active,
        "samples": store.list_samples(),
    }


@app.get("/samples")
async def samples() -> list[dict[str, Any]]:
    return store.list_samples()


@app.post("/runs")
async def create_run(body: RunRequest, request: Request) -> JSONResponse:
    if settings.mode == "unconfigured":
        return api_error(503, "unconfigured", "The test lab isn't connected to its models yet. Explore the sample reports meanwhile.")
    try:
        url = normalize_url(body.url)
        if not settings.allow_private_urls:
            await check_public(url)
    except BadUrl as e:
        return api_error(400, "bad_url", str(e))
    task = " ".join(body.task.split())
    audience = " ".join(body.audience.split()) if body.audience else None

    ip = client_ip(request)
    judge = is_judge(request.headers.get("x-fiveusers-key"), settings.judge_token)
    try:
        guard.admit(ip, judge)
    except GuardError as e:
        return api_error(e.status, e.code, e.message, e.retry_after)
    try:
        run_id = store.create_run(url=url, task=task, audience=audience, ip=ip, mode=settings.mode, judge=judge)
    except Exception:
        guard.release()
        raise
    t = asyncio.create_task(run_pipeline(run_id, url=url, task=task, audience=audience, mode=settings.mode))
    _tasks.add(t)
    t.add_done_callback(_tasks.discard)
    log.info("run %s started (%s) judge=%s", run_id, url, judge)
    return JSONResponse({"run_id": run_id}, status_code=201)


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> JSONResponse:
    state = run_state(run_id) if valid_id(run_id) else None
    if state is None:
        return api_error(404, "not_found", "We couldn't find that test run.")
    return JSONResponse(state.model_dump())


@app.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request) -> Any:
    if not valid_id(run_id) or store.get_run(run_id) is None:
        return api_error(404, "not_found", "We couldn't find that test run.")
    try:
        after = int(request.headers.get("last-event-id") or 0)
    except ValueError:
        after = 0

    async def stream():
        yield "retry: 3000\n\n"
        bus = live_bus(run_id)
        if bus is None:
            for ev in replay_from_disk(run_id, after):
                yield sse_format(ev)
            return
        async for ev in bus.listen(after):
            if await request.is_disconnected():
                return
            yield sse_format(ev)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.get("/reports/{report_id}.md")
async def report_markdown(report_id: str, request: Request) -> Any:
    base = str(request.base_url).rstrip("/")
    md = markdown_for(report_id, f"{base}/files/{report_id}") if valid_id(report_id) else None
    if md is None:
        return api_error(404, "not_found", "That report doesn't exist (yet).")
    return PlainTextResponse(
        md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="fiveusers-{report_id}.md"'},
    )


@app.get("/reports/{report_id}")
async def get_report(report_id: str) -> Any:
    data = store.read_json(report_id, "report.json") if valid_id(report_id) else None
    if data is None:
        return api_error(404, "not_found", "That report doesn't exist (yet).")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=60"})


@app.get("/files/{report_id}/{path:path}")
async def get_file(report_id: str, path: str) -> Any:
    if not path.endswith((".jpg", ".jpeg", ".png")):
        return api_error(404, "not_found", "No such file.")
    f = store.safe_file(report_id, path)
    if f is None:
        return api_error(404, "not_found", "No such file.")
    return FileResponse(f, headers={"Cache-Control": "public, max-age=86400, immutable"})
