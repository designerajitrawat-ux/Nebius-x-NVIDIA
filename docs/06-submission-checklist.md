# 06 · Submission checklist (Devpost)

Submit on **29 Oct 2026**. Hard deadline 30 Oct 10:30 PM IST.

## Before submitting

- [ ] Live demo URL loads from a fresh browser + from a phone
- [ ] All 3 sample runs work on prod; sample reports open instantly (committed JSON)
- [ ] `/health` shows budget remaining ≥ $15
- [ ] Judge token works; README explains it
- [ ] Repo is **public**; **MIT LICENSE** at root and visible in GitHub "About" (set the license in repo settings
      if GitHub doesn't auto-detect)
- [ ] README: setup, run locally, architecture, **where Nemotron (each tier) / Token Factory / Tavily are used**,
      limitations, cost
- [ ] No secrets in git history (`git log -p | grep -i "api_key"` should be clean); `.env.example` complete
- [ ] Video ≤ 3:00, public on YouTube, says "Nebius Token Factory" and "NVIDIA Nemotron" **out loud**, shows
      Tavily references on screen, no music with copyright, no third-party logos (we use our sample sites)
- [ ] Project name: **FiveUsers**

## Devpost form fields (prepare text in `docs/devpost-description.md`)

- Project name, tagline
- "What it does", "How we built it" (name Nemotron tiers + Token Factory + Tavily explicitly), "Challenges",
  "What we learned", "What's next"
- Built with: `nebius-token-factory`, `nvidia-nemotron`, `tavily`, `fastapi`, `playwright`, `next.js`, `python`,
  `typescript`
- Track: **Best Apps and Agents**
- Demo URL, repo URL, video URL
- **Feedback** on Token Factory / Nemotron / NVIDIA tools (required; copy from `docs/feedback.md`; be specific:
  onboarding, docs, tool-calling reliability, vision quality, pricing, what we'd want next)
- City event: none (India had no event), leave blank
- "Existed before submission period?": No

## Video outline (≤ 2:45 target)

0:00–0:15  Problem: nobody tests before shipping; 5 users find 85% of issues; getting 5 is the hard part
0:15–0:30  "FiveUsers: five AI users walk through your product before real ones do." Enter URL + task.
0:30–1:15  Live lanes: five personas recruited (Tavily + Nemotron Super), walking in parallel; one gets
           stuck (show inner voice); one completes. Say: "every step runs on NVIDIA Nemotron via Nebius
           Token Factory. Super VL reads screens, Super decides, Ultra writes the report."
1:15–2:15  Report: headline, annotated screenshot with pins, persona quote, concrete fix, Tavily competitor
           references, friction map, model usage footer.
2:15–2:40  Who it's for + what's next (Figma input, auth flows, CI integration). Repo + license on screen.
2:40–2:45  End card.

## After submitting

- [ ] Screenshot the Devpost confirmation
- [ ] Keep the API warm through 15 Dec (uptime ping every 10 min from a free cron, e.g. cron-job.org)
- [ ] Don't touch prod between 30 Oct and 15 Dec except to fix outages
