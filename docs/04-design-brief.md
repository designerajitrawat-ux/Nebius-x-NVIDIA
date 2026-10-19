# 04, Design brief

and most hackathon entries will be dark-mode dashboards with purple glows and identical rounded cards. We are
not doing that.

## What we learned from references (Pinterest, 19 Oct)

- "AI agent dashboard" results: near-black backgrounds, purple/blue gradient glows, glassy cards, tiny
  charts everywhere. **This is the default. Avoid it.**
- Light, Linear/Notion-like product UIs read as modern and calm, and, crucially, **screenshots are our
  main content**, and screenshots read far better on a light, neutral surface.
- Persona templates are photo-heavy; we use **no stock photos** (brand-safe, faster, more distinctive).
- Heatmap/session-replay tools gave one useful idea: friction shown as **numbered pins on the actual
  screenshot**, not abstract heat blobs.
- Editorial sites: one big typographic statement in the hero, everything else quiet.

## Concept: the lab notebook

FiveUsers is a research instrument. The report should feel like a **well-kept lab notebook**: calm paper
surface, precise annotations, one signal color for problems, evidence (screenshots) front and center. The
memorable element is the **annotated screenshot with numbered pins and persona quotes beside it**, spend
all the boldness there; everything else stays disciplined.

## Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F7F6F2` | page background (warm off-white, not cream, not pure white) |
| `ink` | `#17191C` | primary text |
| `ink-2` | `#5B6066` | secondary text |
| `line` | `#E3E1DA` | hairlines, borders |
| `card` | `#FFFFFF` | elevated surfaces (screenshot frames, report cards) |
| `signal` | `#E4572E` | friction, critical issues, pins, the ONE accent |
| `signal-soft` | `#FBE9E3` | signal backgrounds |
| `ok` | `#2E7D5B` | task completed, passes |
| `ok-soft` | `#E3F1EA` | |
| `warn` | `#C98A1A` | major (not critical) issues |

Dark mode: not required for v1. If added later, invert paper/ink only; keep signal.

Severity: Critical = `signal`, Major = `warn`, Minor = `ink-2`. Never add more colors for personas; personas
are distinguished by **initial-letter marks** and names, not colors.

### Type

- **Display / headings:** `Instrument Sans` (Google Fonts), or `Geist` as fallback. Tight tracking, weights 500/600.
- **Body / UI:** `Inter` at 15px/1.5. (One sans is fine; if two, make them clearly distinct, Instrument Sans has
  enough character at large sizes.)
- **Persona inner-voice quotes:** `Instrument Serif` italic, this is the one expressive typographic move. The
  quotes are the human-sounding part of the product; the serif marks them as "someone's voice", not system text.
- No monospace for labels. No all-caps eyebrows. No "→" glued to buttons.

Type scale: 13 / 15 / 17 / 22 / 28 / 40 / 56. Line lengths ≤ 72ch.

### Layout

- Max content width 1180px, left-aligned text, 12-col grid, 24px gutters, 8px spacing base.
- Radii: 6px on controls, 10px on screenshot frames, 0 on hairline tables. Not one radius on everything.
- Shadows: screenshot frames only, `0 1px 2px rgba(23,25,28,.06), 0 8px 24px rgba(23,25,28,.08)`. Nothing
  else gets a shadow.
- Borders carry structure: tables and lists use 1px `line` hairlines, not cards.

### Motion

- One orchestrated moment: on `/run/[id]`, the five lanes **appear one by one** as personas are recruited
  (120 ms stagger). After that, only state changes animate (new screenshot crossfade 200 ms, confusion meter
  fill). No hover-lift on cards. Respect `prefers-reduced-motion`.

## Screens

