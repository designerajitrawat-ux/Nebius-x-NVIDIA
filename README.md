# FiveUsers

**Five AI users walk through your product before real ones do.**

Give FiveUsers a URL and a task ("sign up and create your first project"). It recruits five realistic personas,
and each one *actually walks your site* in a real browser, reading the screen, deciding what to click in
character, noting where it gets confused or gives up. An expert pass reviews every screen they saw. You get a
report in a few minutes: who made it, where people got stuck, severity-ranked issues with annotated screenshots,
the persona's own words, and a concrete fix for each.

> Nebius x NVIDIA Global AI Hackathon, **Best Apps and Agents** track.
> Every model call runs on **NVIDIA Nemotron** through **Nebius Token Factory**. Live research and
> "how others do it" references come from **Tavily**.

Demo: _coming soon_ · Video: _coming soon_ · Sample reports: Signup · Checkout · Booking

## Why

Testing with five users finds most usability problems (Nielsen). Almost nobody does it before shipping, because
getting five people is slow and expensive. FiveUsers makes "five users" a two-minute, few-cent step for
designers, indie hackers and small product teams.

## Where NVIDIA Nemotron and Nebius Token Factory are used

Every model call goes through one client, [`api/app/llm.py`](api/app/llm.py), pointed at
`https://api.tokenfactory.nebius.com/v1/`. Four Nemotron tiers, each for the job it's best at:

| Pipeline step | Nemotron model (Token Factory) | What it does | Code |
|---|---|---|---|
| Recruiting | **Nemotron 3.5 Lightning** | Classifies the product category | [`personas.py`](api/app/personas.py) |
| Recruiting | **Nemotron 3 Super 120B** | Writes five personas from Tavily research | [`personas.py`](api/app/personas.py) |
| Testing, every step | **Nemotron 3 Nano Omni** (vision) | Looks at the screenshot *as that persona*: what do I notice, what's confusing | [`walker.py`](api/app/walker.py) |
| Testing, every step | **Nemotron 3 Super 120B** (tool calling) | Decides the next action in character: `click`, `type`, `fill`, `scroll`, `back`, `give_up`, `done` + inner voice + confusion 0–3 | [`walker.py`](api/app/walker.py) |
| Reviewing | **Nemotron 3 Nano Omni** (vision) | Heuristic evaluation (Nielsen's 10) of every screen visited | [`expert.py`](api/app/expert.py) |
| Writing | **Nemotron 3 Ultra 550B** | One reasoning call turns all logs into ranked issues with fixes | [`synthesis.py`](api/app/synthesis.py) |

A typical run is ~80 Nemotron calls and costs about **$0.10–0.20**; the report's footer shows the exact calls,
tokens and cost per model for that run.

## Where Tavily is used

| Step | Query | Code |
|---|---|---|
| Recruiting | Common complaints and audience research for the product's category → grounds the personas | [`personas.py`](api/app/personas.py) |
| Writing | For each of the top 3 issues, how comparable products handle it → "See how others do it" links | [`synthesis.py`](api/app/synthesis.py) |

## How it works

```
web (Next.js, Vercel)                       api (FastAPI + Playwright, Hugging Face Spaces)
  /            start a test   ── POST /runs ──▶  1 Preparing   load the site, first screenshot
  /run/[id]    five live lanes ◀── SSE ──────    2 Recruiting  Tavily research → Super writes 5 personas
  /r/[id]      the report     ◀── JSON ──────    3 Testing     5 browser contexts in parallel; per step:
                                                               screenshot → Omni perceives → Super decides → act
                                                 4 Reviewing   Omni heuristics + deterministic WCAG checks
                                                 5 Writing     Ultra synthesis → grounded issues → pins → Tavily refs
```

Design choices that keep reports honest:

- **Pins come from the DOM**, not the model: each issue points at the bounding box of the element involved.
- **Quotes are verbatim**: a persona quote must match a line that persona actually "thought" during the run.
- **Graceful degradation**: vision fails → decide from the element list; tool calls unparsable → JSON mode;
  Ultra fails → Super writes the report (flagged); Tavily down → report without references.
- **Accessibility checks are deterministic** (labels, names, alt text, contrast, tap targets), no LLM guessing.

## Run locally

Requirements: Python 3.11+, Node 20+.

```bash
# 1. config
cp .env.example .env            # add NEBIUS_API_KEY, TAVILY_API_KEY, model IDs

# 2. API (port 7860)
cd api
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt      # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m playwright install chromium
.venv/Scripts/python -m app

# 3. web (port 3000), in another terminal
cd web
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:7860 > .env.local
npm run dev
```

Check the account and model IDs first: `api/.venv/Scripts/python scripts/day0_test.py`.

**No credits? Use a dry run.** Set `DRY_RUN=true` and `ALLOW_PRIVATE_URLS=true` in `.env`: personas follow a
scripted policy instead of calling models, so the whole product (live lanes, report, export) runs for free on
the built-in sample sites at `http://localhost:3000/samples/signup/index.html` (also `checkout`, `booking`).
Dry-run reports are labelled as such.

On Windows, `.\scripts\dev.ps1 -DryRun` starts both servers in their own windows.

Checks:

- `cd api && .venv/Scripts/python -m pytest`, unit tests
- `api/.venv/Scripts/python scripts/verify_samples.py`, drives all three sample flows at desktop and phone size
  through the personas' own observe/act layer (choosing elements only from what the model sees) and proves each one
  can be completed

Deploying: see [`docs/deploy.md`](docs/deploy.md).

## Safe to point at the internet

The test browser opens URLs that strangers type in, so it's fenced in:

- **Egress filter**: every request from the browser (pages, redirects, iframes, images, websockets) goes through a
  local proxy that resolves the host itself and refuses private and internal addresses, so a page can't make the
  server read its own network.
- **Stays on your site**: links and scripts that leave the site under test are blocked; popups fold back into the tab.
- **Limits**: per-visitor and server-wide rate limits, two runs at a time, a 15-minute cap per run, hard timeouts on
  every browser step, and a credit budget that switches the demo to sample reports when it's used up.
- **Prompt hygiene**: page text reaches the model marked as untrusted content, never as instructions.

## For judges

- Sample reports load instantly (pre-generated on the three sample sites, which are deliberately flawed and
  brand-free, see [`docs/samples.md`](docs/samples.md)).
- Public runs are limited to 2 per hour per IP to protect the credit budget. Judges can skip the limit by sending
  the header `X-FiveUsers-Key: <token>` (token in the Devpost submission notes).
- `GET /health` shows the configured Nemotron models, credits remaining and available samples.

## Limitations

- Public pages only (no logins); the test browser stays on the site's own domain.
- Personas are simulations: great at surfacing confusing copy, hidden steps and broken flows, not a replacement
  for talking to real customers.
- Accessibility checks are a quick scan, not a full audit.

## License

MIT, see [`LICENSE`](LICENSE).
