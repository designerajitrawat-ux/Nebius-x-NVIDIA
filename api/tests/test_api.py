"""HTTP surface without starting a run (no models configured in tests => 'unconfigured')."""

import json

from fastapi.testclient import TestClient

from app.events import sse_format
from app.main import app

client = TestClient(app)


def test_health_shape():
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["mode"] == "unconfigured"
    assert set(body["models"]) == {"fast", "vision", "agent", "reason"}
    assert body["budget"]["state"] == "ok"
    assert isinstance(body["samples"], list)


def test_runs_refused_when_unconfigured():
    r = client.post("/runs", json={"url": "https://example.com", "task": "Sign up"})
    assert r.status_code == 503
    assert r.json()["detail"]["code"] == "unconfigured"


def test_validation_errors_are_readable():
    r = client.post("/runs", json={"url": "x", "task": ""})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "invalid"


def test_unknown_report_and_traversal():
    assert client.get("/reports/doesnotexist").status_code == 404
    assert client.get("/reports/../../etc").status_code == 404
    assert client.get("/files/abcdefgh/../../fiveusers.db").status_code == 404
    assert client.get("/runs/zzzzzzzzzz").status_code == 404


def test_sse_format():
    out = sse_format({"type": "stage", "seq": 3, "stage": "testing"})
    assert out.startswith("event: stage\nid: 3\ndata: ")
    assert json.loads(out.split("data: ", 1)[1])["stage"] == "testing"
    assert sse_format({"type": "ping"}) == ": ping\n\n"
