# Devpost submission, draft

> Draft written before the first live run. Replace every `[TBD]` with real numbers from the seeded sample
> reports (the report footer shows calls, tokens and cost per Nemotron model). Keep the voice first person:
> this is Ajit's project.

## Project name
FiveUsers

## Tagline
Five AI users walk through your product before real ones do.

## Inspiration
I'm a product designer. The most useful thing I can do before a release is watch five people try to use what
I designed, and it's the step that gets skipped every time: recruiting takes days, sessions cost money, and
small teams have neither. So designers end up asking a colleague "does this make sense?", one person, same
context, same blind spots. Nielsen's old finding is that five users surface most usability problems. Five was
never the problem. Getting five was.

## What it does
You give FiveUsers a URL and a task, like "sign up and create your first project". It:

1. **Recruits five personas** for your product, a first-timer, a power user in a hurry, a phone-only user, someone
   with low digital confidence, a non-native English reader, grounded in live web research about your product's
   category.
2. **Lets each one actually use your site** in a real browser, at the same time. Every step, the persona looks at the
   screenshot, says what it notices in its own voice, and decides what to do: click, type, fill a form, scroll, wait,
   go back, give up, or finish. You watch the five of them live.
3. **Reviews every screen they saw** against usability heuristics, plus quick accessibility checks (labels, names,
   contrast, tap targets).
4. **Writes the report**: how many people finished, where they got stuck, severity-ranked issues with a numbered pin
   on the actual screenshot, the persona's own words, and a concrete fix for each, a copy rewrite, a CSS change or a
   flow change, with links to how comparable products handle the same step.

A run takes about [TBD] minutes and costs about $[TBD] in model calls.

## How I built it
Every model call runs on **NVIDIA Nemotron through Nebius Token Factory**, and each Nemotron tier does the job it's
best at:

| Step | Model | Why |
|---|---|---|
| Product category | Nemotron 3.5 Lightning | tiny call, cheapest tier |
| Five personas | Nemotron 3 Super | grounded in Tavily research, structured JSON |
| Every step: "what do I see?" | Nemotron 3 Nano Omni | reads the screenshot in the persona's voice |
| Every step: "what do I do?" | Nemotron 3 Super | tool calling: click / type / fill / scroll / wait / back / give up / done |
| Expert review per screen | Nemotron 3 Nano Omni | Nielsen heuristics from the screenshot |
| The report | Nemotron 3 Ultra | one reasoning call over every step, finding and quote |

**Tavily** runs twice per test: to research the product category before writing personas, and to find "how others
do it" references for the top issues.

The backend is Python (FastAPI + Playwright) on Hugging Face Spaces; the web app is Next.js on Vercel; the live
view streams over Server-Sent Events.

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
  the report only keeps issues it can ground in a recorded step, element and quote, that's what makes it something a
  designer can trust.
- **Forms ate patience.** One action per field meant a six-field form used half a persona's patience. A `fill` tool
  that completes several fields at once made the walks realistic and saves two model calls for every extra field.
- **Proving the personas *could* succeed.** I built a script that drives all three sample flows through the personas'
  own eyes, choosing elements only from what the model sees. It failed 6 of 6 at first; each failure was a real gap
  (a dropdown whose options the persona couldn't see, a late navigation). Now 6 of 6 pass on desktop and phone.
- [TBD, anything surprising from the first live runs: tool-calling reliability, vision quality, latency]

## Accomplishments I'm proud of
- The report reads like a researcher wrote it, and every claim in it points at evidence.
- Watching five lanes come alive and one persona quietly give up is exactly what a real test feels like.
- Three deliberately flawed sample products with a written answer key, so anyone can check whether the report
  found the real problems: FiveUsers found [TBD] of the [TBD] flaws in the signup flow.

## What I learned
- Routing by tier matters: the cheap, fast models carry the hundreds of per-step calls; Ultra is worth it once, at the
  end, where the reasoning is hardest. [TBD: cost split from the report footer]
- [TBD, what Nemotron's tool calling and vision were like in practice]

## What's next
- Figma prototypes as input, so designs get tested before they're built
- Logged-in flows with test credentials
- A CI check: run the five users on every preview deploy and comment the report on the pull request
- Token Factory Sandboxes and the Batch API for cheaper nightly runs

## Built with
nebius-token-factory, nvidia-nemotron, tavily, python, fastapi, playwright, next.js, typescript, tailwind,
hugging-face-spaces, vercel

## Links
- Demo: https://[TBD].vercel.app
- Sample reports: https://[TBD].vercel.app/samples
- Code: https://github.com/[TBD]/fiveusers (MIT)
- Video: https://youtu.be/[TBD]

## Notes for judges
Sample reports open instantly. To run your own tests without the public rate limit (2 per hour), send the header
`X-FiveUsers-Key: [TBD JUDGE_TOKEN]` with `POST https://[TBD].hf.space/runs`, or ask in the comments and I'll raise
the limit. The three sample sites are fictional and deliberately flawed; their answer key is `docs/samples.md`.

## Feedback on Nebius Token Factory and NVIDIA Nemotron
Copy from `docs/feedback.md` after the live runs (separate prize, be specific).
