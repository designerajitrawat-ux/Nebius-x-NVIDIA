# FiveUsers API

FastAPI + Playwright backend for [FiveUsers](https://github.com/designerajitrawat-ux/Nebius-x-NVIDIA): persona agents that test a website in a real
browser, powered by NVIDIA Nemotron on Nebius Token Factory, with Tavily for research and references.

This folder is deployed to Modal with `modal deploy modal_app.py`; the `Dockerfile` runs it anywhere else.
Health check: `GET /health`.
See the main repository README for how it works and `docs/deploy.md` for deployment steps.
