# FiveUsers

**Five AI users walk through your product before real ones do.**

> Hackathon entry for the Nebius x NVIDIA Global AI Hackathon, Best Apps and Agents track.
> Runs on **Nebius Token Factory** with **NVIDIA Nemotron** models; competitor references via **Tavily**.


## Status

Day 0, scaffolding. See `docs/05-build-plan.md`.

## Quick start (dev)

```bash
cp .env.example .env            # fill NEBIUS_API_KEY, TAVILY_API_KEY, model IDs
pip install openai tavily-python python-dotenv
python scripts/day0_test.py     # smoke test: models, one Nemotron call, one Tavily call
```

## Where the required tools are used

| Step | Service | Model |
|---|---|---|
| Persona generation, per-step decisions | Nebius Token Factory | Nemotron 3 Super |
| Reading screenshots | Nebius Token Factory | Nemotron 3 Nano Omni |
| Small utility calls | Nebius Token Factory | Nemotron 3.5 Lightning / Nano |
| Final report synthesis | Nebius Token Factory | Nemotron 3 Ultra |
| Persona research, competitor references | Tavily | search / extract |

## License

MIT, see `LICENSE`.
