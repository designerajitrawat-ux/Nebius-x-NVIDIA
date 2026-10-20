"""Pure helpers for turning model text into data. No I/O. Unit-tested in tests/test_parsing.py."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from typing import Any

def today_note(today: date | None = None) -> str:
    """Models don't know today's date; without it a correct calendar for this month looks "wrong" to them."""
    d = today or date.today()
    return f"Today is {d.strftime('%A')}, {d.day} {d.strftime('%B %Y')}."


_EM_DASH_RE = re.compile(r"\s*" + chr(0x2014) + r"\s*")


def plain_dashes(value: Any) -> Any:
    """Swap em dashes for a spaced hyphen in every string of a JSON-like value (house style: no em dashes)."""
    if isinstance(value, str):
        return _EM_DASH_RE.sub(" - ", value)
    if isinstance(value, list):
        return [plain_dashes(v) for v in value]
    if isinstance(value, dict):
        return {k: plain_dashes(v) for k, v in value.items()}
    return value


_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_FENCE_RE = re.compile(r"```(?:json|JSON)?\s*(.*?)```", re.DOTALL)


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any]


def strip_think(text: str | None) -> str:
    """Remove reasoning blocks some Nemotron endpoints inline into `content`."""
    if not text:
        return ""
    out = _THINK_RE.sub("", text)
    low = out.lower()
    if "<think>" in low:
        # Unterminated <think>: the answer never started, unless a </think> follows.
        idx = low.rfind("</think>")
        out = out[idx + len("</think>") :] if idx >= 0 else ""
    elif "</think>" in low:
        # The chat template opened <think> in the prompt, so only the closing tag is in the reply.
        out = out[low.rfind("</think>") + len("</think>") :]
    return out.strip()


def _balanced_blocks(text: str, opener: str, closer: str) -> list[str]:
    """Every top-level balanced {...} or [...] substring, respecting JSON strings."""
    blocks: list[str] = []
    depth = 0
    start = -1
    in_str = False
    esc = False
    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"' and depth > 0:
            in_str = True
        elif ch == opener:
            if depth == 0:
                start = i
            depth += 1
        elif ch == closer and depth > 0:
            depth -= 1
            if depth == 0 and start >= 0:
                blocks.append(text[start : i + 1])
                start = -1
    return blocks


def _loads_lenient(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    fixed = re.sub(r",\s*([}\]])", r"\1", raw)  # trailing commas
    fixed = fixed.replace("“", '"').replace("”", '"')  # smart quotes
    return json.loads(fixed)


def extract_json(text: str | None, want: type | None = None, required: tuple[str, ...] = ()) -> Any:
    """Best-effort: the first JSON object/array in `text` (handles fences, <think>, chatter).

    `want` = dict or list narrows which kind is accepted; `required` prefers an object that has those
    keys (so a draft dict quoted in reasoning loses to the real answer). Raises ValueError if nothing parses.
    """
    body = strip_think(text)
    if not body:
        raise ValueError("empty model output")
    candidates: list[str] = [body]
    candidates += [m.strip() for m in _FENCE_RE.findall(body)]
    if want in (None, dict):
        candidates += _balanced_blocks(body, "{", "}")
    if want in (None, list):
        candidates += _balanced_blocks(body, "[", "]")
    fallback: Any = None
    found = False
    for raw in candidates:
        try:
            val = _loads_lenient(raw)
        except (json.JSONDecodeError, ValueError):
            continue
        if want is not None and not isinstance(val, want):
            continue
        if not required or (isinstance(val, dict) and all(k in val for k in required)):
            return val
        if not found:
            fallback, found = val, True
    if found:
        return fallback
    raise ValueError("no JSON found in model output")


def _coerce_args(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            return {}
        try:
            val = _loads_lenient(raw)
            return val if isinstance(val, dict) else {}
        except (json.JSONDecodeError, ValueError):
            return {}
    return {}


def _scalar(v: str) -> Any:
    v = v.strip()
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if v.lower() in {"true", "false"}:
        return v.lower() == "true"
    try:
        return json.loads(v)
    except (json.JSONDecodeError, ValueError):
        return v


_XML_FN_RE = re.compile(r"<function=([\w.-]+)>(.*?)</function>", re.DOTALL)
_XML_PARAM_RE = re.compile(r"<parameter=([\w.-]+)>(.*?)</parameter>", re.DOTALL)
_TAGGED_RE = re.compile(r"<tool_call>(.*?)(?:</tool_call>|$)", re.DOTALL)
_PY_CALL_RE = re.compile(r"\s*([a-z_]+)\s*\(([^()]*)\)\s*\.?\s*")


def parse_text_tool_calls(text: str | None, known: set[str]) -> list[ToolCall]:
    """Recover tool calls that came back as text instead of structured `tool_calls`.

    Handles, in order: Qwen/Nemotron XML (`<function=click><parameter=element_id>3</parameter>`),
    `<tool_call>{json}</tool_call>`, bare JSON (`{"name":..,"arguments":..}` or `{"action":..}`),
    and python-ish `click(element_id=3)`. Only names in `known` are returned.
    """
    body = strip_think(text)
    if not body:
        return []

    calls: list[ToolCall] = []
    for name, inner in _XML_FN_RE.findall(body):
        if name in known:
            args = {k: _scalar(v) for k, v in _XML_PARAM_RE.findall(inner)}
            calls.append(ToolCall(name, args))
    if calls:
        return calls

    chunks = _TAGGED_RE.findall(body) or [body]
    for chunk in chunks:
        try:
            val = extract_json(chunk)
        except ValueError:
            continue
        items = val if isinstance(val, list) else [val]
        for item in items:
            if not isinstance(item, dict):
                continue
            fn = item.get("function") if isinstance(item.get("function"), dict) else None
            name = item.get("name") or (fn or {}).get("name") or item.get("action") or item.get("tool")
            if not isinstance(name, str) or name not in known:
                continue
            raw_args = item.get("arguments", item.get("args", item.get("parameters", (fn or {}).get("arguments"))))
            args = _coerce_args(raw_args) if raw_args is not None else {
                k: v for k, v in item.items() if k not in {"name", "action", "tool", "function"}
            }
            calls.append(ToolCall(name, args))
    if calls:
        return calls

    # Only a reply that is *entirely* a call like click(element_id=3), never prose ("I'm done (finally).").
    whole = _PY_CALL_RE.fullmatch(body)
    for name, argstr in [whole.groups()] if whole else []:
        if name not in known:
            continue
        args: dict[str, Any] = {}
        for part in [p for p in argstr.split(",") if p.strip()]:
            if "=" in part:
                k, v = part.split("=", 1)
                args[k.strip()] = _scalar(v.strip().strip("'\""))
            elif "element_id" not in args:
                args["element_id"] = _scalar(part.strip().strip("'\""))
        calls.append(ToolCall(name, args))
        break
    return calls


_WRAPPING_QUOTES = {('"', '"'), ("“", "”"), ("'", "'"), ("‘", "’")}


def unquote(text: str) -> str:
    """Drop quotes wrapped around a whole line ('"Hi there."' -> 'Hi there.'); keep inner quotes."""
    s = text.strip()
    while len(s) >= 2 and (s[0], s[-1]) in _WRAPPING_QUOTES and s[0] not in s[1:-1] and s[-1] not in s[1:-1]:
        s = s[1:-1].strip()
    return s


def clamp_int(v: Any, lo: int, hi: int, default: int) -> int:
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


def short(text: str | None, n: int) -> str:
    """Collapse whitespace and cut to n chars on a word boundary."""
    s = " ".join((text or "").split())
    if len(s) <= n:
        return s
    cut = s[: n - 1].rsplit(" ", 1)[0]
    return (cut or s[: n - 1]).rstrip(",;:.") + "…"
