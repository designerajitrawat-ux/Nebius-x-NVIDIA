"""
FiveUsers API on Modal (serverless containers, billed per second, scales to zero when idle).

    cd api
    modal deploy modal_app.py

One-time setup (docs/deploy.md): `modal token new`, then a Modal Secret named "fiveusers" holding
NEBIUS_API_KEY, TAVILY_API_KEY and JUDGE_TOKEN. Set FIVEUSERS_ORIGINS before deploying to allow the web app,
e.g. FIVEUSERS_ORIGINS=https://fiveusers.vercel.app,http://localhost:3000
"""

from __future__ import annotations

import os
from pathlib import Path

import modal

HERE = Path(__file__).resolve().parent
APP_NAME = "fiveusers-api"
WORKSPACE = os.getenv("MODAL_WORKSPACE", "designerajitrawat-ux")
PUBLIC_URL = f"https://{WORKSPACE}--{APP_NAME}.modal.run"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_requirements(str(HERE / "requirements.txt"))
    .run_commands("playwright install --with-deps chromium")
    .env({
        "PYTHONUNBUFFERED": "1",
        "DATA_DIR": "/data",
        "DB_PATH": "/tmp/fiveusers.db",
        "DB_BACKUP_PATH": "/data/fiveusers.db",
        "SAMPLES_DIR": "/root/samples",
        "CHROMIUM_ARGS": "--no-sandbox --disable-dev-shm-usage",
        "KEEPALIVE_URL": PUBLIC_URL,
        "ALLOWED_ORIGINS": os.getenv("FIVEUSERS_ORIGINS", "http://localhost:3000"),
        "NEMOTRON_FAST": "nvidia/Nemotron-3_5-Lightning",
        "NEMOTRON_VISION": "nvidia/Nemotron-3.5-Super-VL",
        "NEMOTRON_AGENT": "nvidia/nemotron-3-super-120b-a12b",
        "NEMOTRON_REASON": "nvidia/Nemotron-3-Ultra-550b-a55b",
        "BUDGET_USD_SOFT": "18",
        "BUDGET_USD_HARD": "25",
        # One small container: one run at a time, its five testers in parallel.
        "MAX_CONCURRENT_RUNS": "1",
        "WALKER_CONCURRENCY": "5",
    })
    .add_local_dir(str(HERE / "app"), remote_path="/root/app")
    .add_local_dir(str(HERE / "samples"), remote_path="/root/samples")
)

app = modal.App(APP_NAME, image=image)
data = modal.Volume.from_name("fiveusers-data", create_if_missing=True)


@app.function(
    secrets=[modal.Secret.from_name("fiveusers")],
    volumes={"/data": data},
    # Billed on the request while idle, on actual use up to the limit while five browsers run.
    cpu=(0.5, 4.0),
    memory=(1024, 6144),
    # Runs, live events and the rate limiter share memory, so there is only ever one container.
    max_containers=1,
    scaledown_window=120,
    timeout=1200,
)
@modal.concurrent(max_inputs=50)
@modal.asgi_app(label=APP_NAME)
def web():
    from app.main import app as fastapi_app

    return fastapi_app
