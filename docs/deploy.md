# Deploy: click by click

Two pieces: the **API** on [Modal](https://modal.com) and the **web app** on Vercel. Both have free plans that
need no card. Do the steps in order; each one says how to check it worked.

Why Modal: the API drives five real Chromium browsers, which serverless web hosts can't run. Modal runs the API's
container only while it is used and bills per second, so an idle demo costs nothing. Hugging Face Docker Spaces now
need a paid plan, and the free plans of Render and similar hosts have 512 MB of memory, too little for five browsers.

## Timeline (code stays private until the end)

| When | What |
|---|---|
| Now | Deploy the API to Modal (step 1). Deploying doesn't publish any code: Modal only serves the API's URL. |
| 27 Oct | Connect Vercel (step 2), seed the samples on production (step 3), run the production checks (step 5). |
| 28 Oct | Make the GitHub repo public and check the License shows MIT in About. |
| 29 Oct | Submit on Devpost. |

## How the free credit is spent

Modal's Starter plan includes **$1 of compute a month** without a card. What uses it:

| Action | Wakes the API? | Rough cost |
|---|---|---|
| Opening the landing page, the samples page or a sample report | No: the web app serves the samples itself (`web/scripts/sync-samples.mjs`) | $0 |
| Typing in the start form | Yes, once: the API warms up while the visitor types | under $0.01 (2 idle minutes) |
| One test run | Yes, for the whole run plus 2 idle minutes | about $0.01 to $0.02 |
| Opening a live run's report later | Yes, briefly | under $0.01 |

The container requests half a CPU and 1 GiB while idle, and may use up to 4 CPUs and 6 GiB while the five browsers
run (`api/modal_app.py`). Model calls are paid separately from the Token Factory credits, capped by the budget guard.
Credit resets on the 1st of each month, so judging (1 to 15 Dec) starts with a full $1. Check the spend on
modal.com → Settings → Usage & billing.

## 0. Before you start

- Keys work locally: `api\.venv\Scripts\python scripts\day0_test.py` prints a Nemotron reply and a Tavily result.
- A long random judge token in `.env` as `JUDGE_TOKEN` (e.g. `python -c "import secrets; print(secrets.token_urlsafe(24))"`).
  Keep it for the Devpost "notes for judges" field.

## 1. API → Modal

1. modal.com → **Sign up** → Continue with GitHub. The Starter plan is free; no card is needed.
2. Install the CLI and log in (a browser page opens; click **Authorize**):
   ```
   api\.venv\Scripts\python -m pip install modal
   api\.venv\Scripts\python -m modal token new
   ```
3. modal.com → **Secrets** → **Create new secret** → **Custom**, name it exactly `fiveusers`, with three keys:
   `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `JUDGE_TOKEN`. Everything else (model ids, budget, limits) is set in
   `api/modal_app.py`.
4. Deploy (from the `api` folder). The first build installs Chromium and takes a few minutes:
   ```
   cd api
   .venv\Scripts\python -m modal deploy modal_app.py
   ```
   To allow the web app, set its URL first: `set FIVEUSERS_ORIGINS=https://<app>.vercel.app,http://localhost:3000`
   (PowerShell: `$env:FIVEUSERS_ORIGINS="..."`), then deploy again.
5. Check: open `https://designerajitrawat-ux--fiveusers-api.modal.run/health` → `"mode": "live"`, the four model
   labels and the budget. The first request after a quiet spell takes a few seconds while the container starts.

Reports, screenshots and the spend ledger are kept on the Modal Volume `fiveusers-data`, so they survive the
container stopping. The SQLite database runs on local disk and is copied to the Volume after every change, because
Volumes have no file locking.

Optional: deploy from GitHub on every push to `main` (`.github/workflows/deploy-api.yml`). modal.com → Settings →
API tokens → new token, then in GitHub → Settings → Secrets and variables → Actions add secrets `MODAL_TOKEN_ID` and
`MODAL_TOKEN_SECRET`, and variables `MODAL_DEPLOY` = `true` and `FIVEUSERS_ORIGINS` = the web app's URL.

## 2. Web → Vercel

1. vercel.com → **Add New…** → **Project** → import the GitHub repo.
2. **Root Directory**: `web` (Framework preset Next.js is detected). The build copies `api/samples` into the site,
   so keep "Include files outside the root directory" on (the default).
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = `https://designerajitrawat-ux--fiveusers-api.modal.run`
4. **Deploy**. Note the URL `https://<app>.vercel.app`.
5. Redeploy the API with `FIVEUSERS_ORIGINS=https://<app>.vercel.app,http://localhost:3000` (step 1.4).
6. Check: open the Vercel URL, type in the website field, and the footer shows "Credits remaining" after a few
   seconds; `https://<app>.vercel.app/r/sample-signup` opens with its screenshots;
   `https://<app>.vercel.app/samples/signup/index.html` shows the Fernhill sample site.

## 3. Sample reports (what judges click first)

Run all three samples on production and commit the results (about 3 runs, $0.30 to $0.50 of Token Factory credit):

```
api\.venv\Scripts\python scripts\seed_samples.py --api https://designerajitrawat-ux--fiveusers-api.modal.run --web https://<app>.vercel.app --key <JUDGE_TOKEN>
git add api/samples && git commit -m "Seed sample reports from production" && git push
```

The push redeploys Vercel, which copies the new samples into the site. Check `https://<app>.vercel.app/r/sample-signup`.

## 4. Production checks (5 minutes)

- From your phone: start page → "Signup" sample → report opens; run a new test on the checkout sample.
- Rate limit: a third run from the same network within an hour shows the friendly limit message.
- Judge token: `curl -X POST https://designerajitrawat-ux--fiveusers-api.modal.run/runs -H "X-FiveUsers-Key: <JUDGE_TOKEN>" -H "Content-Type: application/json" -d "{\"url\": \"https://<app>.vercel.app/samples/booking/index.html\", \"task\": \"Book a haircut for next Saturday afternoon\"}"` → `{"run_id": ...}`.
- Modal → Settings → Usage & billing: the month's spend is a few cents.

## Budget

The Token Factory spend is recorded in the database on the Volume, and the guard stops new runs at
`BUDGET_USD_HARD` (soft warning at `BUDGET_USD_SOFT`), both set in `api/modal_app.py`. If Token Factory answers that
the balance is used up, the API switches to sample-only mode immediately, whatever the ledger says. If the ledger is
ever lost, set `SPENT_OFFSET_USD` to what the Nebius console's **Usage** page shows.

If Modal's monthly $1 runs out, Modal stops the API until the 1st; the site keeps working with the sample reports.

## If something breaks

| Symptom | Fix |
|---|---|
| `modal deploy` says the secret `fiveusers` is missing | Create it (step 1.3); the name must match exactly |
| `/health` says `"mode": "unconfigured"` | A key is missing in the `fiveusers` secret |
| Web shows "Waking up the test lab…" for over a minute | Wrong `NEXT_PUBLIC_API_URL` (redeploy Vercel after changing it) or CORS: `FIVEUSERS_ORIGINS` must contain the Vercel URL exactly, no trailing slash |
| Runs fail with "couldn't load that site" for the samples | Use the full `.../samples/<flow>/index.html` URL |
| A run stops halfway with "Interrupted by a server restart" | Check Modal → Apps → fiveusers-api → Logs; a crash or redeploy during a run causes this |
| Runs fail from lack of memory | Lower `WALKER_CONCURRENCY` to 3 in `api/modal_app.py` and deploy again |

## Running the API without Modal

`api/Dockerfile` builds a plain container (port 7860) for any Docker host with about 4 GB of memory. Mount a volume
at `/data` to keep reports, and set the same variables as in `api/modal_app.py` plus the three secrets.
