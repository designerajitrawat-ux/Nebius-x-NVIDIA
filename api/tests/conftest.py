"""Point the app at a throwaway data dir and a known config before anything imports it."""

import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="fiveusers-test-")
os.environ["DATA_DIR"] = _tmp
os.environ["SAMPLES_DIR"] = str(Path(_tmp) / "samples")
os.environ["DRY_RUN"] = ""
os.environ["NEBIUS_API_KEY"] = ""
os.environ["JUDGE_TOKEN"] = "judge-secret"
for tier in ("FAST", "VISION", "AGENT", "REASON"):
    os.environ[f"NEMOTRON_{tier}"] = ""

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
