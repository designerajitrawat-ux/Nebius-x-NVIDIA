---
title: FiveUsers API
emoji: 🧪
colorFrom: gray
colorTo: red
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Five AI users walk through your product before real ones do.
---

# FiveUsers API

FastAPI + Playwright backend for [FiveUsers](https://github.com/), persona agents that test a website in a real
browser, powered by NVIDIA Nemotron on Nebius Token Factory, with Tavily for research and references.

This folder is deployed as a Hugging Face Space (Docker SDK). Health check: `GET /health`.
See the main repository README for how it works and `docs/deploy.md` for deployment steps.
