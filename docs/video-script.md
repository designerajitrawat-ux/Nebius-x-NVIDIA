# Demo video: script and how it is made

Target about 2:10 (the current cut is 2:08) (hard limit 3:00). The film is recorded and cut by scripts, so it can be rebuilt in a few minutes
against the deployed site.

Rules from the hackathon (checked on the Devpost page): the video is required, under three minutes, public on
YouTube, and it must show the project working. No copyrighted music and no third-party trademarks unless we have
permission. So the film shows only FiveUsers and its own sample sites, and the music is our own: it is synthesised
note by note in `scripts/video/music.py`, with no samples or loops from anywhere else.

## How the film is made

| Step | Script | What it does |
|---|---|---|
| 1 | `scripts/video/record.py` | Opens Chromium at 1920x1080, plays every scene and captures frames straight from the browser (Chrome DevTools screencast). Starts a **real live run** on the signup sample, with on-screen captions and a visible cursor. |
| 2 | `scripts/video/build.py` | Turns each scene into a 30 fps clip, speeds the live run up 3.5x (a tag in the corner says so), crossfades the scenes, then lays the music under it and exports `recordings/fiveusers-demo.mp4` (H.264, 1080p, AAC). |
| 3 | `scripts/video/music.py` | Writes the original track to the film's exact length: soft lo-fi at 96 BPM, Am7, Fmaj7, Cmaj7, G6, with fades. |

The title cards live in `scripts/video/cards.html`, in the same fonts, colours and characters as the site.

```
api\.venv\Scripts\python scripts\video\record.py --web https://<vercel-url> --api https://<space-url> --outro-url <short-url>
api\.venv\Scripts\python scripts\video\build.py
```

Run the final version **after deploy**, so the typed link and the end card show the public URL and not localhost.
One take costs one real run (about $0.11 of Nebius credit).

## Scenes and captions

| Time | Scene | On screen | Caption |
|---|---|---|---|
| 0:00 | Intro card | Five characters pop in. "Before you ship, watch five people try it." | none |
| 0:06 | Problem card | "5 users find most of a product's usability problems. Recruiting them takes days." | none |
| 0:13 | Bridge card (dark) | "So we built five AI users." | none |
| 0:19 | Landing | The cursor moves across the hero and the characters' eyes follow it. The URL is typed in, a task chip is picked, the characters smile, then **Run the test** makes them jump. | "Paste a link. Say what to try." then "Five testers are watching you fill it in." |
| 0:34 | Live run (dark lab, 3.5x) | The stage pipeline lights up, five lanes arrive, each showing its live screen, thought and confusion meter, faces change as confusion rises, testers finish or give up, then the "report is ready" panel. | "Tavily researches who uses this kind of product", "Every step runs on NVIDIA Nemotron via Nebius Token Factory", "Nemotron 3.5 Super VL sees the screen. Nemotron 3 Super decides.", "Their faces show how confused they are", "An expert pass reviews every screen they saw", "Nemotron 3 Ultra writes the report" |
| 1:25 | Report | Headline, the testers strip, issue 1 with its pin on the real screenshot and the quote, the Before / After toggle, "See how others do it", then Model usage with the cost. | "Who finished, and who didn't", "Every issue is pinned on the real screen", "In the tester's own words, with the fix to ship", "How other products solve it, found by Tavily", "Every Nemotron call and its cost: about ten cents a test" |
| 1:51 | Under the hood (landing) | The four Nemotron models and what each one does. | "Four Nemotron models, each on the job it does best" |
| 1:59 | End card | "Five AI users try your website before real ones do." The URL and "Design by Ajit Singh Rawat". | none |

Times are from the draft cut and move by a second or two with each live run.

## Optional voiceover

The film works with music and captions alone. If you want a voice, record these lines over the matching scenes
(speak slowly, mic close, quiet room). Keep the music at about 20% under the voice.

| Starts at | Line |
|---|---|
| 0:00 | "Before you ship, you should watch five people try your product." |
| 0:06 | "Five users find most usability problems. But recruiting them takes days, so most teams skip it." |
| 0:13 | "So we built five AI users." |
| 0:19 | "This is FiveUsers. Paste a link, say what to try, and run the test." |
| 0:34 | "Tavily researches who uses this kind of product, and five people are recruited for it. Each one uses the site in a real browser, at the same time. Every step runs on NVIDIA Nemotron through Nebius Token Factory: Nemotron Super VL looks at the screen, Nemotron Super decides what to do, and a tester can give up, just like a real person." |
| 1:10 | "An expert pass reviews every screen, and Nemotron Ultra writes the report." |
| 1:25 | "Who finished and who didn't. Every issue pinned on the real screen, in the tester's own words, with a fix you can ship. Tavily shows how other products solve it. And the whole test cost about ten cents." |
| 1:51 | "Four Nemotron models, each on the job it does best." |
| 1:59 | "FiveUsers. Five AI users try your website before real ones do." |

Make sure these words are heard or seen: "Nebius Token Factory", "NVIDIA Nemotron", "Tavily".

## Before uploading
- [ ] Rendered after deploy: no localhost in the typed link, the real URL on the end card
- [ ] Length under 3:00
- [ ] Uploaded to YouTube as **Public** (not Unlisted), title "FiveUsers: five AI users try your website before real ones do"
- [ ] YouTube description: the live demo link, the repo link, and a line saying the music is original
- [ ] Link pasted into the Devpost "Video demo link" field
