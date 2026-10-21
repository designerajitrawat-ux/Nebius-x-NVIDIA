# Devpost submission (draft)

> Numbers below come from the three sample runs on the deployed app (21 Oct 2026). The judge token goes only into
> the Devpost form, never into this file. Keep the voice first person: this is Ajit's project.

## Project name
FiveUsers

## Tagline
Five AI users try your website before real ones do.

## Inspiration
I'm a product designer. The most useful thing I can do before a release is watch five people try to use what
I designed, and it's the step that gets skipped every time: recruiting takes days, sessions cost money, and
small teams have neither. So designers end up asking a colleague "does this make sense?": one person, same
context, same blind spots. Nielsen's old finding is that five users surface most usability problems. Five was
never the problem. Getting five was.

## What it does
You give FiveUsers a URL and a task, like "sign up and create your first project". It:

1. **Recruits five personas** for your product (a first-timer, a power user in a hurry, a phone-only user, someone
   with low digital confidence, a non-native English reader), grounded in live web research about your product's
   category.
2. **Lets each one actually use your site** in a real browser, at the same time. Every step, the persona looks at the
   screenshot, says what it notices in its own voice, and decides what to do: click, type, fill a form, scroll, wait,
   go back, give up, or finish. You watch the five of them live.
3. **Reviews every screen they saw** against usability heuristics, plus quick accessibility checks (labels, names,
   contrast, tap targets).
4. **Writes the report**: how many people finished, where they got stuck, severity-ranked issues with a numbered pin
   on the actual screenshot, the persona's own words, and a concrete fix for each (a copy rewrite, a CSS change or a
   flow change), with links to how comparable products handle the same step.

A run takes two to three minutes and costs about ten cents in model calls: 126 to 142 Nemotron calls in the three
sample runs, $0.10 to $0.14 each.

## How I built it
Every model call runs on **NVIDIA Nemotron through Nebius Token Factory**, and each Nemotron tier does the job it's
best at:

| Step | Model | Why |
|---|---|---|
| Product category | Nemotron 3.5 Lightning | tiny call, cheapest tier |
| Five personas | Nemotron 3 Super | grounded in Tavily research, structured JSON |
| Every step: "what do I see?" | Nemotron 3.5 Super VL | reads the screenshot in the persona's voice |
| Every step: "what do I do?" | Nemotron 3 Super | tool calling: click / type / fill / scroll / wait / back / give up / done |
| Every "done": is it really done? | Nemotron 3.5 Super VL | judges the goal from the screenshot, not the persona's claim |
| Expert review per screen | Nemotron 3.5 Super VL | Nielsen heuristics from the screenshot |
| The report | Nemotron 3 Ultra | one call over every step, finding and quote |

**Tavily** runs twice per test: to research the product category before writing personas, and to find "how others
do it" references for the top issues.

The backend is Python (FastAPI + Playwright) on Modal, which scales to zero between tests; the web app is Next.js
on Vercel and serves the sample reports itself; the live view streams over Server-Sent Events.

A few decisions that make the report trustworthy:

- **Evidence is grounded, not generated.** Pins are placed on the bounding box of the real element the persona
  touched. Quotes must match a line the persona actually "thought" during the run. Persona ids, screens and steps are
  validated against the recorded log before anything reaches the report.
- **It degrades instead of failing.** Vision unavailable → decide from the element list. Tool calls come back as
  text → parse them, then JSON mode. Ultra unavailable → Super writes the report (and the report says so).
- **It's safe to point at the internet.** The test browser goes through an egress filter that refuses private
  addresses, stays on the site under test, and every run has hard time and budget limits.

## Challenges I ran into
- **Pages that change after you click.** Many forms show "Submitting…" and move on a second later. My personas kept
  judging a screen that was about to disappear and "got stuck" on perfectly good flows. The browser now waits until
  the page is quiet and isn't showing a busy state, and personas got a `wait` tool.
- **Making a model's findings checkable.** A model will happily write confident issues with nothing behind them, so
  the report only keeps issues it can ground in a recorded step, element and quote. That's what makes it something a
  designer can trust.
- **Forms ate patience.** One action per field meant a six-field form used half a persona's patience. A `fill` tool
  that completes several fields at once made the walks realistic and saves two model calls for every extra field.