### 1. Start (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│ FiveUsers                                      Samples  GitHub│
│                                                              │
│  Five AI users walk through                                  │
│  your product before real ones do.          (56px display)   │
│                                                              │
│  ┌────────────────────────────────────────────────┐          │
│  │ https://your-site.com                          │          │
│  ├────────────────────────────────────────────────┤          │
│  │ Task: Sign up and create your first project     │          │
│  ├────────────────────────────────────────────────┤          │
│  │ Audience (optional): first-time users of…       │          │
│  └────────────────────────────────────────────────┘          │
│  [ Run the test ]   or try a sample: Signup · Checkout · Book│
│                                                              │
│  What happens ─────────────────────────────────────────      │
│  1 Recruit five personas   2 Each one walks your site        │
│  3 Expert review           4 Report with fixes               │
│                                                              │
│  Runs on Nebius Token Factory · NVIDIA Nemotron · Tavily     │
│  Credits remaining: $31.20                                   │
└──────────────────────────────────────────────────────────────┘
```

Hero is the headline + the form. No illustration, no gradient blob. The sample links are the fastest path for
judges, make them prominent.

### 2. Live run (`/run/[id]`)

```
Preparing ── Recruiting ── Testing ── Reviewing ── Writing        (stage rail, hairline)

┌─ P ─────────────┐ ┌─ R ─────────────┐ ┌─ M ─────────────┐ ┌─ D ──┐ ┌─ A ──┐
│ Priya, 34        │ │ Rohan, 27        │ │ Maya, 41 (mobile)│ │ …    │ │ …    │
│ first-time user  │ │ power user, rush │ │ small screen     │ │      │ │      │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌────┐           │ │      │ │      │
│ │ screenshot   │ │ │ │ screenshot   │ │ │ │ ss │           │ │      │ │      │
│ └──────────────┘ │ │ └──────────────┘ │ │ └────┘           │ │      │ │      │
│ "Where do I even │ │ "Pricing first." │ │ "Button's under  │ │      │ │      │
│  start?"         │ │                  │ │  the keyboard."  │ │      │ │      │
│ confusion ▮▮▮▯   │ │ confusion ▮▯▯▯   │ │ confusion ▮▮▯▯   │ │      │ │      │
│ step 4 · Super   │ │ step 2 · Super   │ │ step 6 · Super   │ │      │ │      │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────┘ └──────┘
```

Five equal lanes on desktop (stack to 1 column on mobile). The persona mark is a single large initial in a
circle (ink on paper). Inner-voice line in Instrument Serif italic. Model badge small, `ink-2`. When a persona
finishes: lane header turns `ok-soft` (done) or `signal-soft` (gave up).

### 3. Report (`/r/[id]`)

```
Signup flow · yoursite.com · 19 Oct 2026 · 5 personas · 2 completed · 3 gave up      [Copy link] [Export .md]

3 of 5 users could not create a project.                                      (28px, plain statement)
The pricing wall before signup is the main cause.

Issues ───────────────────────────────────────────────────────────────────────
┌────────────────────────────────────────────┐  ① Critical
│  [screenshot with numbered pins ①②]       │  Pricing page appears before signup
│                                            │  Hit by: Priya, Maya, Dev
│                                            │  "I just wanted to try it. Why am I
│                                            │   picking a plan?", Priya
└────────────────────────────────────────────┘  Fix (flow): route "Get started" to
                                                 signup; show plans after first project.
                                                 See how others do it: Linear · Notion   (Tavily)

Friction map ── Screen ─────────── Hits ── Worst issue
                 /pricing           3      ①
                 /signup step 2     2      ③

Personas ── one row each: mark · name · outcome · steps · open transcript ▸
Expert review ── hairline table
Feedback & model usage ── which Nemotron did what, tokens, cost of this run
```

Issue blocks: screenshot left (2/3), text right (1/3), hairline between issues, no card borders. Pins are
`signal` circles with white numerals, 22px, with a 2px `paper` ring so they read on any screenshot.

## Copy rules

- Sentence case everywhere. Plain verbs. "Run the test", "Copy link", "Export as Markdown".
- The report states findings as facts in plain language: "3 of 5 users could not…", not "Insights".
- Errors say what happened and what to do: "We couldn't load that site (timed out after 20 s). Try a sample or
  check the URL."
- Empty state on `/`: the form is the empty state. No illustration.

## Quality floor

Responsive to 360px, visible focus rings (2px `ink` offset), reduced motion respected, contrast AA on all text,
keyboard-operable forms. Screenshots have alt text generated from the vision step.

## Before building any screen

