"""Per-run event log: appended to events.jsonl and fanned out to live SSE listeners.

A listener first replays everything so far, then waits for new events. After a server restart
the in-memory bus is gone, so listeners replay from the file and stop.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, AsyncIterator

from .store import store

TERMINAL = {"report_ready", "error"}


class RunBus:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.events: list[dict[str, Any]] = []
        self.closed = False
        self._cond = asyncio.Condition()

    async def emit(self, type_: str, **data: Any) -> None:
        event = {"type": type_, **data, "seq": len(self.events) + 1, "ts": time.time()}
        store.append_jsonl(self.run_id, "events.jsonl", event)
        async with self._cond:
            self.events.append(event)
            if type_ in TERMINAL:
                self.closed = True
            self._cond.notify_all()

    async def listen(self, after: int = 0) -> AsyncIterator[dict[str, Any]]:
        idx = max(0, after)
        while True:
            async with self._cond:
                while idx >= len(self.events) and not self.closed:
                    try:
                        await asyncio.wait_for(self._cond.wait(), timeout=15)
                    except asyncio.TimeoutError:
                        break  # let the caller send a keep-alive
                batch = self.events[idx:]
                done = self.closed and idx + len(batch) >= len(self.events)
            if not batch and not done:
                yield {"type": "ping"}
            for ev in batch:
                yield ev
            idx += len(batch)
            if done:
                return


_buses: dict[str, RunBus] = {}


def bus_for(run_id: str) -> RunBus:
    bus = _buses.get(run_id)
    if bus is None:
        bus = _buses[run_id] = RunBus(run_id)
    return bus


def live_bus(run_id: str) -> RunBus | None:
    return _buses.get(run_id)


def drop_bus(run_id: str, delay: float = 600) -> None:
    """Forget a finished run's bus after a while (late listeners then replay from disk)."""

    async def _later() -> None:
        await asyncio.sleep(delay)
        _buses.pop(run_id, None)

    asyncio.get_running_loop().create_task(_later())


def replay_from_disk(run_id: str, after: int = 0) -> list[dict[str, Any]]:
    return [e for e in store.read_jsonl(run_id, "events.jsonl") if e.get("seq", 0) > after]


def sse_format(event: dict[str, Any]) -> str:
    if event.get("type") == "ping":
        return ": ping\n\n"
    return f"event: {event['type']}\nid: {event['seq']}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