- **Proving the personas *could* succeed.** I built a script that drives all three sample flows through the personas'
  own eyes, choosing elements only from what the model sees. It failed 6 of 6 at first; each failure was a real gap
  (a dropdown whose options the persona couldn't see, a late navigation). Now 6 of 6 pass on desktop and phone.
- **My first live run said 0 of 5 users finished. It was my bug, not the site.** I had used each persona's patience
  as a hard step limit, and the sample flow needs about nine actions, so the hurried personas could never finish.
  Now everyone gets the same screen budget, patience lives in the prompt, and quitting is the persona's own decision.
- **Personas said "done" when they weren't.** One declared victory on an empty projects page. Every "done" is now
  checked by Nemotron 3.5 Super VL looking at the screenshot. Text-only checks failed here: a kanban board's own
  "Done 0" column fooled them. On 24 labelled screenshots the vision check judged all 24 correctly, and it also
  catches people who reached the goal without noticing.
- **Ultra thought itself out of tokens.** With reasoning on, Nemotron 3 Ultra used all 12,000 output tokens thinking
  about a 5,000-token prompt and returned half a JSON report with one issue. With reasoning off it writes a full
  report in about five seconds for about one cent. Truncated output is now treated as an error, never as a report.
- **The models didn't know what day it is.** A correct October 2026 calendar was reported as a critical "wrong
  month" bug. Every prompt now carries today's date.

## Accomplishments I'm proud of
- The report reads like a researcher wrote it, and every claim in it points at evidence.
- Watching five lanes come alive and one persona quietly give up is exactly what a real test feels like.
- Three deliberately flawed sample products with a written answer key, so anyone can check whether the report
  found the real problems. In the committed signup report, the issues and the expert review caught 6 of the 13
  planted flaws (the pricing wall before signup, a card asked for a free trial, an unlabeled email field, the cookie
  bar covering the main button, an unnamed "+" create control, the "project key" jargon), plus problems I hadn't
  planted, like a Submit button that stays enabled while the required Terms box is unticked. Each run's cast finds a
  slightly different set, like real people.
- The personas are drawn as small characters whose faces show the same confusion score the agents report on every
  step, so you can see someone getting lost before you read a word.

## What I learned
- Routing by tier matters. Across the three sample runs Nemotron 3 Super carries about 55% of the cost (personas
  and every decision), Super VL about 24% (every screenshot and every "done" check), Ultra about 21% (about one cent when the
  report comes back right the first time; in one run the first attempt was unusable and the retry paid twice), and
  Lightning almost nothing.
- Nemotron 3 Super returned clean, structured tool calls from the first test, fast enough (about a second) to drive
  five agents at once. For anything about what's on a screen, the vision model is the right judge, not text.
- Reasoning is a budget, not a free upgrade: turn it on where it pays and cap it, because a runaway think costs
  tokens and can cut the answer off.

## What's next
- Figma prototypes as input, so designs get tested before they're built
- Logged-in flows with test credentials
- A CI check: run the five users on every preview deploy and comment the report on the pull request
- Token Factory Sandboxes and the Batch API for cheaper nightly runs

## Design
Product and visual design by Ajit Singh Rawat: https://ajitrawat.framer.website/

## Built with
nebius-token-factory, nvidia-nemotron, tavily, python, fastapi, playwright, next.js, typescript, tailwind,
modal, vercel

## Links
- Demo: https://fiveusers.vercel.app
- Sample reports: https://fiveusers.vercel.app/samples
- Code: https://github.com/designerajitrawat-ux/Nebius-x-NVIDIA (MIT)
- Video: https://youtu.be/VljfakEzpJk

## Notes for judges
Sample reports open instantly. To run your own tests without the public rate limit (2 per hour), send the header
`X-FiveUsers-Key: [paste JUDGE_TOKEN from .env into the Devpost form only; never commit it]` with `POST https://designerajitrawat-ux--fiveusers-api.modal.run/runs`, or ask in the comments and I'll raise
the limit. The three sample sites are fictional and deliberately flawed; their answer key is `docs/samples.md`.

## Feedback on Nebius Token Factory and NVIDIA Nemotron
Paste `docs/feedback.md` (separate prize, kept specific and measured).
