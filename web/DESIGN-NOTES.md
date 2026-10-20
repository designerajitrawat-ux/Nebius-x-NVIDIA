# Design notes (web)

Working plan for the three screens, checked against `docs/04-design-brief.md`. The brief wins on any conflict.

## Shared

- Surface: `paper` page, `ink` text, `ink-2` secondary, `line` hairlines. `card` (white) only for the form
  group and screenshot frames.
- Type: Instrument Sans 500/600 for display and headings (tracking -0.02em at 56, -0.015em at 28/40,
  -0.01em at 22). Inter 15/1.5 for body and UI. Instrument Serif italic only for persona voice.
  Scale 13 / 15 / 17 / 22 / 28 / 40 / 56, nothing else.
- Layout: 1180px content width, 12-col grid, 24px gutters (16px side padding below 640px), 8px rhythm.
- Radii: 6px controls, 10px screenshot frames, 0 on tables. Small transcript thumbnails use 6px because 10px
  reads as a pill at 96px wide.
- Shadow: screenshot frames only.
- Header: wordmark left, "Samples" and "GitHub" right. No hairline under it.
- Section headings: sentence case, 22px Instrument Sans, followed by a hairline that runs to the edge
  ("Issues ────"). This replaces eyebrows.
- Contrast: `signal` (3.4:1), `warn` (2.7:1) and `ok` on `ok-soft` (4.3:1) fail AA as small text. Text uses
  darker derivatives of the same hues: `signal-ink #B93E1A`, `warn-ink #8F6210`, `ok-ink #256B4D`. Pins,
  meters and dots keep the brief's tokens. White numerals on `signal` pins are 3.7:1; the number is repeated
  in text next to every issue, so the pin works as a graphic marker.
- Focus: 2px `ink` outline, 2px offset. Inside the grouped form, the ring is drawn inset on the focused row so
  it doesn't collide with its neighbours.
- Motion: only the lane reveal (120ms stagger), screenshot crossfade (200ms), meter fill and rail progress.
  All of it is off under `prefers-reduced-motion`.

## 1. Start `/`

- Hero: the 56px statement (40px under 640px) and the form directly under it. Nothing beside it.
- Form: one white group with hairline rows: Site, Task, Audience (optional). Labels sit in a fixed left
  column on desktop and above the input on mobile. URL gets `https://` if missing; errors appear inside the
  row, in plain words.
- Actions row: "Run the test" (ink button, 44px) and "or try a sample: Signup · Checkout · Booking" at 15px
  with real underlines, same baseline. This is the judges' path, so it sits beside the button, not below.
- "What happens": heading + hairline, then four numbered steps in a 4-col row (2x2 on tablet, list on
  phone). Each step is a title plus one 13px ink-2 line naming who does the work (Tavily, which Nemotron).
- Quiet: dry-run notice, "Waking up the test lab…", soft-budget notice. One line each, ink-2, no boxes.
- Hard budget: the submit button is replaced by a one-line demo-mode message that points at the samples.
- Footer: hairline, "Runs on Nebius Token Factory · NVIDIA Nemotron · Tavily" and "Credits remaining: $X".
- Tokens: paper, ink, ink-2, line, card. No accent on this page except the focus ring and an inline error.

## 2. Live run `/run/[id]`

- Hero: the five lanes. Everything above them is one quiet block: site (ink-2), the task as a 28px line,
  elapsed time and cost so far in tabular figures on the right.
- Stage rail: five labels on a 1px `line` hairline; the completed part of the line is 2px `ink`; the
  current stage label is ink 600 with a ring dot, finished stages get a filled dot. On phones only the
  current label shows ("Testing · 3 of 5").
- Lane: persona mark (44px circle, ink initial on paper, 1px ink ring), "Priya, 34", archetype, "mobile"
  in ink-2 when relevant. Frame below, shadowed, 10px radius. Desktop personas fill the lane width and show
  the page from the top; mobile personas get a narrower phone-proportioned frame at the same height, so the
  viewport difference reads at a glance.
- Under the frame: inner voice in Instrument Serif italic 17px (3-line minimum so the rows below line up
  across lanes), then the quiet meta: confusion meter (4 segments; signal when 2+), last action,
  "Step 4 · Nemotron 3 Super".
- Finished lanes: the header block turns `ok-soft` or `signal-soft` with a plain outcome line
  ("Completed in 6 steps", "Gave up at step 5").
- Before personas arrive: one line saying what is happening, no skeleton cards.
- Report ready: a single line plus "Read the report" (ink button) directly under the rail. No redirect.
- Error: calm `signal-soft` block with the server's message and "Try a sample".
- Layout: 5 columns from 1024px, 2 from 640px, 1 below. On phones the lane goes horizontal (frame left,
  words right) so five lanes don't become five screens of scrolling.

## 3. Report `/r/[id]`

- Hero: the annotated screenshot. Issue block = 8 cols frame / 4 cols text, hairline between issues, no
  card borders. Mobile-viewport issues use a phone-height frame and give the text the rest of the row.
- Pins: 22px `signal` circles, white numerals, 2px `paper` ring, HTML overlay at `pin.x/pin.y`. Other issues
  on the same screenshot show their pins too, smaller and linked to their issue; the current one gets a soft
  halo. Tall full-page screenshots are cropped to the viewport ratio and scrolled so the pin sits in view.
- Text column: pin number + severity word (signal-ink / warn-ink / ink-2), 22px title, screen, "Hit by",
  persona quote in Instrument Serif italic 22px with the persona's name below it in Inter, why, fix block, references.
- Fix block: "Copy fix" / "CSS fix" / "Flow fix" label, summary, then before/after. Copy shows the old text
  struck through, CSS shows two mono code blocks, flow shows two short paths.
- Header line in ink-2 13px with "Copy link" and "Export as Markdown" as hairline buttons. Headline 28px,
  subline 17px ink-2.
- Then friction map, personas (row + disclosure transcript), expert review, model usage. All hairline tables,
  0 radius, numbers in tabular figures.
- Model usage: one row per tier with what that model did, calls, tokens in/out, cost; total; Tavily calls;
  the Tavily sources that shaped the personas.
- Quiet: dry-run and degraded banners are single lines with a hairline, ink-2.

## Samples `/samples`

- 28px heading, one-line intro, hairline list of samples: title, task, headline, "2 of 5 completed".

## Removed after the screenshot review

- Start: the explanatory sentence under each "What happens" step (title + who-does-it line is enough,
  and matches the brief's sketch). Placeholders now start with "e.g." so they don't read as values.
- Live run: the hairline between the inner voice and the meta in each lane (five extra rules; the serif
  to sans change already separates them).
- Report: the model name in the expert table's Source column (it's in Model usage), the duplicate
  "· mobile" when the archetype already says so.
- Samples: the "2 of 5 completed" column, which repeated the headline; replaced by a visible
  "Read the report" cue.

## Checked against the "avoid" list

| Default to avoid | Here |
|---|---|
| Dark dashboard, purple/blue glow, gradients | Light paper surface; one accent (signal); no gradients |
| Uniform rounded cards | No cards. Hairline tables; only frames and the form group are white |
| Glassy surfaces, tiny charts everywhere | None. The only "charts" are the 4-segment meter and hits bar |
| Mono uppercase eyebrows | Sentence-case 22px headings with a hairline; mono only inside CSS fixes |
| "→" glued to buttons | Plain verbs: "Run the test", "Read the report", "Copy link" |
| Hover-lift, decorative motion | Hover changes colour/underline only; one orchestrated reveal |
| Stock photos, persona colours | Initial-letter marks, ink on paper |
| Illustration in empty states | The form is the empty state |
