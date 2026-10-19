# Build log


## 2026-10-19 (Day 0)
- done: starter folder, docs, prompts, day0 script

## 2026-10-19/20 (Day 0 night, plan changed: build everything that doesn't need keys)
- done:
  - API pipeline end to end (llm, browser, personas, walker with `fill`, expert, synthesis, report, guard, SSE,
    routes) + DRY_RUN mode; 45 unit tests green.
  - Live code path verified against a mock Token Factory: structured + text tool calls, 429 + Retry-After,
    thinking-kwargs rejection fallback, Ultra synthesis grounding, cost ledger (~$0.10/run with realistic tokens).
  - Three flawed sample sites (37 documented flaws, answer key in docs/samples.md).
  - Next.js UI (start, live run, report, samples) with fixture mode; `npm run build` green.
  - Browser E2E through the real UI (dry run): form → five live lanes → report in 32 s, no console errors,
    no horizontal scroll at 390 px.
  - Found + fixed: Windows headless-shell took ~6 s per new page (full Chromium on Windows now, 63 s → 9 s for
    five sessions); report tables overflowed on phones; SSE race on first connect; doubled quotes.
  - Dockerfile for HF Spaces, seed_samples.py, day0_test.py now checks vision + tool calling.
- blocked: Token Factory + Tavily keys (human). Then: day0_test.py → model IDs into .env → first live run.
- tomorrow: first live run on the signup sample; compare the report with docs/samples.md and tune prompts;
  judges' "Will It Ship" session 9:30 PM IST; GitHub username for the header link.

## 2026-10-20 (Day 1, early, still no keys; hardening)
- done:
  - `scripts/verify_samples.py`: personas' own browser layer now completes all three sample flows on desktop and
    phone (was 0/6: late navigations after "Submitting…" and <select> options the persona couldn't see;
    also: element names now keep spaces between text nodes).
  - Independent code review (15 findings) → fixed: egress proxy against SSRF, forged X-Forwarded-For, endless-loop
    pages, run time limit, partial walks kept on crashes, redirecting start URLs, out-of-credits mode +
    SPENT_OFFSET_USD, odd model JSON, </think>-only replies, prose parsed as "done", cost on failed calls, SSE end
    for restarted runs, web reconnect after 502, elapsed 0:00 on finished runs.
  - Verified against the mock Token Factory: normal run ($0.10) and credits running out mid-run (clean stop, 402).
  - CI + auto-deploy workflow, docs/deploy.md, Devpost description and video script drafts.
- blocked: keys (Token Factory, Tavily); GitHub username for the header link.
- next: day0_test.py → first live run on the signup sample → compare with docs/samples.md → tune prompts.
