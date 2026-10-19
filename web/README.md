# FiveUsers, web

Next.js 15 (App Router) + Tailwind v4. Design tokens and decisions: `docs/04-design-brief.md` and
`web/DESIGN-NOTES.md`.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run build
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:7860` | FastAPI backend |
| `NEXT_PUBLIC_FIXTURES` | unset | `1` serves `/health`, `/samples` and `POST /runs` from fixtures |

## Fixture mode (no backend needed)

- `/r/fixture`, a complete report (fictional "Fernhill" signup flow).
- `/run/fixture`, a scripted ~25 s live run that ends with "Read the report".
- `NEXT_PUBLIC_FIXTURES=1 npm run dev`, the start page and `/samples` also work offline; submitting
  the form opens `/run/fixture`.

Fixture code lives in `lib/fixtures/` and placeholder screenshots in `public/fixtures/`. Both are
demo-only and can be deleted once real sample reports exist.

## Layout

- `app/`, routes: `/`, `/run/[id]`, `/r/[id]`, `/samples`
- `components/`, `start/`, `run/`, `report/`, `samples/` plus shared pieces
- `lib/api.ts`, typed client (REST + SSE); `lib/types.ts` mirrors `api/app/models.py`
- `lib/runState.ts`, replay-safe reducer for live run events
