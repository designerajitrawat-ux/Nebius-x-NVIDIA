# 01 · Hackathon brief (what we are competing in)

Source of truth: https://nebiusglobalaihackathon.devpost.com/ (overview, rules, FAQs, updates). Read on 19 Oct 2026.

## Key dates (IST)

| Event | When |
|---|---|
| Submission deadline | **Fri 30 Oct 2026, 10:30 PM IST** (10:00 AM PDT) |
| Our internal submit date | **Thu 29 Oct 2026** (buffer) |
| Judging | 1 Dec 10:30 PM – 16 Dec 1:30 AM IST |
| Winners announced | ~12 Jan 2027 |
| "Will It Ship" live judges session | Tue 20 Oct, 9:30 PM IST |

The demo must stay reachable until **15 Dec 2026**. A "test build" also counts per rules, and judges may
judge from video + description only, but a live URL is still expected.

## Two hard requirements (Stage 1 pass/fail)

1. The project makes a **runtime call to the Nebius Token Factory inference API** (or runs on Nebius AI Cloud; we don't use AI Cloud).
2. Uses **at least one NVIDIA open-source model** (Nemotron family for us).

Calling Nemotron through any other provider (HF, OpenRouter) does **not** count.

## Track: Best Apps and Agents

> "Build any app or agent someone would actually use... Power it with Nemotron models on Nebius through Token
> Factory. Reach for Nemotron 3 Ultra when you need serious reasoning, and let Nano or Super handle the fast,
> everyday calls."

Judges' hint for this track: *"a single API call demo works; a multi-step autonomous workflow that chains tools
end to end stands out more."*

## Bonus: Best Use of Tavily ($3,000)

Eligibility: "a functional, runtime call to the Tavily API as part of its solution." We call Tavily for
persona research and competitor references. Make it visible in the UI and README.

## Prize structure (why this matters for scope)

- Overall: $20K / $10K / $6K (any track)
- Track winner: NVIDIA Jetson Orin Nano
- A project can win **one overall award OR one track award + one bonus award**
- Most Valuable Feedback: $100 + swag (10 winners). The feedback section is a real, separate prize

## Judging (Stage 2): 4 criteria, equally weighted, scored 1–5

1. **Technological Implementation**: how well built; how effectively Token Factory + Nemotron are used
2. **Design**: complete, coherent product experience, not a proof of concept
3. **Potential Impact**: credible, specific case for a real problem for a real audience, shown in the demo
4. **Quality of the Idea**: creative, non-obvious use; genuine understanding of the problem space

Tie-break: criterion 1 first, then 2, 3, 4.

## What we must submit (checklist lives in 06)

- Working project + live demo URL
- Track selection
- Description: what, why, how
- Public YouTube video **≤ 3 min**, shows product working, says out loud how Nebius + Nemotron are used.
  **No copyrighted music, no third-party trademarks/logos** (so we demo on our own sample sites, not real brands).
- Public GitHub repo, **MIT license visible in About**, README with setup + where Nemotron/Token Factory/Tavily are used
- **Feedback** on Token Factory + Nemotron (required field; be specific; separate prize)

## Organizer tips (from Updates)

- Name the project like a human, make it memorable
- Hide API keys; `.env` + `.gitignore`; check repo before submit
- Make the required tools impossible to miss: in description, "Built With", and **with audio** in the video
- Video = pitch, not tutorial. Problem → solution working → who it's for → how Nebius/NVIDIA are used
- Using AI coding assistants to build is explicitly fine

## Extra credits/links found in Updates

- Tavily promo code from the live build session: **`BBDEVPOST`** (apply in Tavily billing), on top of Builders
  Program credits.
- Nebius live build session recording (Devpost YouTube) shows: Hermes agent → Token Factory, model comparison
  via a judge prompt, a **vision model used as a visual QA judge on screenshots**, the same pattern as our
  expert pass. Good precedent to cite in the description.
- Organizers: "Submit early: video uploads and last-minute debugging always take longer than expected."

## Ownership rule

Submission must be the entrant's original work and ideas; third-party technical assistance is allowed.
Winner verification checks the entrant's role. The human owner (Ajit) directs product and design decisions and
must be able to explain every part of the system.
