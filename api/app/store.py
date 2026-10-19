"""SQLite (runs, usage, rate limits) + per-run folders on disk.

Layout:  {DATA_DIR}/fiveusers.db
         {DATA_DIR}/runs/{run_id}/personas.json, events.jsonl, report.json, report.md,
                                  {persona_id}/steps.jsonl, {persona_id}/NN.jpg, annotated/*.jpg
Committed demo reports live in {SAMPLES_DIR}/{report_id}/ with the same layout.
"""

from __future__ import annotations

import json
import re
import secrets
import sqlite3
import string
import threading
import time
from pathlib import Path
from typing import Any

from .config import settings

_ID_ALPHABET = string.ascii_lowercase + string.digits
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{2,40}$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    created_at REAL NOT NULL,
    ip TEXT,
    url TEXT NOT NULL,
    task TEXT NOT NULL,
    audience TEXT,
    mode TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    judge INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    run_id TEXT,
    tier TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    ms INTEGER NOT NULL DEFAULT 0,
    step TEXT
);
CREATE INDEX IF NOT EXISTS usage_run ON usage(run_id);
CREATE INDEX IF NOT EXISTS runs_ip ON runs(ip, created_at);
"""


def new_id() -> str:
    return "".join(secrets.choice(_ID_ALPHABET) for _ in range(10))


def valid_id(value: str) -> bool:
    return bool(_ID_RE.match(value))


class Store:
    def __init__(self, data_dir: Path, samples_dir: Path) -> None:
        self.data_dir = data_dir
        self.samples_dir = samples_dir
        self.runs_dir = data_dir / "runs"
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(data_dir / "fiveusers.db", check_same_thread=False, isolation_level=None)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.executescript(SCHEMA)
        # A crash or redeploy can leave runs marked running forever; they can't resume.
        self._db.execute(
            "UPDATE runs SET status='failed', stage='failed', error='Interrupted by a server restart' "
            "WHERE status='running'"
        )

    # ---------- sql ----------

    def _exec(self, sql: str, args: tuple[Any, ...] = ()) -> sqlite3.Cursor:
        with self._lock:
            return self._db.execute(sql, args)

    def _one(self, sql: str, args: tuple[Any, ...] = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._db.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._db.execute(sql, args).fetchall()

    # ---------- runs ----------

    def create_run(self, *, url: str, task: str, audience: str | None, ip: str, mode: str, judge: bool) -> str:
        run_id = new_id()
        self._exec(
            "INSERT INTO runs (id, created_at, ip, url, task, audience, mode, stage, status, judge) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 'running', ?)",
            (run_id, time.time(), ip, url, task, audience, mode, int(judge)),
        )
        self.run_dir(run_id).mkdir(parents=True, exist_ok=True)
        return run_id

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        row = self._one("SELECT * FROM runs WHERE id = ?", (run_id,))
        return dict(row) if row else None

    def set_stage(self, run_id: str, stage: str) -> None:
        self._exec("UPDATE runs SET stage = ? WHERE id = ?", (stage, run_id))

    def finish_run(self, run_id: str, *, status: str, error: str | None = None) -> None:
        stage = "done" if status == "done" else "failed"
        self._exec("UPDATE runs SET status = ?, stage = ?, error = ? WHERE id = ?", (status, stage, error, run_id))

    def count_public_runs(self, since: float) -> int:
        """Non-judge runs from anyone since `since` (server-wide rate backstop)."""
        row = self._one("SELECT COUNT(*) AS n FROM runs WHERE judge = 0 AND created_at >= ?", (since,))
        return int(row["n"]) if row else 0

    def run_starts(self, ip: str, since: float) -> list[float]:
        """Creation times of non-judge runs from this IP since `since` (for rate limiting)."""
        rows = self._all("SELECT created_at FROM runs WHERE ip = ? AND judge = 0 AND created_at >= ?", (ip, since))
        return [r["created_at"] for r in rows]

    # ---------- usage ----------

    def record_usage(
        self,
        *,
        run_id: str | None,
        tier: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        ms: int,
        step: str | None = None,
    ) -> None:
        self._exec(
            "INSERT INTO usage (ts, run_id, tier, model, prompt_tokens, completion_tokens, cost_usd, ms, step) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (time.time(), run_id, tier, model, prompt_tokens, completion_tokens, cost_usd, ms, step),
        )

    def spent_usd(self) -> float:
        row = self._one("SELECT COALESCE(SUM(cost_usd), 0) AS s FROM usage")
        return float(row["s"]) if row else 0.0

    def run_cost(self, run_id: str) -> float:
        row = self._one("SELECT COALESCE(SUM(cost_usd), 0) AS s FROM usage WHERE run_id = ?", (run_id,))
        return float(row["s"]) if row else 0.0

    def run_usage(self, run_id: str) -> list[dict[str, Any]]:
        rows = self._all(
            "SELECT tier, model, COUNT(*) AS calls, SUM(prompt_tokens) AS prompt_tokens, "
            "SUM(completion_tokens) AS completion_tokens, SUM(cost_usd) AS cost_usd "
            "FROM usage WHERE run_id = ? GROUP BY tier, model",
            (run_id,),
        )
        return [dict(r) for r in rows]

    # ---------- files ----------

    def run_dir(self, run_id: str) -> Path:
        return self.runs_dir / run_id

    def report_dir(self, report_id: str) -> Path | None:
        """Folder holding report_id's files: a live run, else a committed sample."""
        if not valid_id(report_id):
            return None
        for base in (self.runs_dir, self.samples_dir):
            d = base / report_id
            if d.is_dir():
                return d
        return None

    def safe_file(self, report_id: str, rel: str) -> Path | None:
        """Resolve rel inside the report folder; None on traversal or missing file."""
        base = self.report_dir(report_id)
        if base is None:
            return None
        target = (base / rel).resolve()
        try:
            target.relative_to(base.resolve())
        except ValueError:
            return None
        return target if target.is_file() else None

    def write_json(self, run_id: str, rel: str, data: Any) -> Path:
        path = self.run_dir(run_id) / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(path)
        return path

    def append_jsonl(self, run_id: str, rel: str, data: Any) -> None:
        path = self.run_dir(run_id) / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock, path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")

    def read_json(self, report_id: str, rel: str) -> Any | None:
        base = self.report_dir(report_id)
        if base is None or not (base / rel).is_file():
            return None
        return json.loads((base / rel).read_text(encoding="utf-8"))

    def read_jsonl(self, run_id: str, rel: str) -> list[Any]:
        path = self.run_dir(run_id) / rel
        if not path.is_file():
            return []
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def list_samples(self) -> list[dict[str, Any]]:
        out = []
        if not self.samples_dir.is_dir():
            return out
        for d in sorted(self.samples_dir.iterdir()):
            meta = d / "sample.json"
            if d.is_dir() and meta.is_file() and (d / "report.json").is_file():
                out.append(json.loads(meta.read_text(encoding="utf-8")))
        return sorted(out, key=lambda s: s.get("order", 99))


store = Store(settings.data_dir, settings.samples_dir)
