"""
Prove each sample flow is completable *through the agent's own eyes*.

Drives the three sample sites with FiveUsers' browser layer (Session.observe/act), choosing elements
only from the element list a Nemotron persona would see, never by CSS selector. If a step's target is
missing from that list, the persona couldn't do it either, and this script says so.

    api\\.venv\\Scripts\\python scripts\\verify_samples.py              (all flows, desktop + mobile)
    api\\.venv\\Scripts\\python scripts\\verify_samples.py booking mobile

Serves web/public on a random local port; no API, no models, no keys.
"""

from __future__ import annotations

import asyncio
import functools
import os
import http.server
import re
import sys
import tempfile
import threading
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
os.environ.setdefault("ALLOW_PRIVATE_URLS", "true")  # the sample sites are served from localhost

from app.browser import RunBrowser, Session  # noqa: E402
from app.models import Action, Element, FieldEntry, Observation  # noqa: E402


class Gap(Exception):
    """A step the persona could not take because its target isn't in the element list."""


class Driver:
    def __init__(self, session: Session, log: list[str]) -> None:
        self.s = session
        self.log = log
        self.n = 0
        self.obs: Observation | None = None

    async def look(self) -> Observation:
        self.n += 1
        self.obs = await self.s.observe(f"{self.n:02d}")
        return self.obs

    async def find(self, match: Callable[[Element], bool], what: str, scrolls: int = 8) -> Element:
        """First matching element; scrolls down like a person if it's only further down the page."""
        for _ in range(scrolls + 1):
            obs = await self.look()
            hits = [e for e in obs.elements if match(e)]
            visible = [e for e in hits if e.in_view]
            if visible:
                return visible[0]
            if not hits and obs.scroll_y + obs.viewport[1] >= obs.page_height - 5:
                break
            await self.s.act(Action(kind="scroll", direction="down"))
        raise Gap(f"{what}: not in the element list on {self.obs.path if self.obs else '?'}")

    async def click(self, pattern: str, what: str | None = None, role: str | None = None) -> None:
        rx = re.compile(pattern, re.I)
        el = await self.find(lambda e: bool(rx.search(e.name or "")) and (role is None or e.role == role), what or pattern)
        ok, err = await self.s.act(Action(kind="click", element_id=el.id))
        self.log.append(f"click [{el.id}] {el.role} '{el.name[:40]}'" + ("" if ok else f"  FAILED: {err}"))
        if not ok:
            raise Gap(f"click '{el.name}' failed: {err}")

    async def click_el(self, match: Callable[[Element], bool], what: str) -> None:
        el = await self.find(match, what)
        ok, err = await self.s.act(Action(kind="click", element_id=el.id))
        self.log.append(f"click [{el.id}] {el.role} '{el.name[:40]}' ({what})" + ("" if ok else f"  FAILED: {err}"))
        if not ok:
            raise Gap(f"{what} failed: {err}")

    async def fill(self, values: dict[str, str]) -> None:
        """values: regex on name/placeholder -> text. All must be visible together or after scrolling."""
        entries: list[FieldEntry] = []
        missing = dict(values)
        for _ in range(6):
            obs = await self.look()
            for pat, text in list(missing.items()):
                rx = re.compile(pat, re.I)
                el = next((e for e in obs.elements if e.in_view and e.role in {"textbox", "combobox", "searchbox"}
                           and rx.search(f"{e.name} {e.placeholder or ''}")), None)
                if el:
                    entries.append(FieldEntry(element_id=el.id, text=text))
                    del missing[pat]
            if entries:
                ok, err = await self.s.act(Action(kind="fill", fields=entries))
                self.log.append(f"fill {len(entries)} fields" + ("" if ok else f"  FAILED: {err}"))
                if not ok:
                    raise Gap(f"fill failed: {err}")
                entries = []
            if not missing:
                return
            await self.s.act(Action(kind="scroll", direction="down"))
        raise Gap(f"fields not found: {list(missing)}")

    async def expect(self, pattern: str) -> None:
        obs = await self.look()
        if not re.search(pattern, f"{obs.heading}\n{obs.text}", re.I):
            raise Gap(f"expected /{pattern}/ on {obs.path}, saw heading '{obs.heading}'")
        self.log.append(f"reached: {obs.heading}")


async def signup(d: Driver, mobile: bool) -> None:
    await d.click(r"^get started$")
    await d.click(r"continue with fernhill free", "free plan link")
    if mobile:
        await d.click(r"^accept all$", "cookie bar")
    await d.fill({r"full name": "Ada Lovelace", r"work email": "ada@example.com",
                  r"password": "Garden-path-42", r"workspace slug": "ada-studio"})
    await d.click_el(lambda e: e.role == "checkbox" and "terms" in e.name.lower() and not e.checked, "terms checkbox")
    await d.click(r"^submit$")
    await d.click_el(lambda e: e.role == "button" and e.name.strip() in {"", "+"}, "unlabeled + button")
    await d.fill({r"project name": "Website refresh", r"project key": "WEB"})
    await d.click(r"^create$")
    await d.expect(r"your project is ready")


