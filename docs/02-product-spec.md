# 02, Product spec: FiveUsers

**Five AI users walk through your product before real ones do.**

## Problem

Usability testing is the single highest-leverage thing a product team can do, and almost nobody does it
before shipping: recruiting takes days, sessions cost $50–150 per participant, and small teams/solo
founders skip it entirely. Designers end up asking a colleague "does this make sense?", one person, same
context, same blind spots. Nielsen's classic finding: testing with ~5 users surfaces ~85% of usability
problems. The problem isn't that five is too few. It's that five is too hard to get.

## Who it's for

- Product designers and UX designers (primary, the owner's own role)
- Indie hackers / solo founders shipping without a research budget
- Small product teams before a release

## What it does

Input → `url`, `task` (natural language), optional `audience` (e.g. "first-time users of a B2B invoicing tool").

Output → a shareable report in ~3–5 minutes:

1. **Task outcome per persona**, completed / gave up / wrong path, with step count and time
2. **Friction map**, which screens caused confusion, how many personas hit each
3. **Severity-ranked issues** (Critical / Major / Minor), each with an annotated screenshot, which personas
   hit it, a quote in the persona's voice, and a **concrete fix** (copy rewrite, CSS snippet, or flow change)
4. **Persona transcripts**, step-by-step what each AI user saw, thought, did
5. **Expert pass**, heuristic + accessibility findings per visited page
6. **Competitor references** (Tavily), how 2–3 comparable products handle the same step
7. Export as Markdown; share by link

## The five personas (generated per run, not fixed)

Nemotron Super generates 5 personas tailored to the product category + audience. Default archetypes it
draws from:

- **First-timer**, never seen this category of product
- **Power user in a hurry**, knows the category, zero patience, skims
- **Mobile-only / small viewport**, runs at 390px width
- **Older / lower digital confidence**, reads everything, afraid of mistakes
- **Non-native English reader**, trips on jargon and idioms
- (alternates: accessibility-focused keyboard user; skeptical buyer; distracted parent)

Each persona has: name, one-line bio, goal, patience (max steps), reading style, what frustrates them, a
"voice" (how they talk in notes).

## Pipeline (user-visible stages)

```
1. Preparing   → load page, screenshot, extract interactive elements
2. Recruiting  → Tavily research on category → 5 personas
3. Testing     → 5 persona agents walk the site in parallel (live lanes in UI)
4. Reviewing   → expert pass on every visited page
5. Writing     → Ultra synthesizes everything into the report
```

## Persona agent loop (per persona, max N steps)

```
observe   = screenshot + element list (ids, roles, labels, bboxes)
perceive  = NEMOTRON_VISION: "describe what this persona notices on this screen, in character" (short)
decide    = NEMOTRON_AGENT with tools: click(id) | type(id, text) | scroll(dir) | back() |
            give_up(reason) | done(reason); plus a `confusion` note 0–3 + inner-voice line
act       = Playwright executes; new observation
stop when done / give_up / step cap / same-screen-3-times
```

## Non-goals (v1, do not build)

- Auth'd flows behind real logins (we support a demo credentials field but don't promise it)
- Full accessibility audit (only quick checks: labels, contrast, focus order basics)
- Figma input (URL only)
- Team accounts, billing, history dashboards
- Mobile app

## Success criteria for the demo video

- Enter a URL + task → see 5 lanes come alive within ~20 s
- One persona visibly gets stuck and gives up; another completes
- Report shows an annotated screenshot with a numbered pin and a concrete copy fix
- Tavily competitor references visible
- Model badges visible: which Nemotron did which step
- Budget/credits indicator visible in footer (shows judges we thought about cost)

## Sample sites for demo (own/no third-party branding)

We will include 2–3 small sample sites in `web/public/samples/` (a fake SaaS signup, a fake checkout, a fake
booking flow) with **deliberate usability flaws** so the demo is reliable and brand-safe. Users can still
point FiveUsers at any public URL.
