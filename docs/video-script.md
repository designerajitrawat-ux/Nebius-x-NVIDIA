# Video script: target 2:40 (hard limit 3:00)

Rules from the hackathon: public YouTube, no copyrighted music (none, or royalty-free), no third-party logos;
record only FiveUsers and its own sample sites. Say **"Nebius Token Factory"** and **"NVIDIA Nemotron"** out loud.

Setup: browser at 1280×800, 100% zoom, bookmarks bar hidden. Record on the deployed site. Run the **signup** sample
live (it gives a mix: most finish, one gets stuck), and have its finished report open in a second tab in case the live
run is slow. Mic close, room quiet. Speak slower than feels natural. Move the mouse slowly: the characters' eyes
follow it.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Landing. Move the cursor slowly across the hero so the five characters follow it with their eyes. | "Before you ship, you should watch five people try your product. Five users find most usability problems. Almost nobody does it, because getting five people is slow and expensive." |
| 0:12–0:25 | Click the website field (the characters look at it), type the signup sample URL, click the task chip "Sign up and create your first project" (they smile), click **Run the test** (they jump). | "This is FiveUsers. Paste a link, say what to try, and five AI users try your website before real ones do." |
| 0:25–0:40 | The dark lab: the stage pipeline lights up Preparing, Recruiting; five characters arrive. | "First it researches your kind of product with Tavily and recruits five people for it: a first-timer, someone in a hurry, a phone-only user, someone less confident online, and a non-native English reader." |
| 0:40–1:10 | Lanes walking. Point at one lane: its face changes, its thought bubble updates. Then the phone lane. | "Each one really uses the site, in a real browser, all at the same time. Every step runs on **NVIDIA Nemotron through Nebius Token Factory**: Nemotron Super VL looks at the screen in the persona's voice, Nemotron Super decides what to click, type or give up on. Their faces show how confused they are, step by step." |
| 1:10–1:20 | The lane that gets stuck gets its stamp. | "On his phone, Kwame can't find how to create a project: the plus button has no label. He gives up, exactly what a real user would do." (Change the name and reason to match the run you record.) |
| 1:20–1:30 | Pipeline: Reviewing, Writing, then the "report is ready" panel with happy characters. | "An expert pass reviews every screen they saw, and Nemotron Ultra writes the report." |
| 1:30–2:10 | Report: the headline, the testers strip, issue 1 with the pin on the screenshot and the quote; click **Before / After**; scroll to "See how others do it". | "The report says it plainly: one of five users couldn't sign up and create a project. Every issue is pinned on the real screen, in the persona's own words, with a concrete fix you can ship. And Tavily shows how other products handle the same step." |
| 2:10–2:25 | Scroll to Model usage (dark card). | "Every claim is grounded in what actually happened, and you can see which Nemotron model did what. This whole test cost about ten cents." |
| 2:25–2:40 | Back to the landing, "Under the hood" section, then the end card with the URL. | "It's for designers, founders and small teams who can't recruit five users before every release. FiveUsers. Try it at (your URL)." |

## Shot checklist
- [ ] Characters' eyes following the cursor, smiling when the form is ready, jumping on Run
- [ ] The dark lab: pipeline lighting up, five lanes arriving
- [ ] A face changing as confusion rises, and one persona giving up
- [ ] An annotated screenshot with a numbered pin and a quote
- [ ] A concrete fix with the Before / After toggle
- [ ] "See how others do it · via Tavily"
- [ ] Model usage with the Nemotron tiers and the cost
- [ ] Words said out loud: "Nebius Token Factory", "NVIDIA Nemotron", "Tavily"

## Recording tips
- OBS: 1920×1080 canvas, browser window 1280×800 scaled up, 30 fps. Record voice separately if the room is noisy.
- If a live run is slow, cut the waiting (the video is a pitch, not a tutorial), but keep it honest: don't splice
  one run's lanes with another run's report without saying so.
- The repo goes public about two days before the deadline; if you show it, record that shot after it's public.
