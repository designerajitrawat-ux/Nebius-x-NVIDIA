# 03 · Architecture

## System overview

```
┌──────────────┐   POST /runs        ┌──────────────────────────────────────────┐
│  web (Next)  │ ──────────────────▶ │  api (FastAPI)                           │
│  Vercel      │   GET /runs/:id/sse │   ├─ guard.py   budget + rate limit      │
│              │ ◀────────────────── │   ├─ browser.py Playwright (Chromium)    │
│  / start     │   GET /reports/:id  │   ├─ personas.py (Tavily + Nemotron)     │
│  /run/:id    │                     │   ├─ walker.py  5× persona agents        │
│  /r/:id      │                     │   ├─ expert.py  heuristics + a11y        │
└──────────────┘                     │   ├─ synthesis.py (Nemotron Ultra)       │
                                     │   └─ store.py  SQLite + /data/runs/:id/  │
                                     │  HF Spaces (Docker, 2 vCPU, 16 GB)       │
                                     └───────────┬──────────────┬───────────────┘
                                                 │              │
                                   Nebius Token Factory      Tavily API
                                   (Nemotron family)         (search/extract)
```

## Model routing (the "effective use of Nemotron" story)

| Step | Model env var | Expected ID (verify on Day 0) | Why this tier |
|---|---|---|---|
| Product category, JSON repair | `NEMOTRON_FAST` (3.5 Lightning / Nano 30B) | `nvidia/Nemotron-3_5-Lightning` | tiny calls, $0.06/M |
| Screenshot → "what this persona sees"; expert heuristic review | `NEMOTRON_VISION` (3.5 Super VL) | `nvidia/Nemotron-3.5-Super-VL` | the multimodal Nemotron on our account (Nano Omni isn't listed) |
| Persona generation; per-step decide (tool calls) | `NEMOTRON_AGENT` (3 Super 120B) | `nvidia/nemotron-3-super-120b-a12b` | agentic reasoning at $0.30/M |
| Final synthesis + prioritization + fixes | `NEMOTRON_REASON` (3 Ultra 550B) | `nvidia/Nemotron-3-Ultra-550b-a55b` | one big call per run, heaviest reasoning |

Model IDs must be confirmed from `GET /v1/models` on Day 0 and written into `.env`. Never hardcode IDs in code;
`llm.py` reads them from env and exposes `chat(tier, ...)` / `chat_json(tier, ...)`.

## Decisions made while building (19 Oct)

- **`fill` tool**: personas fill several form fields in one step (a person fills a form as one unit). Without
  it a 6-field form ate half a persona's patience and doubled model calls.
- **Thinking off** for fast/vision/agent calls via `chat_template_kwargs.enable_thinking=false`; Ultra keeps
  thinking. If an endpoint rejects the field, `llm.py` drops it for the process and retries (tested with a mock).
- **Five walkers at once** (`WALKER_CONCURRENCY=5`): all five lanes go live together, which is the demo moment.
- **Screen identity** = path (no query) + heading + form-field names, so phone and laptop visits of the same step
  merge in the friction map.
- **Off-site guard**: off-site links are refused before clicking; JS navigations get a stand-in page and the
  browser steps back (abort/204 left Playwright waiting on a dead navigation).
- **Grounded synthesis**: pins come from recorded element boxes, quotes must be verbatim inner-voice lines,
  persona ids are validated; Ultra → Super → deterministic fallback, so a run always ends in a report.
- **`DRY_RUN=true`**: a scripted brain runs the whole pipeline with zero model calls, for UI work and tests.

## Token Factory API facts (verified from official docs, 19 Oct)

- **Vision input**: OpenAI-style `content: [{type:"text"}, {type:"image_url", image_url:{url: ...}}]`. Base64
  data URLs are supported; our screenshots live on disk, so send `data:image/jpeg;base64,...`. Confirm on Day 0
  that the vision model ID accepts images (verified 20 Oct: Super VL does, with thinking off) (the docs example uses a Qwen VL model; test ours).
- **Structured output**: `response_format={"type":"json_schema","json_schema":{name, schema, strict}}` or
  `{"type":"json_object"}`. Only models tagged "JSON mode" on their card support it. Docs recommend putting the
  schema **in the prompt too**. Always handle `message.refusal` and invalid JSON.
- **Function calling**: OpenAI-compatible `tools` + `tool_choice` (`"auto"` or forced single function). Model
  doesn't execute; we do. Test Nemotron Super's reliability on Day 2; fall back to `json_schema` decide-step.
- **Rate limits**: dynamic, rolling 15-min windows; 429 with `Retry-After`; headers
  `x-ratelimit-remaining-requests/-tokens`; `x-ratelimit-over-limit: yes` = warning. Our client must honor
  `Retry-After` and cap concurrency (5 personas × vision+agent calls is fine, but don't fan out further).
- Also exists on Token Factory (not used in v1, mention in "what's next"): embeddings, rerank, Batch API,
  **Sandboxes** (isolated code execution, the Coding track's "Token Factory Sandboxes").

## `api/app/llm.py`: single entry point

```python
async def chat(tier: Tier, messages, *, tools=None, json_schema=None, max_tokens=..., temperature=...) -> LLMResult
```

Responsibilities:
- One `AsyncOpenAI(base_url=TOKEN_FACTORY_URL, api_key=NEBIUS_API_KEY)` client
- Timeouts (30 s fast/vision, 60 s agent, 120 s reason), 2 retries with backoff on 429/5xx
- **Cost ledger**: record prompt/completion tokens × per-tier price → SQLite `usage` table; expose
  `spent_usd()`; the guard reads this
- JSON mode helper: try `response_format`; on failure, fall back to "extract first {...} block" + one repair
  call on `NEMOTRON_FAST`
- Tool-call helper: normalize `tool_calls` → `[{name, args}]`; if the model returns plain text that looks like
  a tool call, parse it (Nemotron tool calling may be imperfect)
- Every call logs `tier, model, tokens, ms, run_id, step` (no prompt contents in logs by default)

## `browser.py`

- One Chromium per run; one **context per persona** (isolated cookies, viewport: desktop 1280×800 or mobile
  390×844 depending on persona)
- `observe(page) -> Observation`: full-page screenshot (JPEG q=70, max 1280 wide), plus interactive elements
  via `page.evaluate`: `[{id, tag, role, text, aria, placeholder, href, bbox}]`, capped at 60 elements, with a
  stable `data-fu-id` injected so actions are addressable
- Actions: `click(id)`, `type(id, text)`, `scroll(dir)`, `back()`; each waits for network idle (≤ 5 s)
- Guards: same-origin only (block navigation off the target domain), block downloads, 20 s page timeout,
  `robots`-respecting UA string `FiveUsersBot/0.1 (+repo url)`
- Screenshots saved to `/data/runs/{run_id}/{persona}/{step}.jpg`

## `personas.py`

1. Tavily `search` (basic, 3 results) on `"{product category} onboarding usability common complaints"` and
   `"{domain} what is it"` → short context
2. `NEMOTRON_AGENT` → JSON array of 5 personas (schema in `models.py`)
3. Persist to run folder

## `walker.py`: persona agent

```
for step in range(persona.max_steps):
    obs = browser.observe(page)
    see = llm.chat(VISION, [screenshot, "In character as {persona}, in ≤60 words: what do you notice,
                   what are you looking for, what's confusing?"])
    decision = llm.chat(AGENT, system=persona_system_prompt, messages=history + [obs.elements, see],
                        tools=[click, type, scroll, back, give_up, done])
    log step {screenshot, see, decision.inner_voice, decision.confusion (0-3), action}
    emit SSE event
    if action in (done, give_up): break
    browser.act(action)
    if obs.fingerprint repeated 3x: force give_up("stuck")
```

Run 5 walkers with `asyncio.gather` (semaphore 3 on HF free tier if memory is tight).

## `expert.py`

For each unique page fingerprint visited by any persona:
- `NEMOTRON_VISION` + element list → heuristic findings (visibility of status, match to real world,
  consistency, error prevention, recognition vs recall, aesthetic/minimalist, help/docs) → JSON list
- Cheap deterministic a11y checks in Python (no LLM): inputs without labels, images without alt, buttons with
  no accessible name, very low contrast on primary CTA (approx via computed styles), focusable order sanity

## `synthesis.py`

One `NEMOTRON_REASON` call with: personas, all step logs (compressed: screen fingerprint, see-summary,
confusion, action), expert findings, task definition → **Report JSON** (schema in `report.py`):

```
{ summary, success_rate, personas:[{name, outcome, steps, time}],
  issues:[{id, severity, title, screen_fingerprint, screenshot_ref, pin:{x,y}, personas_hit:[],
           quote:{persona, text}, why, fix:{type: copy|css|flow, before, after}}],
  friction_map:[{screen, hits, worst_issue_id}], expert_findings:[...], competitor_refs:[...] }
```

Then Tavily `search` for top 3 issues: `"{category} {issue topic} best practice example"` → attach 1–2 refs
each (title, url, one-line why).

`report.py` draws numbered pins onto screenshots (Pillow) and renders Markdown export.

## `guard.py`

- **Budget**: `BUDGET_USD_HARD=40`. If `spent_usd() > hard` → `/runs` returns 402 with a friendly message and
  the UI switches to "Demo mode: explore sample reports". `BUDGET_USD_SOFT=30` → UI shows a notice.
- **Rate limit**: per IP, 2 runs/hour, 5 runs/day (SQLite table). Per-run caps: 5 personas × 12 steps.
- **Judge access**: `JUDGE_TOKEN` env; requests with header `X-FiveUsers-Key: <token>` bypass rate limit (not
  the hard budget). README tells judges to use it.
- **Concurrency**: max 2 runs at a time server-wide (semaphore); queue message otherwise.

## `store.py`

- SQLite (`/data/fiveusers.db`): `runs`, `usage`, `ratelimit`
- Run folders: `/data/runs/{run_id}/` with `personas.json`, `{persona}/steps.jsonl`, screenshots, `report.json`
- HF Spaces persistent storage: use `/data` (persistent disk) if enabled, else fall back to ephemeral and rely on
  `api/samples/` for demo reports

## API

```
POST /runs                 {url, task, audience?}      -> {run_id}
GET  /runs/{id}/events     SSE: stage, persona_step, persona_done, report_ready, error
GET  /runs/{id}            status + partial state
GET  /reports/{id}         report JSON
GET  /reports/{id}.md      markdown
GET  /files/{run}/{path}   screenshots
GET  /health               {models, budget_spent, budget_remaining, samples:[...]}
GET  /samples              list of committed sample reports
```

## Web

- `app/page.tsx`: start form (url, task, audience) + sample picker + "what happens" strip
- `app/run/[id]/page.tsx`: 5 live lanes (persona card header, current screenshot, inner-voice line,
  confusion meter); stage rail at top; SSE via `EventSource`
- `app/r/[id]/page.tsx`: report (see design brief)
- `lib/api.ts`: typed client; `NEXT_PUBLIC_API_URL`

## Deployment

- API: Hugging Face Spaces, Docker SDK. Base image `mcr.microsoft.com/playwright/python:v1.4x-jammy`. Port
  7860. Secrets as Space secrets. Enable persistent storage if free tier allows; otherwise rely on samples.
- Web: Vercel, root `web/`. Env `NEXT_PUBLIC_API_URL`.
- Fallback for API: Render free web service (Docker), with slower cold starts.

## Cost model (per run, estimated)

- Vision: 5 personas × 12 steps × ~1.5K tokens = 90K in / 10K out → ~$0.01
- Agent (Super): 60 decisions × ~4K in / 300 out → 240K in, 18K out → ~$0.09
- Expert: ~8 pages × 2K → ~$0.01
- Ultra synthesis: ~40K in / 4K out → $0.04 + $0.012 ≈ $0.05
- Personas + Tavily: negligible
- **≈ $0.15–0.20 per run** → $40 budget ≈ 200+ runs. Fine.

## Failure handling (every stage)

| Failure | Behavior |
|---|---|
| Target site blocks/404/timeout | Run fails fast with clear message; suggest samples |
| Vision call fails | Fall back to element-list-only perception |
| Tool call unparsable | One repair attempt; else treat as `scroll(down)`; after 2 → `give_up` |
| Tavily fails | Report proceeds without refs; UI shows "references unavailable" |
| Ultra fails | Retry once; then synthesize with Super (flag in report) |
| Budget hard cap | 402 + demo mode |
