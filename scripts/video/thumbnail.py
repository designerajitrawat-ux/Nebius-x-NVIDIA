"""
Render the YouTube thumbnail (1280x720 JPEG, under YouTube's 2 MB limit) from thumbnail.html.

    api\\.venv\\Scripts\\python scripts\\video\\thumbnail.py [frame.jpg]   -> recordings/thumbnail.jpg

The frame defaults to a moment of the recorded live run where all five lanes are busy.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = Path(__file__).with_name("thumbnail.html")
OUT = ROOT / "recordings" / "thumbnail.jpg"


async def main() -> None:
    frame = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "recordings" / "scenes" / "run" / "04833.jpg"
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto(f"{HTML.as_uri()}?img={frame.resolve().as_uri()}", wait_until="networkidle")
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT), type="jpeg", quality=92)
        await browser.close()
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    asyncio.run(main())
