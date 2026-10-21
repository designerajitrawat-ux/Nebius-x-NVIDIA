# Feedback on Nebius Token Factory and NVIDIA Nemotron

**From:** Ajit Singh Rawat, building FiveUsers (Nebius x NVIDIA Global AI Hackathon, Best Apps and Agents)

**Date:** 20 October 2026

**Scope:** four Nemotron models on Token Factory, used in production by a multi-agent app, plus six controlled
experiments run specifically for this feedback.

FiveUsers sends five persona agents through a website in real browsers at the same time. Every step of every
persona is a Nemotron call, so one test is 117 to 154 calls across four models. That makes it a good stress test of
the things builders care about: tool calling, vision, reasoning control, latency under parallel load, and cost.

---

## 1. Summary

| # | Finding | Evidence | Impact for builders |
|---|---|---|---|
| 1 | Tool calling on Nemotron 3 Super is production-ready | 29 of 30 structured tool calls, every target valid (E1) | Agents can rely on native `tool_calls` |
| 2 | Nemotron 3.5 Super VL is an excellent judge of UI state | 24 of 24 screenshots judged correctly, about 1 s each (E3) | Use vision, not page text, to verify outcomes |
| 3 | Reasoning is on by default and has no budget | Short answers come back empty 4 of 4 times (E4); 3 of 3 long reports with reasoning on ran into a 12,000-token cap in production | The biggest source of lost time, cost and broken output for us |
| 4 | Models assume it is 2024 or 2025 | Answers ranged from 2024-05-23 to 2025-04-16 on 2026-10-20 (E6) | Correct dates get flagged as bugs unless the date is passed in |
| 5 | Parallel load is handled well | 24 concurrent calls, 0 errors, 3.2 s wall time (E5) | Five agents in parallel need no special handling |
| 6 | Onboarding friction for the hackathon credits | Promo code rejected in Top up; real code arrives by email after a form | Lost time on day one; easy to fix with one sentence |

---

## 2. How we gathered this

**Production telemetry.** Every model call in FiveUsers goes through one client that records model, step, prompt
and completion tokens, cost and latency. On 20 October we ran 13 live tests on our three sample sites:
**1,722 Nemotron calls, 60 Tavily searches, $1.38 total.**

**Controlled experiments.** For this feedback we wrote `scripts/feedback_experiments.py`, which reuses the app's own
prompts, tools, personas and real screenshots recorded by those runs. Raw results for every call are in
`docs/research/feedback-experiments.json`. The six experiments cost $0.07 together and can be re-run with one
command.

**Setup.** Endpoint `https://api.tokenfactory.nebius.com/v1/`, OpenAI Python SDK 3.35.1, account in India, models
`nvidia/Nemotron-3_5-Lightning`, `nvidia/Nemotron-3.5-Super-VL`, `nvidia/nemotron-3-super-120b-a12b`,
`nvidia/Nemotron-3-Ultra-550b-a55b`.

---

## 3. Usage profile (production, 13 runs)

| Model | Role in FiveUsers | Calls | Input tokens | Output tokens | Cost | Share | Latency p50 / p95 |
|---|---|---|---|---|---|---|---|
| Nemotron 3 Super | Writes personas; decides every click and keystroke (tool calls) | 779 | 2,353,721 | 82,992 | $0.781 | 56% | 1.1 s / 2.0 s |
| Nemotron 3.5 Super VL | Reads every screenshot in character; checks every "done"; expert review | 849 | 905,990 | 66,852 | $0.332 | 24% | 1.4 s / 3.3 s |
| Nemotron 3 Ultra | Writes the final report (one call per run) | 15 | 64,899 | 68,368 | $0.270 | 20% | 6.4 s / 31.5 s |
| Nemotron 3.5 Lightning | Names the product category | 19 | 5,566 | 1,163 | $0.001 | <0.1% | 1.5 s / 7.9 s |

Two observations:

- **Routing by tier works.** The cheap, fast calls carry the volume; Ultra runs once per test where the reasoning is
  hardest. A steady-state run costs $0.09 to $0.11.
- **Ultra's share is inflated by runaway reasoning.** Four Ultra calls hit the 12,000-token cap. Those four produced
  48,000 of Ultra's 68,368 output tokens (about $0.14) and no usable report. Without them Ultra is under 10% of spend.

---

## 4. What worked well

### 4.1 Tool calling on Nemotron 3 Super (E1)
We gave Super the real decision prompt for 6 sample pages x 5 personas, with our 8 tools (click, type, fill,
scroll, wait, back, give up, done).

| Metric | Result |
|---|---|
| Structured `tool_calls` returned | **29 / 30** |
| Target element exists on the page | **29 / 29** |
| Tools chosen | click 21, scroll 3, type 3, fill 2 |
| Latency p50 / p95 | 1.4 s / 6.5 s |

The single miss wrote prose until `max_tokens` (400) instead of calling a tool. In production we keep a text-parsing
fallback for exactly this case.

### 4.2 Nemotron 3.5 Super VL as a judge of screens (E3)
We asked "has the participant's goal been achieved, as shown on this screen?" for 24 real screenshots from our runs:
10 success screens and 14 others from the same flow (empty project list, signup form, pricing, home).

| Metric | Result |
|---|---|
| Correct | **24 / 24** (10 true positives, 14 true negatives) |
| Latency p50 / p95 | 1.0 s / 1.3 s |

This replaced a text-only check that failed in production: given the page text, the text models read a kanban
board's own "To do 2 / Done 0" columns as "task not finished" under a large "Your project is ready" heading.

