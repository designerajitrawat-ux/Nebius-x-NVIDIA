import pytest

from app.parsing import clamp_int, extract_json, parse_text_tool_calls, short, strip_think

KNOWN = {"click", "type", "fill", "scroll", "back", "give_up", "done"}


def test_strip_think_removes_reasoning_blocks():
    assert strip_think("<think>long chain</think>\nHello") == "Hello"
    assert strip_think("<think>never closed") == ""
    assert strip_think(None) == ""


@pytest.mark.parametrize(
    "text",
    [
        '{"a": 1}',
        'Sure! Here you go:\n```json\n{"a": 1}\n```',
        '<think>hmm {"a": 2}</think>{"a": 1}',
        'prefix {"a": 1,} suffix',  # trailing comma
    ],
)
def test_extract_json_object(text):
    assert extract_json(text, want=dict) == {"a": 1}


def test_extract_json_handles_braces_inside_strings():
    assert extract_json('x {"t": "a } b", "n": [1, 2]} y', want=dict) == {"t": "a } b", "n": [1, 2]}


def test_extract_json_list_and_failure():
    assert extract_json("[1, 2]", want=list) == [1, 2]
    with pytest.raises(ValueError):
        extract_json("no json here")
    with pytest.raises(ValueError):
        extract_json("")


def test_tool_call_qwen_xml_format():
    text = "<tool_call>\n<function=click>\n<parameter=element_id>\n12\n</parameter>\n<parameter=inner_voice>\nWhere now?\n</parameter>\n</function>\n</tool_call>"
    calls = parse_text_tool_calls(text, KNOWN)
    assert len(calls) == 1
    assert calls[0].name == "click"
    assert calls[0].args == {"element_id": 12, "inner_voice": "Where now?"}


def test_tool_call_tagged_json():
    text = '<tool_call>{"name": "type", "arguments": {"element_id": 3, "text": "hi"}}</tool_call>'
    calls = parse_text_tool_calls(text, KNOWN)
    assert calls[0].name == "type" and calls[0].args["text"] == "hi"


def test_tool_call_arguments_as_string():
    text = '{"name": "scroll", "arguments": "{\\"direction\\": \\"down\\"}"}'
    assert parse_text_tool_calls(text, KNOWN)[0].args == {"direction": "down"}


def test_tool_call_action_style_json():
    calls = parse_text_tool_calls('{"action": "give_up", "reason": "too slow", "confusion": 3}', KNOWN)
    assert calls[0].name == "give_up" and calls[0].args["reason"] == "too slow"


def test_tool_call_python_style_only_when_the_whole_reply_is_a_call():
    calls = parse_text_tool_calls("click(element_id=7)", KNOWN)
    assert calls[0].name == "click" and calls[0].args == {"element_id": 7}
    # prose must never become an action (a false "done" would mark the persona as completed)
    assert parse_text_tool_calls("I'll do click(element_id=7)", KNOWN) == []
    assert parse_text_tool_calls("I'm done (finally). I'll click the Sign up button.", KNOWN) == []


def test_reasoning_with_only_a_closing_think_tag():
    text = 'draft {"persona_id": "priya", "step": 3} </think> {"headline": "3 of 5", "issues": []}'
    assert extract_json(text, want=dict) == {"headline": "3 of 5", "issues": []}
    both = '{"persona_id": "priya"} then {"headline": "h", "issues": []}'
    assert extract_json(both, want=dict, required=("headline", "issues"))["headline"] == "h"


def test_tool_call_ignores_unknown_names():
    assert parse_text_tool_calls('{"name": "rm_rf", "arguments": {}}', KNOWN) == []
    assert parse_text_tool_calls("just chatting", KNOWN) == []


def test_clamp_and_short():
    assert clamp_int("2", 0, 3, 1) == 2
    assert clamp_int(9, 0, 3, 1) == 3
    assert clamp_int("x", 0, 3, 1) == 1
    assert short("one two three four", 9) == "one two…"
    assert short("  a   b ", 10) == "a b"


def test_unquote_only_strips_whole_line_quotes():
    from app.parsing import unquote

    assert unquote('"Where do I start?"') == "Where do I start?"
    assert unquote("“Pricing first.”") == "Pricing first."
    assert unquote('"Get started" should be it.') == '"Get started" should be it.'
    assert unquote('"Get started" or "Log in"?') == '"Get started" or "Log in"?'
    assert unquote("plain") == "plain"
