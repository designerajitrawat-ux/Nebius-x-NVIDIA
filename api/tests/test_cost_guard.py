import pytest

from app.guard import DAY, HOUR, budget_state, is_judge, rate_decision
from app.llm import MAX_RETRY_WAIT_S, compute_cost, retry_wait


def test_compute_cost_per_million():
    # Nemotron Super list price: $0.30 in / $0.90 out per 1M tokens
    assert compute_cost(1_000_000, 0, (0.30, 0.90)) == pytest.approx(0.30)
    assert compute_cost(4000, 300, (0.30, 0.90)) == pytest.approx(0.00147)
    assert compute_cost(-5, -5, (1.0, 3.0)) == 0.0


def test_estimated_run_cost_is_within_budget_target():
    # docs/03 cost model: 60 decisions on Super + 60 vision calls + one Ultra synthesis
    agent = 60 * compute_cost(4000, 300, (0.30, 0.90))
    vision = 60 * compute_cost(1500, 170, (0.06, 0.24))
    ultra = compute_cost(40_000, 4000, (1.00, 3.00))
    assert agent + vision + ultra < 0.30


def test_retry_wait_honors_retry_after_with_cap():
    assert retry_wait(1, "3") == 3.0
    assert retry_wait(1, "999") == MAX_RETRY_WAIT_S
    assert 1.5 <= retry_wait(1, None) <= 2.0
    assert retry_wait(1, "soon") >= 1.5  # unparseable header => backoff


def test_budget_states():
    assert budget_state(5, 30, 40).state == "ok"
    assert budget_state(30, 30, 40).state == "soft"
    b = budget_state(40.5, 30, 40)
    assert b.state == "hard" and b.remaining_usd == 0


def test_rate_limit_hourly_and_daily():
    now = 1_000_000.0
    assert rate_decision([], now, 2, 5) is None
    assert rate_decision([now - 100], now, 2, 5) is None
    wait = rate_decision([now - 1000, now - 100], now, 2, 5)
    assert wait is not None and 0 < wait <= HOUR - 1000 + 1
    # five runs spread over the day block the sixth even if the last hour is quiet
    day = [now - HOUR * k - 10 for k in range(2, 7)]
    wait = rate_decision(day, now, 2, 5)
    assert wait is not None and wait <= DAY


def test_judge_token():
    assert is_judge("abc", "abc")
    assert is_judge(" abc ", "abc")
    assert not is_judge("abd", "abc")
    assert not is_judge(None, "abc")
    assert not is_judge("abc", None)