### 4.3 Parallel load (E5)
24 concurrent requests to Nemotron 3.5 Lightning: **24 succeeded, 0 rate-limit errors**, 3.2 s wall time, p95 3.1 s.
In production five personas call two models in parallel, up to our own cap of eight calls in flight, without any special handling.

### 4.4 Drop-in compatibility and accounting
The OpenAI SDK worked unchanged for chat, JSON schema output, tool calls and image input. `usage` on every response
made an exact per-run cost ledger trivial, which we use for a live budget guard.

---

## 5. Issues and recommendations

Severity is from a builder's point of view: High blocks or breaks output, Medium costs hours, Low is polish.

### 5.1 Reasoning is on by default and cannot be budgeted (High)

**What we saw**

- **Short answers vanish (E4).** Super VL, "what is the main heading on this screen?", `max_tokens` 60:
  with default settings, **4 of 4 responses had empty content** (`finish_reason: length`, all 60 tokens spent
  thinking). With `chat_template_kwargs.enable_thinking=false`, **4 of 4 answered correctly in 17 tokens.**
- **Long answers get cut off (production).** Ultra writing a report from about 5,000 tokens of context with a JSON
  schema: **3 of 3 calls with reasoning on used all 12,000 output tokens** (23 to 31 s, about $0.036 each) and
  returned truncated JSON. Our parser salvaged one issue out of a report that should have had six.
- **It is intermittent.** In a controlled rerun with a simpler schema (E2), reasoning on finished normally
  (1,500 tokens, 5 s, 8 issues). And with reasoning off, 1 of 13 production report calls still ran to the cap.
  So it depends on the prompt, which makes it hard to design around.

**What we did:** reasoning off for all four models, truncation (`finish_reason: length`) treated as an error, and
a retry. Reports now take about 5 s and cost about $0.01.

**Recommendations**
1. A reasoning budget parameter (for example `max_reasoning_tokens`) separate from `max_tokens`.
2. Document the reasoning default for each model on its model page, and how to turn it off.
3. Return reasoning in a documented field, and a distinct finish reason when the budget is spent on thinking, so
   clients can tell "thought too long" from "answer too long".

### 5.2 `enable_thinking` is not documented in Token Factory (Medium)
We found `chat_template_kwargs.enable_thinking` in NVIDIA's model documentation, then tested which Token Factory
models accept it. A short "reasoning control" section in the Token Factory docs, with a working request per model,
would have saved most of a day.

### 5.3 Models don't know today's date (Medium) (E6)
Asked for today's date with no context, on 2026-10-20:

| Model | Answer |
|---|---|
| Nemotron 3.5 Lightning | 2025-01-23 |
| Nemotron 3 Super | 2025-04-16 |
| Nemotron 3.5 Super VL | 2024-05-23 |

In production this produced a false critical issue: a correct October 2026 calendar was reported as "shows the wrong
month". We now pass today's date in every prompt. A tip in the docs, or an opt-in way to inject the server date,
would prevent this for every app that deals with schedules, bookings or deadlines.

### 5.4 Model catalogue and naming (Medium)
The hackathon material points to Nemotron 3 Nano Omni for vision; our account lists Nemotron 3.5 Super VL instead.
Model ids also mix styles: `Nemotron-3_5-Lightning` (underscore), `Nemotron-3.5-Super-VL` (dot),
`nemotron-3-super-120b-a12b` (lowercase). A table in the docs of current ids by capability (text, vision, tool
calling, reasoning), with one naming style, would remove guesswork when wiring an app.

### 5.5 Instruction following on counts and formats (Low)
Asked for 3 to 8 issues, one Ultra response returned 16 (E2). One Super decision answered in prose instead of a tool
call (E1). Both are easy to guard in code. Documenting whether `tool_choice: "required"` is supported would let
agents force a tool call instead of retrying.

### 5.6 Hackathon onboarding and billing (Medium for new users)
- The code `NEBIUS-DEVPOST-GLOBAL26` is a form activation code, but the natural place to try it, Balance > Top up >
  With promo code, answers "Invalid promo code". The real code arrives by email after the form. One sentence in that
  error message ("hackathon codes are redeemed at nebius.com/promo-code") would fix it.
- Billing setup requires a card before credits can be used, which surprised us on a promo-funded account. Saying so
  on the signup page would set expectations.
- "Sandboxes" in the console read like a free test tier at first; it is a separate code-execution product.

---

## 6. Prioritised recommendations

| Priority | Recommendation | Why |
|---|---|---|
| 1 | Reasoning budget parameter and documented defaults per model | Empty answers and truncated JSON were our largest time and cost sink |
| 2 | "Reasoning control" docs section with working examples | `enable_thinking` is only discoverable through NVIDIA's docs |
| 3 | Model table by capability with consistent ids | Wiring the right model took trial and error |
| 4 | Date guidance (docs tip or optional server-date injection) | Prevents false bugs in any date-aware app |
| 5 | Clearer hackathon promo error and card requirement note | Day-one friction for every participant |
| 6 | Document `tool_choice: "required"` support | Lets agents avoid prose fallbacks |

---

## 7. Reproduce

```
api\.venv\Scripts\python scripts\feedback_experiments.py
```

Needs `NEBIUS_API_KEY` in `.env` and the web app running locally (for the sample pages). Results are written to
`docs/research/feedback-experiments.json`. Production numbers come from the per-call ledger in the app's database.

Thank you for the credits and for a platform that made a five-agent product practical on a hackathon budget.
