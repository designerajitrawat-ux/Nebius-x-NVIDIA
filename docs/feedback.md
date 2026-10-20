# Feedback on Nebius Token Factory and NVIDIA Nemotron

Written from building FiveUsers: five persona agents that use a website in parallel, about 130 Nemotron calls per
run across four models (Nemotron 3.5 Lightning, Nemotron 3.5 Super VL, Nemotron 3 Super, Nemotron 3 Ultra). Every
point below is something we hit and measured, with what would have saved us time.

## What worked well

- **Drop-in OpenAI compatibility.** The `openai` SDK pointed at `api.tokenfactory.nebius.com/v1/` just worked:
  chat, `response_format` with a JSON schema, tool calls and image inputs. Our whole client is one file.
- **Structured tool calls on Nemotron 3 Super.** Click, type, fill, scroll, give up and done came back as real
  `tool_calls` from the first day-0 test, fast enough (about a second) to drive five agents at once.
- **Nemotron 3.5 Super VL is a good judge of screens.** When we asked "is the user's goal achieved on this screen?",
  the vision model got 12 of 12 real screenshots right, where text-only checks failed (see below).
- **Cost is predictable.** `usage` on every response let us keep an exact per-run ledger: about $0.10 per run, with
  Super doing the bulk of the calls (about 62% of cost), Super VL about 28%, Ultra about 9%.

## What cost us time

1. **Model catalogue vs. hackathon material.** The materials point to Nemotron 3 Nano Omni for vision; our account
   lists Nemotron 3.5 Super VL instead. Model ids also mix styles (`nvidia/Nemotron-3_5-Lightning`,
   `nvidia/Nemotron-3.5-Super-VL`, `nvidia/nemotron-3-super-120b-a12b`). A table of current ids per capability in the
   docs, with consistent naming, would remove guesswork.
2. **Reasoning is on by default and has no budget.** With `enable_thinking` on, Nemotron 3 Ultra spent all 12,000
   `max_tokens` thinking on a 5,000-token synthesis prompt, every time, and returned truncated JSON
   (`finish_reason: length`). Turning thinking off gave a complete, good report in about 5 seconds for about $0.01.
   Super VL with thinking on and a small `max_tokens` returned empty content for the same reason. A
   `max_reasoning_tokens` style limit, and a note per model on the default, would help a lot.
3. **`chat_template_kwargs.enable_thinking` is not documented per model.** We found it from NVIDIA's model cards and
   had to test which models accept it.
4. **Text-only judging misreads UI.** Lightning, and once Super, read a kanban board's own "To do / Done 0" columns as
   "task not finished" under a large "Your project is ready" heading. Worth a line in the docs: for UI state, give a
   vision model the screenshot.
5. **Date awareness.** Models assumed an earlier year, so a correct October 2026 calendar was reported as a
   critical "wrong month" bug. We now pass today's date in every prompt; a docs tip would save others the same bug.
6. **Promo code onboarding.** The hackathon code `NEBIUS-DEVPOST-GLOBAL26` is a form activation code, but the obvious
   place to try it is Balance > Top up > With promo code, which answers "Invalid promo code". The real code arrives by
   email after the form. One sentence in that error ("hackathon codes are redeemed at nebius.com/promo-code") would
   fix it. "Sandboxes" in the console also read like a free test tier at first.

## Small wishes

- The field that carries the model's thinking documented next to `content`, so clients can log or hide it reliably.
- Per-model rate limits shown in the console, to size parallel agents with confidence.
