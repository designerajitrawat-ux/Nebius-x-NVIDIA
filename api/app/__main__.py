"""`python -m app` runs the API locally (port 7860, like Hugging Face Spaces)."""

import asyncio
import os
import sys

import uvicorn

if __name__ == "__main__":
    if sys.platform == "win32":
        # Playwright launches Chromium as a subprocess, which needs the Proactor loop on Windows.
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    uvicorn.run("app.main:app", host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "7860")), loop="asyncio")
