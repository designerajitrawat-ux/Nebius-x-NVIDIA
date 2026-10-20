"""Colour words for unnamed swatches, read from screenshot pixels (no browser needed)."""

from PIL import Image

from app.colors import color_name, name_swatch_colors
from app.models import Element


def hex_rgb(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def test_sample_store_palette_has_exactly_one_blue():
    palette = {"Bone": "#ECE5D6", "Black": "#262523", "Heather": "#A3A19C", "Harbor": "#2F67B1", "Moss": "#6B7A4A",
               "Oat": "#D8C8A8", "Rust": "#A2502E", "Slate": "#5F6B77", "Charcoal": "#3C3B39"}
    names = {k: color_name(hex_rgb(v)) for k, v in palette.items()}
    assert [k for k, n in names.items() if "blue" in n] == ["Harbor"]
    assert names["Black"] == "black" and names["Bone"] in {"white", "light grey", "light orange", "light yellow"}


def test_basic_words():
    assert color_name((220, 30, 30)) == "red"
    assert color_name((20, 40, 110)) == "dark blue"
    assert color_name((128, 128, 128)) == "grey"
    assert color_name((255, 255, 255)) == "white"


def test_only_small_unnamed_controls_get_a_colour(tmp_path):
    img = Image.new("RGB", (200, 100), (255, 255, 255))
    img.paste((47, 103, 177), (10, 10, 40, 40))  # a blue swatch
    img.paste((47, 103, 177), (60, 10, 90, 40))  # same colour but labelled
    shot = tmp_path / "s.jpg"
    img.save(shot, quality=90)
    els = [
        Element(id=1, tag="button", role="button", name="", bbox=(10, 10, 30, 30)),
        Element(id=2, tag="button", role="button", name="Harbor", bbox=(60, 10, 30, 30)),
        Element(id=3, tag="div", role="button", name="", bbox=(0, 0, 200, 100)),  # too big for a swatch
    ]
    name_swatch_colors(shot, els, (200, 100))
    assert els[0].color == "blue" and els[1].color is None and els[2].color is None


def test_element_line_says_what_a_sighted_person_sees():
    from app.browser import describe_element

    swatch = Element(id=15, tag="button", role="button", name="", color="blue", selected=True, bbox=(0, 0, 30, 30))
    assert describe_element(swatch) == '[15] button "" looks blue looks selected'
