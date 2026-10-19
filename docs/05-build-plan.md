# 05, Build plan (7 days + buffer)

Deadline 30 Oct 10:30 PM IST. We submit **29 Oct**. Each day has acceptance criteria, if a day's criteria
aren't met by its end, **cut scope the next morning**, don't extend.

Human (Ajit) owns: accounts, keys, deploy clicks, design review, video, Devpost form.

## Day 0, Mon 19 Oct (tonight)

Human:
- [ ] Token Factory account (India, Visa, international ON) → apply promo `NEBIUS-DEVPOST-GLOBAL26` → join
      Builders Program → apply 2nd code → create API key → put in `.env`
- [ ] Tavily account → API key → `.env`
- [ ] GitHub repo `fiveusers` (public, MIT), can stay empty until Day 1
- [ ] Vercel + Hugging Face accounts (GitHub login)
- [ ] Tomorrow 9:30 PM IST: judges' "Will It Ship" session

- [ ] Scaffold repo from this starter; `python scripts/day0_test.py` → lists models, makes one Nemotron call,
      one Tavily call, prints cost
- [ ] Write confirmed model IDs into `.env.example` comments

**Accept:** `day0_test.py` prints a Nemotron reply + a Tavily result + estimated cost. Nothing else.

## Day 1, Tue 20 Oct: backend skeleton

- [ ] `api/` FastAPI app, `llm.py` with cost ledger + JSON/tool helpers + tests for cost math and tool parsing
- [ ] `browser.py`: open URL, screenshot, element extraction with `data-fu-id`, click/type/scroll/back
- [ ] `personas.py`: Tavily context → 5 personas JSON (test on 2 sample sites)
- [ ] `store.py` + run folders; `POST /runs` creates a run and runs stages 1–2 only
- [ ] Sample site #1 (`web/public/samples/signup/`), static HTML with deliberate flaws

**Accept:** `POST /runs` on sample #1 returns 5 personas and a first screenshot in `/data/runs/{id}`.

## Day 2, Wed 21 Oct: one persona walks

- [ ] `walker.py` full loop for ONE persona (vision → decide via tools → act → log), step cap, stuck detection
- [ ] SSE endpoint streams `persona_step` events
- [ ] Minimal `/run/[id]` page in Next that shows one lane updating live (ugly is fine today)

**Accept:** One persona completes or gives up on sample #1 end-to-end, visible live in the browser.
**If not met:** simplify decide step to JSON-mode (no tool calling) on Day 3 morning.

## Day 3, Thu 22 Oct: five personas, expert, synthesis

- [ ] 5 walkers in parallel (semaphore), mobile viewport persona
- [ ] `expert.py` (vision heuristics + deterministic a11y)
- [ ] `synthesis.py` with Ultra → `report.json`; pin drawing; markdown export; Tavily refs for top issues
- [ ] `guard.py`: budget soft/hard, per-IP limits, judge token, concurrency
- [ ] `/health`

**Accept:** A full run on sample #1 produces `report.json` with ≥ 3 issues, each with screenshot + pin + fix.
Cost per run printed ≤ $0.30.

## Day 4, Fri 23 Oct: the real UI

Read `docs/04-design-brief.md` first. Ajit reviews at end of day.
- [ ] Tokens, fonts, layout shell
- [ ] `/` start page with samples
- [ ] `/run/[id]` five lanes, stage rail, staggered reveal, done/gave-up states
- [ ] `/r/[id]` report: headline statement, issues with annotated screenshots + quotes + fixes + Tavily refs,
      friction map, personas, expert table, model usage footer
- [ ] Mobile layout, focus states, reduced motion

**Accept:** Ajit signs off on all 3 screens against the brief (or lists ≤ 5 fixes for Day 5 morning).

## Day 5, Sat 24 Oct: deploy + harden

- [ ] API → HF Spaces (Docker). Secrets set. Persistent `/data` if available.
- [ ] Web → Vercel. `NEXT_PUBLIC_API_URL` set. CORS.
- [ ] Sample sites #2 (checkout) and #3 (booking)
- [ ] Run all 3 samples on prod; commit the 3 reports to `api/samples/` and wire "Samples" page to them
- [ ] Fix every bug found. Cold-start time measured; add a warm-up ping if > 30 s.
- [ ] Test judge token + rate limit + hard budget behavior (set hard cap to $0.01 temporarily)

**Accept:** Live URL end-to-end on 3 samples from a phone and a laptop. Demo mode works when budget capped.

## Day 6, Sun 25 Oct: submission materials

- [ ] README: what/why/how, architecture diagram, **exact places Nemotron tiers / Token Factory / Tavily are used**,
      setup, judge instructions (token), cost notes, limitations
- [ ] LICENSE check visible on GitHub About
- [ ] `docs/feedback.md`, specific feedback on Token Factory onboarding, Nemotron tool calling, vision, docs
- [ ] Devpost description draft (`docs/devpost-description.md`)
- [ ] Video script + shot list (`docs/video-script.md`), ≤ 2:45
- Human: record screen (OBS) + voiceover; no music or royalty-free only

**Accept:** README done, video recorded (raw).

## Day 7, Mon 26 Oct: polish

- [ ] Fix anything from video recording that looked wrong
- [ ] Final design pass (Ajit), typography, spacing, copy
- [ ] Repo audit: no secrets, no junk, `.env.example` complete, `npm run build` + `pytest` green
- Human: edit video, upload to YouTube (public), fill Devpost draft fully

**Accept:** Devpost draft complete with video link, repo link, demo link, feedback.

## 27–29 Oct: buffer → SUBMIT on 29 Oct

- Re-run samples on prod, confirm budget remaining ≥ $15 for judging
- Submit. Screenshot the confirmation.


1. Read this file; find today.
2. `git pull`; run tests.
3. Work the checklist top-down; commit after each item.
4. End of day: update checkboxes here, write 3 lines in `docs/log.md` (done / blocked / tomorrow).