async def checkout(d: Driver, mobile: bool) -> None:
    await d.click(r"everyday tee", "Everyday Tee card")
    obs = await d.look()
    swatches = sorted((e for e in obs.elements if e.role in {"radio", "button"} and not e.name.strip()
                       and 20 <= e.bbox[2] <= 60 and abs(e.bbox[2] - e.bbox[3]) < 6), key=lambda e: (e.bbox[1], e.bbox[0]))
    if len(swatches) < 4:
        raise Gap(f"colour swatches: found {len(swatches)} unnamed round controls")
    ok, err = await d.s.act(Action(kind="click", element_id=swatches[3].id))
    d.log.append(f"click swatch #4 [{swatches[3].id}]" + ("" if ok else f" FAILED {err}"))
    await d.click(r"^m$", "size M")
    await d.click(r"add to bag")
    # Header icons have no names; the bag is the right-most one (the persona sees it in the screenshot).
    head = await d.look()
    icons = [e for e in head.elements if e.in_view and e.role in {"button", "link"} and e.bbox[1] < 120
             and (not e.name.strip() or re.fullmatch(r"\d+", e.name.strip()))]
    if not icons:
        raise Gap("bag icon: no unnamed header icons in the element list")
    bag = max(icons, key=lambda e: e.bbox[0])
    ok, err = await d.s.act(Action(kind="click", element_id=bag.id))
    d.log.append(f"click bag icon [{bag.id}] '{bag.name}'" + ("" if ok else f" FAILED {err}"))
    await d.click(r"^checkout$")
    await d.fill({r"e-?mail": "ada@example.com", r"first name": "Ada", r"last name": "Lovelace",
                  r"street|address": "12 Elm Street", r"city": "Springfield", r"zip|postal": "94110",
                  r"phone": "5550102026"})
    await d.fill({r"state": "CA"})
    await d.click(r"^proceed$")
    await d.fill({r"card number": "4242 4242 4242 4242", r"name on card": "Ada Lovelace",
                  r"expir": "12/28", r"security|cvc|cvv": "123"})
    await d.click(r"^continue$")
    await d.expect(r"order confirmed")


async def booking(d: Driver, mobile: bool) -> None:
    await d.click(r"book (an appointment|now)")
    await d.click(r"^select$")
    await d.click(r"^sat\b", "Saturday chip")
    for slot in ("14:30", "15:30", "16:00", "17:00"):
        obs = await d.look()
        el = next((e for e in obs.elements if e.name.strip() == slot and not e.disabled), None)
        if el:
            if not el.in_view:
                await d.s.act(Action(kind="scroll", direction="down"))
            ok, err = await d.s.act(Action(kind="click", element_id=el.id))
            d.log.append(f"click slot {slot}" + ("" if ok else f" FAILED {err}"))
            if ok:
                break
    else:
        raise Gap("no enabled afternoon slot in the element list")
    await d.click(r"^continue$")
    await d.fill({r"first name": "Ada", r"last name": "Lovelace", r"e-?mail": "ada@example.com",
                  r"mobile|phone": "5550102026", r"birth": "14/03/1988", r"create password": "Garden-path-42",
                  r"confirm password": "Garden-path-42"})
    await d.click_el(lambda e: e.role == "checkbox" and re.search(r"polic|cancel|agree", e.name, re.I) is not None and not e.checked,
                     "booking policy checkbox")
    await d.click(r"^proceed$")
    await d.expect(r"you'?re booked")


FLOWS = {"signup": signup, "checkout": checkout, "booking": booking}


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args: object) -> None:
        pass


def serve(directory: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    handler = functools.partial(_QuietHandler, directory=str(directory))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


async def main(flows: list[str], viewports: list[str]) -> int:
    srv, port = serve(ROOT / "web" / "public")
    rb = RunBrowser()
    await rb.start()
    failures = 0
    out_dir = Path(tempfile.mkdtemp(prefix="fiveusers-verify-"))
    try:
        for flow in flows:
            for vp in viewports:
                url = f"http://127.0.0.1:{port}/samples/{flow}/index.html"
                session = await rb.session(persona_id=f"{flow}-{vp}", viewport=vp, start_url=url, run_dir=out_dir)
                log: list[str] = []
                try:
                    await session.open()
                    await FLOWS[flow](Driver(session, log), vp == "mobile")
                    print(f"PASS  {flow:8} {vp:7} ({len(log)} actions)")
                except Gap as e:
                    failures += 1
                    print(f"FAIL  {flow:8} {vp:7} {e}")
                    for line in log[-6:]:
                        print("        ", line)
                finally:
                    await session.close()
    finally:
        await rb.close()
        srv.shutdown()
    print(f"\nscreenshots: {out_dir}")
    return 1 if failures else 0


if __name__ == "__main__":
    args = sys.argv[1:]
    flows = [a for a in args if a in FLOWS] or list(FLOWS)
    viewports = [a for a in args if a in {"desktop", "mobile"}] or ["desktop", "mobile"]
    sys.exit(asyncio.run(main(flows, viewports)))
