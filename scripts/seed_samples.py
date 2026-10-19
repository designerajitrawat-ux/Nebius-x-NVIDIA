"""
Run the three sample flows against a FiveUsers API and save the reports as committed samples.

    python scripts/seed_samples.py --api https://<space>.hf.space --web https://<app>.vercel.app --key <JUDGE_TOKEN>

Locally (API in DRY_RUN with ALLOW_PRIVATE_URLS, sample sites served by `npm run dev`):

    python scripts/seed_samples.py --api http://127.0.0.1:7860 --web http://localhost:3000

Each sample lands in api/samples/sample-<flow>/ (report.json, sample.json, screenshots). The API
serves them at /reports/sample-<flow>, so "try a sample" works instantly and survives restarts.
Only stdlib + httpx. Never prints the judge key.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
SAMPLES_DIR = ROOT / "api" / "samples"

FLOWS = [
    ("signup", "Signup", "Sign up and create your first project"),
    ("checkout", "Checkout", "Buy a medium t-shirt in blue and pay by card"),
    ("booking", "Booking", "Book a haircut for next Saturday afternoon"),
]


def wait_for_report(client: httpx.Client, api: str, run_id: str, timeout_s: int) -> dict:
    t0 = time.time()
    last = ""
    while time.time() - t0 < timeout_s:
        state = client.get(f"{api}/runs/{run_id}").json()
        if state.get("stage") != last:
            last = state.get("stage", "")
            print(f"    stage: {last}  (${state.get('cost_usd', 0):.4f})")
        if state.get("status") == "failed":
            raise RuntimeError(state.get("error") or "run failed")
        if state.get("report_ready"):
            return client.get(f"{api}/reports/{run_id}").json()
        time.sleep(3)
    raise TimeoutError(f"no report after {timeout_s}s")


def referenced_files(report: dict) -> set[str]:
    files = set()
    for issue in report["issues"]:
        files.add(issue["screenshot"])
        files.add("annotated/" + issue["screenshot"].replace("/", "_"))
    for steps in report["transcripts"].values():
        files.update(s["screenshot"] for s in steps)
    files.update(e["screenshot"] for e in report["expert"] if e.get("screenshot"))
    return files


def seed(api: str, web: str, key: str | None, only: list[str], timeout_s: int) -> int:
    headers = {"X-FiveUsers-Key": key} if key else {}
    with httpx.Client(timeout=30, headers=headers) as client:
        health = client.get(f"{api}/health").json()
        print(f"API mode: {health['mode']}, budget remaining ${health['budget']['remaining_usd']}")
        for order, (flow, title, task) in enumerate(FLOWS, start=1):
            if only and flow not in only:
                continue
            url = f"{web.rstrip('/')}/samples/{flow}/index.html"
            print(f"\n== {title}: {url}")
            r = client.post(f"{api}/runs", json={"url": url, "task": task})
            if r.status_code >= 400:
                print("  refused:", r.json().get("detail", {}).get("message", r.text))
                return 1
            run_id = r.json()["run_id"]
            report = wait_for_report(client, api, run_id, timeout_s)

            sample_id = f"sample-{flow}"
            out = SAMPLES_DIR / sample_id
            if out.exists():
                shutil.rmtree(out)
            out.mkdir(parents=True)
            for rel in sorted(referenced_files(report)):
                resp = client.get(f"{api}/files/{run_id}/{rel}")
                if resp.status_code == 200:
                    (out / rel).parent.mkdir(parents=True, exist_ok=True)
                    (out / rel).write_bytes(resp.content)
                else:
                    print(f"  missing file {rel} ({resp.status_code})")
            report["id"] = sample_id
            (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
            info = {
                "id": sample_id, "title": title, "url": url, "task": task, "headline": report["headline"],
                "completed": report["completed"], "total": report["total"], "order": order,
            }
            (out / "sample.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  saved {out.relative_to(ROOT)} , {report['headline']}  (${report['usage']['total_cost_usd']:.4f}, mode {report['mode']})")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api", required=True, help="API base URL, e.g. http://127.0.0.1:7860")
    ap.add_argument("--web", required=True, help="Where /samples/<flow>/ is served, e.g. http://localhost:3000")
    ap.add_argument("--key", help="Judge token (X-FiveUsers-Key) to skip the rate limit")
    ap.add_argument("--only", nargs="*", default=[], help="signup checkout booking")
    ap.add_argument("--timeout", type=int, default=900)
    a = ap.parse_args()
    sys.exit(seed(a.api.rstrip("/"), a.web, a.key, a.only, a.timeout))
