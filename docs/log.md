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
