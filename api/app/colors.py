"""What an unnamed control looks like: read its colour from the screenshot and give it a plain name.

The decide model only gets the element list, not the image. A colour swatch with no label is then just
`button ""` five times over, while a sighted person simply sees "the blue one". This puts that one fact
back, and only for small unnamed controls, so labelled UI is described exactly as before.
"""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image

from .models import Element

SWATCH_ROLES = {"button", "radio", "checkbox", "link", "option"}
MAX_SWATCH_PX = 96  # bigger than this and it's a card or an image, not a swatch


def color_name(rgb: tuple[int, int, int]) -> str:
    """Everyday colour words: 'dark blue', 'light grey', 'red', 'brown'."""
    r, g, b = (c / 255 for c in rgb)
    h, lightness, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.15 or (lightness > 0.92 and s < 0.5):
        if lightness > 0.9:
            return "white"
        if lightness < 0.18:
            return "black"
        return "light grey" if lightness > 0.65 else ("dark grey" if lightness < 0.35 else "grey")
    deg = h * 360
    if deg < 15 or deg >= 345:
        base = "red"
    elif deg < 40:
        base = "orange"
    elif deg < 65:
        base = "yellow"
    elif deg < 165:
        base = "green"
    elif deg < 195:
        base = "teal"
    elif deg < 255:
        base = "blue"
    elif deg < 290:
        base = "purple"
    else:
        base = "pink"
    if base in {"orange", "red"} and lightness < 0.35:
        return "brown"
    if lightness > 0.72:
        return f"light {base}"
    if lightness < 0.3:
        return f"dark {base}"
    return base


def _center_color(img: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int]:
    """Median colour of the middle of a box (skips borders, rings and rounded corners)."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    inner = img.crop((x0 + w // 4, y0 + h // 4, x1 - w // 4, y1 - h // 4)).convert("RGB")
    raw = inner.tobytes()
    pixels = [tuple(raw[i:i + 3]) for i in range(0, len(raw), 3)] or [(255, 255, 255)]
    return tuple(sorted(px[i] for px in pixels)[len(pixels) // 2] for i in range(3))  # type: ignore[return-value]


def name_swatch_colors(screenshot: Path, elements: list[Element], viewport: tuple[int, int]) -> None:
    """Set `color` on small, unnamed, visible controls, reading the pixels under each one."""
    candidates = [
        e for e in elements
        if not e.name and e.role in SWATCH_ROLES and e.in_view and not e.covered
        and 6 <= e.bbox[2] <= MAX_SWATCH_PX and 6 <= e.bbox[3] <= MAX_SWATCH_PX
    ]
    if not candidates:
        return
    with Image.open(screenshot) as img:
        scale = img.width / max(1, viewport[0])  # screenshots can be 2-3x on phones
        for e in candidates:
            x, y, w, h = (v * scale for v in e.bbox)
            box = (int(x), int(y), int(x + w), int(y + h))
            if box[0] < 0 or box[1] < 0 or box[2] > img.width or box[3] > img.height:
                continue
            name = color_name(_center_color(img, box))
            # White is almost always the page behind an icon button, which would only add noise.
            e.color = None if name == "white" else name
