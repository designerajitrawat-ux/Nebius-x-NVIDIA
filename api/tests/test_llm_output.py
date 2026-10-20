"""LLM client output handling with a fake Token Factory client, no network."""

import asyncio
import dataclasses
from types import SimpleNamespace

import pytest

from app.config import settings
from app.llm import LLM, LLMError
from app.store import Store


class FakeCompletions:
    def __init__(self, content: str, finish_reason: str) -> None:
        self.content, self.finish_reason = content, finish_reason
        self.kwargs: list[dict] = []

    async def create(self, **kwargs):
        self.kwargs.append(kwargs)
        msg = SimpleNamespace(content=self.content, tool_calls=None, refusal=None)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=msg, finish_reason=self.finish_reason)],
            usage=SimpleNamespace(prompt_tokens=100, completion_tokens=12000),
        )


def make_llm(tmp_path, content: str, finish_reason: str) -> tuple[LLM, FakeCompletions]:
    cfg = dataclasses.replace(settings, models={"fast": "f", "vision": "v", "agent": "a", "reason": "r"}, thinking_off=True)
    llm = LLM(cfg, Store(tmp_path, tmp_path / "samples"))
    completions = FakeCompletions(content, finish_reason)
    llm._client = SimpleNamespace(chat=SimpleNamespace(completions=completions))  # type: ignore[assignment]
    return llm, completions


SCHEMA = {"type": "object", "properties": {"issues": {"type": "array"}}, "required": ["issues"]}


def test_truncated_json_is_an_error_not_a_partial_report(tmp_path):
    llm, _ = make_llm(tmp_path, '{"issues": [{"title": "Pricing wall"}, {"title": "Unlab', "length")
    with pytest.raises(LLMError, match="max_tokens"):
        asyncio.run(llm.chat_json("reason", [{"role": "user", "content": "x"}], schema=SCHEMA, name="report"))


def test_thinking_flag_controls_the_reasoning_toggle(tmp_path):
    llm, calls = make_llm(tmp_path, '{"issues": []}', "stop")
    msgs = [{"role": "user", "content": "x"}]
    asyncio.run(llm.chat_json("reason", msgs, schema=SCHEMA, name="report"))
    asyncio.run(llm.chat_json("reason", msgs, schema=SCHEMA, name="report", thinking=False))
    asyncio.run(llm.chat("agent", msgs))
    assert "extra_body" not in calls.kwargs[0]  # Ultra thinks by default
    assert calls.kwargs[1]["extra_body"] == {"chat_template_kwargs": {"enable_thinking": False}}
    assert calls.kwargs[2]["extra_body"] == {"chat_template_kwargs": {"enable_thinking": False}}
