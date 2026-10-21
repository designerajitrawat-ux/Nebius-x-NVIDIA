"""The database copy that lets a scale-to-zero host (Modal) keep runs, usage and rate limits across containers."""

from app.store import Store


def test_backup_restores_into_a_fresh_container(tmp_path):
    data, backup = tmp_path / "volume", tmp_path / "volume" / "fiveusers.db"
    first = Store(data, tmp_path / "samples", tmp_path / "local1" / "fiveusers.db", backup)
    run_id = first.create_run(url="https://example.com", task="Sign up", audience=None, ip="1.2.3.4", mode="live", judge=False)
    first.record_usage(run_id=run_id, tier="agent", model="m", prompt_tokens=10, completion_tokens=5, cost_usd=0.25, ms=100)
    first.finish_run(run_id, status="done")
    assert backup.is_file()

    second = Store(data, tmp_path / "samples", tmp_path / "local2" / "fiveusers.db", backup)
    assert second.get_run(run_id)["status"] == "done"
    assert second.spent_usd() == 0.25
    assert len(second.run_starts("1.2.3.4", 0)) == 1


def test_interrupted_runs_are_marked_failed_after_restore(tmp_path):
    data, backup = tmp_path / "volume", tmp_path / "volume" / "fiveusers.db"
    first = Store(data, tmp_path / "samples", tmp_path / "a.db", backup)
    run_id = first.create_run(url="https://example.com", task="Sign up", audience=None, ip="1.2.3.4", mode="live", judge=False)

    second = Store(data, tmp_path / "samples", tmp_path / "b.db", backup)
    run = second.get_run(run_id)
    assert run["status"] == "failed"
    assert "restart" in run["error"]


def test_no_backup_path_keeps_the_old_layout(tmp_path):
    store = Store(tmp_path, tmp_path / "samples")
    assert (tmp_path / "fiveusers.db").is_file()
    store.backup()  # no-op
