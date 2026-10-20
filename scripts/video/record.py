"""
Record the demo video's scenes as crisp 1920x1080 frames (Chrome screencast), with a visible cursor and
on-screen captions. Starts one real live run (about $0.10 of Nemotron credits).

    api\\.venv\\Scripts\\python scripts\\video\\record.py --web http://localhost:3000 --api http://127.0.0.1:7860

Writes recordings/scenes/<scene>/NNNNN.jpg plus recordings/scenes/scenes.json (frame times per scene).
Then run scripts/video/build.py to cut the film.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import os
import time
from pathlib import Path

import httpx
from playwright.async_api import CDPSession, Page, async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "recordings" / "scenes"
CARDS = (Path(__file__).resolve().parent / "cards.html").as_uri()

# A designed cursor and a caption pill, injected into every page we film.
OVERLAY_JS = r"""
(() => {
  if (document.getElementById('fu-cursor')) return;
  const host = document.body;
  const css = document.createElement('style');
  css.textContent = `
    #fu-cursor{position:fixed;left:0;top:0;width:26px;height:26px;pointer-events:none;z-index:2147483647;transform:translate(-3px,-2px);transition:transform .08s}
    #fu-cursor.down{transform:translate(-3px,-2px) scale(.86)}
    .fu-ripple{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:2px solid rgba(109,92,255,.9);pointer-events:none;z-index:2147483646;animation:fu-r .6s ease-out forwards}
    @keyframes fu-r{from{transform:scale(.2);opacity:1}to{transform:scale(1.4);opacity:0}}
    #fu-cap{position:fixed;left:50%;bottom:34px;transform:translate(-50%,16px);opacity:0;z-index:2147483645;pointer-events:none;
      padding:14px 26px;border-radius:999px;font:600 22px/1.25 "Instrument Sans",var(--font-display),system-ui,sans-serif;letter-spacing:-.01em;white-space:nowrap;
      transition:opacity .45s ease, transform .45s cubic-bezier(.2,.7,.2,1);backdrop-filter:blur(18px) saturate(1.4)}
    #fu-cap.show{opacity:1;transform:translate(-50%,0)}
    #fu-cap.light{background:rgba(255,255,255,.9);color:#17191c;border:1px solid #fff;box-shadow:0 18px 40px -16px rgba(40,30,90,.35)}
    #fu-cap.dark{background:rgba(23,25,37,.85);color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 40px -16px rgba(0,0,0,.7)}
    #fu-cap b{color:#6d5cff} #fu-cap.dark b{color:#d4ff3f}
    #fu-tag{position:fixed;right:24px;bottom:34px;z-index:2147483645;pointer-events:none;padding:8px 14px;border-radius:999px;font:600 14px/1 Inter,system-ui;background:rgba(212,255,63,.95);color:#17191c}
  `;
  css.id = 'fu-css'; host.appendChild(css);
  const c = document.createElement('div'); c.id='fu-cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2l17 9.2-7.6 1.6-3.4 7.2z" fill="#17191c" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  host.appendChild(c);
  addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', e => { c.classList.add('down'); const r = document.createElement('div'); r.className='fu-ripple'; r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; host.appendChild(r); setTimeout(()=>r.remove(),700); }, true);
  addEventListener('mouseup', () => c.classList.remove('down'), true);
  window.__caption = (html, tone) => {
    let el = document.getElementById('fu-cap');
    if (!el) { el = document.createElement('div'); el.id = 'fu-cap'; host.appendChild(el); }
    if (!html) { el.classList.remove('show'); return; }
    el.className = tone || 'light'; el.innerHTML = html; requestAnimationFrame(() => el.classList.add('show'));
  };
  new MutationObserver(() => {
    for (const el of [css, c]) if (!el.isConnected) host.appendChild(el);
  }).observe(host, { childList: true });
  window.__tag = (text) => { let t = document.getElementById('fu-tag'); if (!text) { t && t.remove(); return; } if (!t) { t = document.createElement('div'); t.id = 'fu-tag'; host.appendChild(t); } t.textContent = text; };
})();
"""


class Recorder:
    """Chrome screencast into numbered JPEGs with their capture times."""

    def __init__(self, page: Page, name: str):
        self.page, self.name = page, name
        self.dir = OUT / name
        self.dir.mkdir(parents=True, exist_ok=True)
        for f in self.dir.glob("*.jpg"):
            f.unlink()
        self.frames: list[tuple[float, str]] = []
        self.cdp: CDPSession | None = None

    async def __aenter__(self):
        self.cdp = await self.page.context.new_cdp_session(self.page)
        self.cdp.on("Page.screencastFrame", self._on_frame)
        await self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": 1920, "maxHeight": 1080, "everyNthFrame": 1})
        self.t0 = time.time()
        return self

    def _on_frame(self, params: dict) -> None:
        path = self.dir / f"{len(self.frames):05d}.jpg"
        path.write_bytes(base64.b64decode(params["data"]))
        self.frames.append((time.time() - self.t0, path.name))
        asyncio.create_task(self.cdp.send("Page.screencastFrameAck", {"sessionId": params["sessionId"]}))

    async def __aexit__(self, *exc):
        await asyncio.sleep(0.3)
        await self.cdp.send("Page.stopScreencast")
        self.duration = time.time() - self.t0
        await self.cdp.detach()


async def overlay(page: Page) -> None:
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(400)  # let React hydrate first, it removes foreign nodes
    await page.evaluate(OVERLAY_JS)


async def caption(page: Page, html: str | None, tone: str = "light") -> None:
    await page.evaluate("([h, t]) => window.__caption && window.__caption(h, t)", [html, tone])


async def glide(page: Page, x: float, y: float, steps: int = 28) -> None:
    await page.mouse.move(x, y, steps=steps)


async def center_of(page: Page, locator) -> tuple[float, float]:
    box = await locator.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


async def smooth_to(page: Page, locator, block: str = "center", wait: float = 1.6) -> None:
    await locator.evaluate(f"el => el.scrollIntoView({{behavior: 'smooth', block: '{block}'}})")
    await page.wait_for_timeout(int(wait * 1000))


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default="http://localhost:3000")
    ap.add_argument("--api", default="http://127.0.0.1:7860")
    ap.add_argument("--site", default=None, help="URL typed into the form (default: the web app's signup sample)")
    ap.add_argument("--outro-url", default="Link in the description")
    ap.add_argument("--key", default=os.environ.get("FIVEUSERS_KEY"),
                    help="Judge token (X-FiveUsers-Key) to skip the rate limit; also read from FIVEUSERS_KEY. Never printed.")
    args = ap.parse_args()
    site = args.site or f"{args.web.rstrip('/')}/samples/signup/index.html"
    meta: dict[str, dict] = {}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="chrome", args=["--hide-scrollbars"])
        cards_ctx = await browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1.5)
        cards = await cards_ctx.new_page()
        ctx = await browser.new_context(viewport={"width": 1440, "height": 810}, device_scale_factor=4 / 3)
        page = await ctx.new_page()
        if args.key:
            # Judge access for the one run the film starts, so takes don't count against the public limit.
            async def with_key(route):
                if route.request.method == "POST":
                    await route.continue_(headers={**route.request.headers, "x-fiveusers-key": args.key})
                else:
                    await route.continue_()
            await ctx.route("**/runs", with_key)

        # 1-3. Title cards
        for card, secs in (("intro", 6.5), ("problem", 7.0), ("bridge", 5.0)):
            await cards.goto(f"{CARDS}?card={card}", wait_until="networkidle")
            await cards.wait_for_timeout(600)  # fonts settle while the animations are held
            async with Recorder(cards, card) as r:
                await cards.wait_for_timeout(250)
                await cards.evaluate("document.body.classList.remove('hold')")
                await cards.wait_for_timeout(int(secs * 1000))
            meta[card] = {"frames": r.frames, "duration": r.duration}
            print("recorded", card, len(r.frames), "frames")

        # 4. Landing hero: eyes follow the cursor, type, pick a task, run.
        await page.goto(args.web, wait_until="networkidle")
        await overlay(page)
        await page.wait_for_timeout(2000)
        await page.mouse.move(200, 160)
        async with Recorder(page, "hero") as r:
            await page.wait_for_timeout(800)
            for x, y in ((470, 250), (1190, 290), (1010, 580), (340, 520), (720, 330)):
                await glide(page, x, y, steps=36)
                await page.wait_for_timeout(250)
            await caption(page, "Paste a link. Say what to try.")
            url = page.locator("input[inputmode=url]")
            ux, uy = await center_of(page, url)
            await glide(page, ux, uy)
            await page.mouse.down(); await page.mouse.up()
            await page.wait_for_timeout(400)
            await url.type(site, delay=45)
            await page.wait_for_timeout(500)
            chip = page.get_by_role("button", name="Sign up and create your first project")
            cx, cy = await center_of(page, chip)
            await glide(page, cx, cy)
            await page.mouse.down(); await page.mouse.up()
            await caption(page, "Five testers are <b>watching you</b> fill it in.")
            await page.wait_for_timeout(2200)
            run = page.get_by_role("button", name="Run the test")
            rx, ry = await center_of(page, run)
            await glide(page, rx, ry)
            await page.wait_for_timeout(500)
            await caption(page, None)
            await page.mouse.down(); await page.mouse.up()
            await page.wait_for_timeout(1400)
        meta["hero"] = {"frames": r.frames, "duration": r.duration}
        print("recorded hero", len(r.frames))

        # 5. The live run (filmed in real time, sped up in the edit).
        await page.wait_for_url("**/run/**", timeout=60000)
        run_id = page.url.rstrip("/").split("/")[-1]
        print("run", run_id)
        await overlay(page)
        captions = {
            "recruiting": ("<b>Tavily</b> researches who uses this kind of product", "dark"),
            "testing": ("Every step runs on <b>NVIDIA Nemotron</b> via <b>Nebius Token Factory</b>", "dark"),
            "testing2": ("<b>Nemotron 3.5 Super VL</b> sees the screen. <b>Nemotron 3 Super</b> decides.", "dark"),
            "testing3": ("Their faces show how confused they are, step by step", "dark"),
            "reviewing": ("An expert pass reviews every screen they saw", "dark"),
            "writing": ("<b>Nemotron 3 Ultra</b> writes the report", "dark"),
        }
        async with Recorder(page, "run") as r:
            await page.evaluate("t => window.__tag && window.__tag(t)", "Live run · sped up 3.5x")
            await page.mouse.move(1180, 120, steps=10)
            shown: set[str] = set()
            t_testing = None
            async with httpx.AsyncClient(timeout=10) as http:
                for _ in range(600):
                    st = (await http.get(f"{args.api}/runs/{run_id}")).json()
                    stage = st.get("stage")
                    now = time.time()
                    if stage == "testing" and t_testing is None:
                        t_testing = now
                    key = stage
                    if stage == "testing" and t_testing:
                        key = "testing" if now - t_testing < 24 else "testing2" if now - t_testing < 48 else "testing3"
                    if key in captions and key not in shown:
                        shown.add(key)
                        await caption(page, *captions[key])
                        if key == "testing2":
                            lanes = page.get_by_text("each in their own browser").first
                            if await lanes.count():
                                await lanes.evaluate("el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth'})")
                        if key == "reviewing":
                            await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
                    if st.get("status") in ("done", "failed") or st.get("report_ready"):
                        break
                    await asyncio.sleep(1)
            await caption(page, None, "dark")
            await page.wait_for_timeout(2500)
            btn = page.get_by_role("link", name="Read the report")
            await btn.scroll_into_view_if_needed()
            await page.wait_for_timeout(800)
            bx, by = await center_of(page, btn)
            await glide(page, bx, by, steps=24)
            await page.wait_for_timeout(5500)
        meta["run"] = {"frames": r.frames, "duration": r.duration, "run_id": run_id}
        print("recorded run", len(r.frames), round(r.duration), "s")

        # 6. The report.
        await page.mouse.down(); await page.mouse.up()
        await page.wait_for_url("**/r/**", timeout=60000)
        await overlay(page)
        await page.evaluate("window.__tag && window.__tag(null)")  # the report plays in real time
        await page.wait_for_timeout(1200)
        async with Recorder(page, "report") as r:
            await caption(page, "Who finished, and who didn't")
            await page.wait_for_timeout(3500)
            await smooth_to(page, page.get_by_text("The testers", exact=False).first, "center", 3.5)
            issue = page.locator("article").first
            await caption(page, "Every issue is <b>pinned on the real screen</b>")
            await smooth_to(page, issue, "start", 3.8)
            await caption(page, "In the tester's own words, with the <b>fix to ship</b>")
            toggle = page.get_by_role("tab").filter(has_text="After").or_(page.get_by_role("tab").filter(has_text="Proposed")).first
            if await toggle.count():
                await smooth_to(page, toggle, "center", 1.8)
                tx, ty = await center_of(page, toggle)
                await glide(page, tx, ty)
                await page.mouse.down(); await page.mouse.up()
                await page.wait_for_timeout(1200)
                before = page.get_by_role("tab").filter(has_text="Before").or_(page.get_by_role("tab").filter(has_text="Now")).first
                if await before.count():
                    bx, by = await center_of(page, before)
                    await glide(page, bx, by, steps=14)
                    await page.mouse.down(); await page.mouse.up()
                    await page.wait_for_timeout(1300)
                    await glide(page, tx, ty, steps=14)
                    await page.mouse.down(); await page.mouse.up()
                    await page.wait_for_timeout(1200)
            refs = page.get_by_text("See how others do it").first
            if await refs.count():
                await caption(page, "How other products solve it, found by <b>Tavily</b>")
                await smooth_to(page, refs, "center", 3.4)
            usage = page.locator("#usage")
            if await usage.count():
                await caption(page, "Every Nemotron call and its cost: <b>about ten cents</b> a test")
                await smooth_to(page, usage, "start", 4.5)
            await caption(page, None)
            await page.wait_for_timeout(800)
        meta["report"] = {"frames": r.frames, "duration": r.duration}
        print("recorded report", len(r.frames))

        # 7. Under the hood on the landing page.
        await page.goto(args.web, wait_until="networkidle")
        await overlay(page)
        await page.wait_for_timeout(1000)
        hood = page.locator("#hood-title")
        await hood.evaluate("el => el.scrollIntoView({block: 'start'})")
        await page.evaluate("window.scrollBy(0, -130)")
        await page.wait_for_timeout(1500)
        async with Recorder(page, "hood") as r:
            await caption(page, "Four Nemotron models, each on the job it does best", "dark")
            await page.wait_for_timeout(2500)
            await page.evaluate("window.scrollBy({top: 380, behavior: 'smooth'})")
            await page.wait_for_timeout(5000)
            await caption(page, None, "dark")
            await page.wait_for_timeout(600)
        meta["hood"] = {"frames": r.frames, "duration": r.duration}

        # 8. Outro card.
        await cards.goto(f"{CARDS}?card=outro&url={args.outro_url}", wait_until="networkidle")
        await cards.wait_for_timeout(600)
        async with Recorder(cards, "outro") as r:
            await cards.wait_for_timeout(250)
            await cards.evaluate("document.body.classList.remove('hold')")
            await cards.wait_for_timeout(8500)
        meta["outro"] = {"frames": r.frames, "duration": r.duration}
        await browser.close()

    (OUT / "scenes.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print("wrote", OUT / "scenes.json")


if __name__ == "__main__":
    asyncio.run(main())
