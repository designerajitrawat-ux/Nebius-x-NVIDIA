from pathlib import Path

from PIL import Image

from app.browser import contrast_issues, contrast_ratio, fingerprint, parse_rgb
from app.models import Pin
from app.report import annotated_name, draw_pins, pin_for_bbox, task_phrase
from app.url_safety import BadUrl, is_public_ip, normalize_url, same_site

import pytest


def test_pin_is_element_center_relative():
    pin = pin_for_bbox((100, 200, 200, 40), (1280, 800))
    assert pin.x == pytest.approx(200 / 1280, abs=1e-3)
    assert pin.y == pytest.approx(220 / 800, abs=1e-3)


def test_pin_clamps_to_visible_part_and_edges():
    # element hanging off the bottom: pin sits on the visible part, not below the screenshot
    pin = pin_for_bbox((10, 780, 50, 100), (1280, 800))
    assert pin.y < 1
    assert pin.x > 0  # kept clear of the left edge so the circle isn't cut
    assert pin_for_bbox(None, (1280, 800)) == Pin(x=0.5, y=0.35)


def test_task_phrase():
    assert task_phrase("Sign up and create your first project") == "sign up and create their first project"
    assert task_phrase("Book a haircut.") == "book a haircut"
    assert task_phrase("") == "finish the task"


def test_draw_pins(tmp_path: Path):
    src = tmp_path / "s.jpg"
    Image.new("RGB", (400, 300), "white").save(src)
    dst = tmp_path / annotated_name("p/01.jpg")
    draw_pins(src, dst, [(1, Pin(x=0.5, y=0.5))])
    img = Image.open(dst).convert("RGB")
    r, g, b = img.getpixel((192, 150))  # inside the pin, left of the numeral
    assert r > 200 and g < 120  # signal orange


def test_contrast():
    assert contrast_ratio((0, 0, 0), (255, 255, 255)) == pytest.approx(21, abs=0.01)
    assert parse_rgb("rgba(10, 20, 30, 0.5)") == (10, 20, 30)
    assert parse_rgb("oklch(0.5 0.1 200)") is None
    issues = contrast_issues([
        {"fg": "rgb(187, 187, 187)", "bg": "rgb(255, 255, 255)", "size": 14, "weight": 400, "text": "faint", "bbox": [0, 0, 10, 10]},
        {"fg": "rgb(0, 0, 0)", "bg": "rgb(255, 255, 255)", "size": 14, "weight": 400, "text": "fine", "bbox": [0, 0, 10, 10]},
        # 3.5:1 is fine for large text
        {"fg": "rgb(130, 130, 130)", "bg": "rgb(255, 255, 255)", "size": 28, "weight": 400, "text": "big", "bbox": None},
    ])
    assert [i.text for i in issues] == ["faint"]


def test_fingerprint_ignores_query_and_order():
    a = fingerprint("/signup.html?plan=team", "Create your account", ["Email", "Password"])
    b = fingerprint("/signup.html?plan=free", "Create your account", ["Password", "Email"])
    c = fingerprint("/signup.html", "Create your project", ["Email", "Password"])
    assert a == b != c


def test_url_rules():
    assert normalize_url("example.com") == "https://example.com/"
    assert normalize_url(" https://a.b/c?d=1#frag ") == "https://a.b/c?d=1"
    for bad in ("", "ftp://x.y", "https://user:pw@x.y", "http://"):
        with pytest.raises(BadUrl):
            normalize_url(bad)
    assert is_public_ip("8.8.8.8")
    assert not is_public_ip("127.0.0.1")
    assert not is_public_ip("10.1.2.3")
    assert not is_public_ip("169.254.169.254")
    assert not is_public_ip("::1")
    assert same_site("https://www.a.com/x", "http://a.com/y")
    assert not same_site("https://a.com", "https://evil.com")
