"""Playwright: one Chromium per run, one isolated context per persona.

observe() = viewport screenshot + interactive elements (tagged with a stable data-fu-id) + visible text
            + quick accessibility facts. act() = click / type / scroll / back with timeouts.
Guards: off-site navigation is blocked, downloads are off, popups are folded back into the tab.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from pathlib import Path
from typing import Any

from playwright.async_api import Browser, BrowserContext, Dialog, Page, Playwright, Route, async_playwright
from playwright.async_api import Error as PWError
from playwright.async_api import TimeoutError as PWTimeout

from .config import settings
from .models import VIEWPORTS, A11yIssue, Action, Element, Observation
from .url_safety import same_site

log = logging.getLogger("fiveusers.browser")

MAX_ELEMENTS = 60
NAV_TIMEOUT_MS = 20_000
ACTION_TIMEOUT_MS = 4_000
UA_DESKTOP = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36 FiveUsersBot/0.1 (+https://github.com/ajitrawat/fiveusers)"
)
UA_MOBILE = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Mobile Safari/537.36 FiveUsersBot/0.1 (+https://github.com/ajitrawat/fiveusers)"
)


OFFSITE_HTML = "<!doctype html><title>Outside the test</title><h1>This page is outside the site being tested.</h1>"


class SiteUnreachable(RuntimeError):
    pass


# Runs in the page. Tags interactive elements, returns what a person could see and use.
OBSERVE_JS = r"""
(opts) => {
  const MAX = opts.max, MOBILE = opts.mobile;
  const vw = window.innerWidth, vh = window.innerHeight;
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],' +
    '[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=option],[role=switch],[onclick],' +
    '[tabindex]:not([tabindex="-1"]),[contenteditable=""],[contenteditable=true]';
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const cut = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const byId = id => { const el = document.getElementById(id); return el ? clean(el.innerText || el.textContent) : ''; };
  const labelText = el => el.labels ? Array.from(el.labels).map(l => clean(l.innerText || l.textContent)).join(' ') : '';
  const isField = el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
  const nameOf = el => {
    const aria = clean(el.getAttribute('aria-label'));
    if (aria) return aria;
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = clean(lb.split(/\s+/).map(byId).join(' ')); if (t) return t; }
    if (isField(el)) {
      if (['submit', 'button', 'reset'].includes(el.type)) return clean(el.value) || (el.type === 'submit' ? 'Submit' : '');
      if (el.type === 'image') return clean(el.alt);
      return labelText(el);
    }
    if (el.tagName === 'IMG') return clean(el.alt);
    const txt = clean(el.innerText || el.textContent);
    if (txt) return txt;
    const img = el.querySelector('img[alt]');
    if (img && clean(img.alt)) return clean(img.alt);
    const t = el.querySelector('svg title');
    if (t && clean(t.textContent)) return clean(t.textContent);
    return clean(el.getAttribute('title'));
  };
  const roleOf = el => {
    const r = el.getAttribute('role');
    if (r) return r;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button' || tag === 'summary') return 'button';
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'label') return 'option';
    if (tag === 'input') {
      const t = el.type;
      if (['checkbox', 'radio'].includes(t)) return t;
      if (['submit', 'button', 'reset', 'image'].includes(t)) return 'button';
      if (t === 'range') return 'slider';
      return 'textbox';
    }
    return 'generic';
  };
  const shown = (r, cs) => r.width >= 1 && r.height >= 1 && cs.visibility !== 'hidden' &&
    cs.display !== 'none' && parseFloat(cs.opacity || '1') > 0.05;
  const firstBox = el => { const rs = el.getClientRects(); return rs.length > 1 ? rs[0] : el.getBoundingClientRect(); };
  const inView = r => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const coveredAt = (el, r) => {
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2));
    const cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const top = document.elementFromPoint(cx, cy);
    if (!top) return false;
    return !(top === el || el.contains(top) || top.contains(el) ||
             (el.labels && Array.from(el.labels).some(l => l.contains(top))));
  };

  let next = window.__fuNext || 1;
  const tag = el => { if (!el.dataset.fuId) el.dataset.fuId = String(next++); return Number(el.dataset.fuId); };

  const items = [];
  const seen = new Set();
  const proxyOf = new Map();  // visible <label> -> the hidden radio/checkbox it stands for
  for (const raw of document.querySelectorAll(SEL)) {
    let el = raw;
    let cs = getComputedStyle(el), r = firstBox(el);
    if (!shown(r, cs) || r.width < 4 || r.height < 4) {
      // Visually hidden radio/checkbox (custom swatches, pills): the visible label is the control.
      if (el.tagName === 'INPUT' && ['radio', 'checkbox'].includes(el.type) && el.labels && el.labels[0]) {
        el = el.labels[0]; cs = getComputedStyle(el); r = firstBox(el);
        if (!shown(r, cs)) continue;
        proxyOf.set(el, raw);
      } else continue;
    }
    if (seen.has(el)) continue;
    if (el.parentElement && el.parentElement.closest('a[href],button,[role=button]')) continue;
    seen.add(el);
    const proxied = proxyOf.get(el);
    const input = proxied || el;
    const role = proxied ? input.type : roleOf(el);
    let name = nameOf(input);
    if (!name && proxied) name = clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText);
    items.push({
      el, r,
      d: {
        id: tag(el),
        tag: el.tagName.toLowerCase(),
        role,
        name: cut(name, 80),
        type: input.tagName === 'INPUT' ? input.type : null,
        placeholder: cut(input.getAttribute && input.getAttribute('placeholder'), 60) || null,
        value: isField(input) && !['checkbox', 'radio', 'submit', 'button'].includes(input.type)
          ? (input.type === 'password' ? (input.value ? '••••' : '') : cut(input.value, 60)) || null : null,
        href: el.tagName === 'A' ? cut(el.getAttribute('href'), 80) : null,
        checked: ['checkbox', 'radio'].includes(input.type) ? !!input.checked : null,
        disabled: !!(input.disabled || el.getAttribute('aria-disabled') === 'true'),
        in_view: inView(r),
        covered: inView(r) ? coveredAt(el, r) : false,
        bbox: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      },
    });
  }
  items.sort((a, b) => (b.d.in_view - a.d.in_view) || (a.r.top - b.r.top) || (a.r.left - b.r.left));
  const kept = items.slice(0, MAX);
  window.__fuNext = next;

  // Visible text the person can read (headings, prices, errors), in DOM order.
  const texts = [];
  let budget = 1600;
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  const done = new Set();
  while (walker.nextNode() && budget > 0) {
    const node = walker.currentNode;
    const t = clean(node.textContent);
    const host = node.parentElement;
    if (!t || !host || done.has(host) || host.closest('script,style,noscript,template')) continue;
    if (host.closest(SEL) && !host.closest('label')) continue;
    const r = host.getBoundingClientRect(), cs = getComputedStyle(host);
    if (!shown(r, cs) || !inView(r)) continue;
    done.add(host);
    const piece = cut(host.innerText || t, 200);
    if (piece && !texts.includes(piece)) { texts.push(piece); budget -= piece.length; }
  }

  // Quick accessibility facts (Python decides what counts as an issue).
  const a11y = [];
  const box = r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  for (const { el, r, d } of kept) {
    const input = proxyOf.get(el) || el;
    if (isField(input) && !['submit', 'button', 'reset', 'image'].includes(input.type)) {
      const named = clean(input.getAttribute('aria-label')) || labelText(input) || input.getAttribute('aria-labelledby');
      if (!named && !proxyOf.has(el)) a11y.push({ kind: 'input_no_label', element_id: d.id, text: d.placeholder || d.name || input.name || '', detail: input.type || input.tagName.toLowerCase(), bbox: box(r) });
    } else if (!d.name && ['button', 'link'].includes(d.role)) {
      a11y.push({ kind: 'control_no_name', element_id: d.id, text: '', detail: d.tag, bbox: box(r) });
    }
    const inlineLink = d.tag === 'a' && getComputedStyle(el).display === 'inline';
    if (MOBILE && d.in_view && !inlineLink && (r.width < 40 || r.height < 40) && d.role !== 'textbox')
      a11y.push({ kind: 'small_target', element_id: d.id, text: d.name, detail: `${Math.round(r.width)}×${Math.round(r.height)}px`, bbox: box(r) });
    if (input.tabIndex > 0) a11y.push({ kind: 'positive_tabindex', element_id: d.id, text: d.name, detail: String(input.tabIndex), bbox: box(r) });
  }
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (!img.hasAttribute('alt') && r.width >= 24 && r.height >= 24 && inView(r))
      a11y.push({ kind: 'img_no_alt', element_id: null, text: cut(img.getAttribute('src'), 60), detail: '', bbox: box(r) });
  }
  // Colors for contrast: controls + small text in view. Background = first opaque ancestor.
  const bgOf = el => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = cs.backgroundColor;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(',').map(Number); if (p.length < 4 || p[3] >= 0.5) return c; }
    }
    return 'rgb(255, 255, 255)';
  };
  const colorFacts = [];
  const candidates = kept.filter(k => k.d.in_view && ['button', 'link'].includes(k.d.role)).map(k => ({ el: k.el, id: k.d.id, name: k.d.name }));
  for (const host of done) if (candidates.length < 60) candidates.push({ el: host, id: null, name: cut(host.innerText, 60) });
  for (const c of candidates) {
    const cs = getComputedStyle(c.el);
    const bg = bgOf(c.el);
    if (!bg || !c.name) continue;
    const r = c.el.getBoundingClientRect();
    colorFacts.push({ element_id: c.id, text: c.name, fg: cs.color, bg, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) || 400, bbox: box(r) });
  }

  const h1 = document.querySelector('h1');
  // textContent keeps the authored case (innerText applies CSS text-transform: uppercase).
  const h = h1 || document.querySelector('h2');
  const heading = clean(h ? h.textContent : '');
  return {
    url: location.href, path: location.pathname + location.search, title: clean(document.title),
    heading: cut(heading, 120), scroll_y: Math.round(window.scrollY),
    page_height: Math.round(document.documentElement.scrollHeight), viewport: [vw, vh],
    elements: kept.map(k => k.d), text: texts.join('\n'), a11y, colors: colorFacts,
  };
}
"""


# ---------- pure helpers (tested) ----------


def parse_rgb(css: str) -> tuple[float, float, float] | None:
    m = re.match(r"rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)", css or "")
    return (float(m.group(1)), float(m.group(2)), float(m.group(3))) if m else None


def _lum(rgb: tuple[float, float, float]) -> float:
    def ch(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast_ratio(fg: tuple[float, float, float], bg: tuple[float, float, float]) -> float:
    a, b = _lum(fg), _lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def contrast_issues(colors: list[dict[str, Any]]) -> list[A11yIssue]:
    """WCAG AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold)."""
    out: list[A11yIssue] = []
    for c in colors:
        fg, bg = parse_rgb(c.get("fg", "")), parse_rgb(c.get("bg", ""))
        if not fg or not bg:
            continue
        ratio = contrast_ratio(fg, bg)
        size, weight = float(c.get("size") or 16), int(c.get("weight") or 400)
        large = size >= 24 or (size >= 18.66 and weight >= 700)
        need = 3.0 if large else 4.5
        if ratio < need:
            out.append(
                A11yIssue(
                    kind="low_contrast",
                    element_id=c.get("element_id"),
                    text=str(c.get("text", ""))[:80],
                    detail=f"{ratio:.1f}:1 (needs {need:.1f}:1)",
                    bbox=tuple(c["bbox"]) if c.get("bbox") else None,  # type: ignore[arg-type]
                )
            )
    return out


FORM_ROLES = {"textbox", "searchbox", "combobox", "checkbox", "radio", "slider"}


def fingerprint(path: str, heading: str, field_names: list[str]) -> str:
    """Same page + same heading + same form fields => same screen.

    Ignores query strings, typed values and navigation chrome, so a phone and a laptop
    looking at the same step of a flow land on the same screen id.
    """
    path = re.sub(r"[?#].*$", "", path or "/")
    key = path + "|" + heading.lower() + "|" + "|".join(sorted({n.lower() for n in field_names if n})[:30])
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]


def describe_element(e: Element) -> str:
    """One line per element for the decide prompt: [12] button "Get started" (covered)."""
    bits = [f"[{e.id}] {e.role}", f'"{e.name}"' if e.name else '""']
    if e.placeholder:
        bits.append(f'placeholder "{e.placeholder}"')
    if e.value:
        bits.append(f'value "{e.value}"')
    if e.checked is not None:
        bits.append("checked" if e.checked else "unchecked")
    if e.href and e.role == "link":
        bits.append(f"→ {e.href}")
    if e.disabled:
        bits.append("disabled")
    if e.covered:
        bits.append("covered by something")
    return " ".join(bits)


# ---------- runtime ----------


class RunBrowser:
    """One Chromium for a whole run."""

    def __init__(self) -> None:
        self._pw: Playwright | None = None
        self._browser: Browser | None = None

    async def start(self) -> None:
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=True, args=settings.chromium_args, channel=settings.browser_channel
        )

    async def close(self) -> None:
        try:
            if self._browser:
                await self._browser.close()
        finally:
            if self._pw:
                await self._pw.stop()

    async def session(self, *, persona_id: str, viewport: str, start_url: str, run_dir: Path) -> "Session":
        assert self._browser, "call start() first"
        w, h = VIEWPORTS.get(viewport, VIEWPORTS["desktop"])
        mobile = viewport == "mobile"
        ctx = await self._browser.new_context(
            viewport={"width": w, "height": h},
            device_scale_factor=1,
            is_mobile=mobile,
            has_touch=mobile,
            user_agent=UA_MOBILE if mobile else UA_DESKTOP,
            accept_downloads=False,
            locale="en-US",
        )
        page = await ctx.new_page()
        s = Session(ctx, page, start_url=start_url, run_dir=run_dir, persona_id=persona_id, mobile=mobile)
        await s.install_guards()
        return s


class Session:
    def __init__(self, ctx: BrowserContext, page: Page, *, start_url: str, run_dir: Path, persona_id: str, mobile: bool):
        self.ctx = ctx
        self.page = page
        self.start_url = start_url
        self.run_dir = run_dir
        self.persona_id = persona_id
        self.mobile = mobile
        self._dialog: str | None = None
        self._blocked: str | None = None
        self._last_url: str | None = None
        page.set_default_timeout(8_000)
        page.set_default_navigation_timeout(NAV_TIMEOUT_MS)

    async def install_guards(self) -> None:
        async def on_route(route: Route) -> None:
            req = route.request
            if req.is_navigation_request() and req.frame == self.page.main_frame and not same_site(req.url, self.start_url):
                self._blocked = req.url
                # Abort/204 leave Playwright waiting on a dead navigation; a tiny stand-in page
                # commits cleanly and act() steps back from it (bfcache keeps typed values).
                await route.fulfill(status=200, content_type="text/html", body=OFFSITE_HTML)
                return
            await route.continue_()

        async def on_dialog(dialog: Dialog) -> None:
            self._dialog = (self._dialog + " / " if self._dialog else "") + dialog.message[:300]
            try:
                await dialog.accept()
            except PWError:
                pass

        async def on_popup(popup: Page) -> None:
            url = popup.url
            await popup.close()
            if url and url != "about:blank" and same_site(url, self.start_url):
                try:
                    await self.page.goto(url, wait_until="domcontentloaded")
                except PWError:
                    pass
            elif url and url != "about:blank":
                self._blocked = url

        await self.ctx.route("**/*", on_route)
        self.page.on("dialog", on_dialog)
        self.ctx.on("page", on_popup)

    async def open(self) -> None:
        try:
            resp = await self.page.goto(self.start_url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
        except PWTimeout as e:
            raise SiteUnreachable("We couldn't load that site (timed out after 20 s). Try a sample or check the URL.") from e
        except PWError as e:
            raise SiteUnreachable(f"We couldn't load that site ({_short_pw(e)}). Try a sample or check the URL.") from e
        if resp is not None and resp.status >= 400:
            raise SiteUnreachable(f"That page answered with HTTP {resp.status}. Check the URL, or try a sample.")
        await self._settle()
        self._last_url = self.page.url

    async def _settle(self) -> None:
        try:
            await self.page.wait_for_load_state("domcontentloaded", timeout=5_000)
            await self.page.wait_for_load_state("networkidle", timeout=3_000)
        except PWError:
            pass
        await asyncio.sleep(0.25)

    async def observe(self, shot_name: str) -> Observation:
        """Screenshot to {run_dir}/{persona}/{shot_name}.jpg and read the screen."""
        rel = f"{self.persona_id}/{shot_name}.jpg"
        out = self.run_dir / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        data: dict[str, Any] | None = None
        for _ in range(2):  # a navigation mid-evaluate destroys the context; retry once
            try:
                data = await self.page.evaluate(OBSERVE_JS, {"max": MAX_ELEMENTS, "mobile": self.mobile})
                break
            except PWError:
                await self._settle()
        if data is None:
            data = {"url": self.page.url, "path": "/", "title": "", "heading": "", "scroll_y": 0, "page_height": 0,
                    "viewport": list(self.page.viewport_size.values()) if self.page.viewport_size else [1280, 800],
                    "elements": [], "text": "", "a11y": [], "colors": []}
        await self.page.screenshot(path=str(out), type="jpeg", quality=70, animations="disabled")

        elements = [Element(**e) for e in data["elements"]]
        a11y = [A11yIssue(**a) for a in data["a11y"]] + contrast_issues(data.get("colors", []))
        fields = [e.name or e.placeholder or e.role for e in elements if e.role in FORM_ROLES]
        screen = fingerprint(data["path"], data["heading"], fields)
        values = "|".join(f"{e.id}={e.value or ''}{e.checked}" for e in elements if e.value or e.checked)
        dialog, blocked = self._dialog, self._blocked
        self._dialog = self._blocked = None
        state = hashlib.sha1(
            f"{screen}|{values}|{data['scroll_y'] // 100}|{dialog}|{data['text'][:400]}".encode()
        ).hexdigest()[:12]
        return Observation(
            url=data["url"],
            path=data["path"],
            title=data["title"],
            heading=data["heading"],
            screen=screen,
            state=state,
            viewport=tuple(data["viewport"]),  # type: ignore[arg-type]
            scroll_y=data["scroll_y"],
            page_height=data["page_height"],
            elements=elements,
            text=data["text"],
            a11y=a11y,
            dialog=dialog,
            blocked_navigation=blocked,
            screenshot=rel,
        )

    async def screenshot_bytes(self, rel: str) -> bytes:
        return (self.run_dir / rel).read_bytes()

    async def act(self, action: Action) -> tuple[bool, str | None]:
        """Execute; returns (ok, error message a person would understand)."""
        page = self.page
        try:
            if action.kind == "scroll":
                dy = (-1 if action.direction == "up" else 1) * int((page.viewport_size or {"height": 800})["height"] * 0.8)
                await page.evaluate("dy => window.scrollBy({top: dy, behavior: 'instant'})", dy)
                await asyncio.sleep(0.3)
                return True, None
            if action.kind == "back":
                resp = await page.go_back(wait_until="domcontentloaded", timeout=8_000)
                await self._settle()
                return (True, None) if resp is not None else (False, "There was no previous page to go back to.")
            if action.kind == "fill":
                return await self._fill(action)
            if action.kind not in {"click", "type"}:
                return True, None

            loc = page.locator(f'[data-fu-id="{action.element_id}"]').first
            if await loc.count() == 0:
                return False, "That element is no longer on the page."
            href = await loc.evaluate(
                "e => { const a = e.closest && e.closest('a[href]'); if (!a) return null;"
                " a.removeAttribute('target'); return a.href; }"
            )
            if action.kind == "click" and href and href.startswith("http") and not same_site(href, self.start_url):
                self._blocked = href
                return False, "That link leaves the site being tested, so it was blocked."
            if action.kind == "click":
                await loc.scroll_into_view_if_needed(timeout=2_000)
                await loc.click(timeout=ACTION_TIMEOUT_MS)
            else:
                await self._type(loc, action.text or "", action.submit)
            await self._settle()
            return True, None
        except PWTimeout as e:
            return False, _friendly_action_error(str(e))
        except PWError as e:
            return False, _friendly_action_error(str(e))
        finally:
            await self._recover()

    async def _recover(self) -> None:
        """If an action ended on the off-site stand-in page (or an error page), return to the site."""
        url = self.page.url
        if same_site(url, self.start_url):
            self._last_url = url
            return
        try:
            await self.page.go_back(wait_until="domcontentloaded", timeout=8_000)
        except PWError:
            pass
        if not same_site(self.page.url, self.start_url) and self._last_url:
            try:
                await self.page.goto(self._last_url, wait_until="domcontentloaded")
            except PWError:
                pass
        await self._settle()

    async def _fill(self, action: Action) -> tuple[bool, str | None]:
        failed: list[str] = []
        for f in action.fields:
            loc = self.page.locator(f'[data-fu-id="{f.element_id}"]').first
            try:
                if await loc.count() == 0:
                    raise PWError("gone")
                await self._type(loc, f.text, False)
            except PWError as e:
                failed.append(f"[{f.element_id}] {_friendly_action_error(str(e))}")
        await self._settle()
        if failed and len(failed) == len(action.fields):
            return False, "None of the fields could be filled: " + "; ".join(failed[:2])
        if failed:
            return False, "Some fields couldn't be filled: " + "; ".join(failed[:2])
        return True, None

    async def _type(self, loc: Any, text: str, submit: bool) -> None:
        tag = await loc.evaluate("e => e.tagName.toLowerCase() + ':' + (e.type || '')")
        if tag.startswith("select"):
            try:
                await loc.select_option(label=text, timeout=ACTION_TIMEOUT_MS)
            except PWError:
                options = await loc.evaluate("e => Array.from(e.options).map(o => [o.value, o.text])")
                want = text.strip().lower()
                match = next((v for v, t in options if want and (want in t.lower() or want == v.lower())), None)
                if match is None:
                    raise
                await loc.select_option(value=match, timeout=ACTION_TIMEOUT_MS)
            return
        if tag.endswith(":checkbox") or tag.endswith(":radio") or tag.startswith("label"):
            await loc.click(timeout=ACTION_TIMEOUT_MS)
            return
        await loc.scroll_into_view_if_needed(timeout=2_000)
        await loc.fill(text, timeout=ACTION_TIMEOUT_MS)
        if submit:
            await loc.press("Enter", timeout=ACTION_TIMEOUT_MS)

    async def close(self) -> None:
        try:
            await self.ctx.close()
        except PWError:
            pass


def _short_pw(e: Exception) -> str:
    msg = str(e).splitlines()[0] if str(e) else type(e).__name__
    m = re.search(r"net::(ERR_[A-Z_]+)", msg)
    return m.group(1) if m else msg[:80]


def _friendly_action_error(msg: str) -> str:
    low = msg.lower()
    if "intercepts pointer events" in low:
        return "Something else on the page is covering it, so the click didn't land."
    if "not visible" in low or "outside of the viewport" in low:
        return "It isn't visible on screen."
    if "not editable" in low or "not an <input>" in low:
        return "That isn't something you can type into."
    if "disabled" in low:
        return "It's disabled."
    if "timeout" in low:
        return "Nothing happened (the page didn't respond in time)."
    if "blockedbyclient" in low or "err_blocked" in low:
        return "That link leaves the site being tested, so it was blocked."
    return "That didn't work."
