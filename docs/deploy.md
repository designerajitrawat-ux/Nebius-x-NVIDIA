# Deploy (Day 5): click by click

Two pieces: the **API** on a Hugging Face Space (Docker) and the **web app** on Vercel. Pushes to `main`
redeploy both automatically once this is set up. Do the steps in order; each one says how to check it worked.

Placeholders: `<hf>` = your Hugging Face username, `<app>` = your Vercel project name.

## 0. Before you start

- Keys work locally: `api\.venv\Scripts\python scripts\day0_test.py` prints a Nemotron reply and a Tavily result.
- Code is pushed to GitHub (`git push -u origin main`), repo is public, License shows **MIT** in About.
- Make a long random judge token (e.g. `python -c "import secrets; print(secrets.token_urlsafe(24))"`). Keep it
  for the Devpost "notes for judges" field.

## 1. API → Hugging Face Space

1. huggingface.co → **New** → **Space**. Name `fiveusers-api`, SDK **Docker** → **Blank**, hardware
   **CPU basic (free)**, visibility **Public**. Create.
2. Space → **Settings** → **Variables and secrets**:

   | Type | Name | Value |
   |---|---|---|
   | Secret | `NEBIUS_API_KEY` | your Token Factory key |
   | Secret | `TAVILY_API_KEY` | your Tavily key |
   | Secret | `JUDGE_TOKEN` | the long random token |
   | Variable | `NEMOTRON_FAST` / `NEMOTRON_VISION` / `NEMOTRON_AGENT` / `NEMOTRON_REASON` | IDs printed by `day0_test.py` |
   | Variable | `ALLOWED_ORIGINS` | `https://<app>.vercel.app` (add after step 2; for now `http://localhost:3000`) |
   | Variable | `BUDGET_USD_SOFT` / `BUDGET_USD_HARD` | `30` / `40` (lower them if credits are below $45) |
   | Variable | `SPENT_OFFSET_USD` | `0` now; see "Budget after restarts" below |

3. huggingface.co → avatar → **Settings** → **Access Tokens** → **Create new token** → type **Write** → copy.
4. GitHub repo → **Settings** → **Secrets and variables** → **Actions**:
   - **Secrets** tab → New secret `HF_TOKEN` = the token from step 3.
   - **Variables** tab → New variable `HF_SPACE` = `<hf>/fiveusers-api`.
5. GitHub → **Actions** → **Deploy API to Hugging Face** → **Run workflow**. Then watch the Space's **Logs**
   tab: the Docker build takes ~5–8 minutes the first time.
6. Check: open `https://<hf>-fiveusers-api.hf.space/health` → `"mode": "live"`, your four model labels, budget.

## 2. Web → Vercel

1. vercel.com → **Add New…** → **Project** → import the GitHub repo.
2. **Root Directory**: `web` (Framework preset Next.js is detected).
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = `https://<hf>-fiveusers-api.hf.space`
4. **Deploy**. Note the URL `https://<app>.vercel.app`.
5. Back in the Space: set `ALLOWED_ORIGINS` = `https://<app>.vercel.app` → the Space restarts by itself.
6. Check: open the Vercel URL → footer shows "Credits remaining", no "Waking up" after a few seconds;
   `https://<app>.vercel.app/samples/signup/index.html` shows the Fernhill sample site.

## 3. Sample reports (what judges click first)

Run all three samples on production and commit the results (this is ~3 runs ≈ $0.50):

```
api\.venv\Scripts\python scripts\seed_samples.py --api https://<hf>-fiveusers-api.hf.space --web https://<app>.vercel.app --key <JUDGE_TOKEN>
git add api/samples && git commit -m "chore: seed sample reports" && git push
```

The push redeploys the Space with the samples baked in, so they survive restarts. Check:
`https://<app>.vercel.app/r/sample-signup`.

## 4. Keep it awake until 15 Dec

Free Spaces sleep after ~48 h without traffic. cron-job.org → free account → new cron job:
`GET https://<hf>-fiveusers-api.hf.space/health` every **10 minutes**.

## 5. Production checks (5 minutes)

- From your phone: start page → "Signup" sample → report opens; run a new test on the checkout sample.
- Rate limit: a third run from the same network within an hour shows the friendly limit message.
- Judge token: `curl -X POST https://<hf>-fiveusers-api.hf.space/runs -H "X-FiveUsers-Key: <JUDGE_TOKEN>" -H "Content-Type: application/json" -d "{\"url\": \"https://<app>.vercel.app/samples/booking/index.html\", \"task\": \"Book a haircut for next Saturday afternoon\"}"` → `{"run_id": ...}`.
- Budget cap: set `BUDGET_USD_HARD=0.01` in the Space → start page switches to sample-only mode → set it back.

## Budget after restarts (important)

The free Space has no persistent disk, so the spend ledger starts from $0 after every restart. Two guards
cover this:

1. **`SPENT_OFFSET_USD`**: after a restart, set it to what the Nebius console's **Usage** page says has been
   spent so far. The guard adds it to the ledger.
2. **Out-of-credits detection**: if Token Factory answers that the balance is used up, the API switches to
   sample-only mode immediately and running tests stop with a clear message, whatever the ledger says.

If you enable paid persistent storage on the Space (`/data`), the ledger survives restarts and you can ignore
the offset.

## If something breaks

| Symptom | Fix |
|---|---|
| Space build fails on `pip install` | Check Logs; the base image tag in `api/Dockerfile` must match `playwright==` in `requirements.txt` |
| `/health` says `"mode": "unconfigured"` | A model variable or `NEBIUS_API_KEY` is missing in the Space settings |
| Web shows "Waking up the test lab…" forever | Wrong `NEXT_PUBLIC_API_URL` (redeploy Vercel after changing it) or CORS: `ALLOWED_ORIGINS` must match the Vercel URL exactly, no trailing slash |
| Runs fail with "couldn't load that site" for the samples | Use the full `.../samples/<flow>/index.html` URL |
| Playwright crashes / out of memory | Set Space variable `WALKER_CONCURRENCY=3` |
