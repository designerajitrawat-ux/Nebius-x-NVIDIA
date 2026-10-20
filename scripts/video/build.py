"""
Cut the demo film from the recorded scenes: constant 30 fps clips, the live run sped up, soft crossfades,
the original music track underneath, exported as a YouTube-ready 1080p H.264 MP4.

    api\\.venv\\Scripts\\python scripts\\video\\build.py            -> recordings/fiveusers-demo.mp4
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
SCENES = ROOT / "recordings" / "scenes"
OUT_DIR = ROOT / "recordings"
FF = imageio_ffmpeg.get_ffmpeg_exe()

ORDER = ["intro", "problem", "bridge", "hero", "run", "report", "hood", "outro"]
SPEED = {"run": 3.5}
FADE = 0.6
FPS = 30


def run(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(res.stderr[-3000:])


def scene_clip(name: str, info: dict) -> tuple[Path, float]:
    """Frames arrive only when the page changes, so each frame is held until the next one."""
    frames = info["frames"]
    folder = SCENES / name
    lines = ["ffconcat version 1.0"]
    for i, (t, file) in enumerate(frames):
        nxt = frames[i + 1][0] if i + 1 < len(frames) else info["duration"]
        lines.append(f"file '{(folder / file).as_posix()}'")
        lines.append(f"duration {max(0.001, nxt - t):.4f}")
    lines.append(f"file '{(folder / frames[-1][1]).as_posix()}'")
    listing = folder / "frames.ffconcat"
    listing.write_text("\n".join(lines), encoding="utf-8")
    speed = SPEED.get(name, 1.0)
    out = OUT_DIR / "clips" / f"{name}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    vf = f"setpts=PTS/{speed},fps={FPS},scale=1920:1080:flags=lanczos,format=yuv420p"
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-safe", "0", "-f", "concat", "-i", str(listing),
         "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-an", str(out)])
    return out, info["duration"] / speed


def main() -> None:
    meta = json.loads((SCENES / "scenes.json").read_text(encoding="utf-8"))
    clips = [scene_clip(n, meta[n]) for n in ORDER if n in meta]
    total = sum(d for _, d in clips) - FADE * (len(clips) - 1)
    print("scenes:", ", ".join(f"{p.stem} {d:.1f}s" for p, d in clips), f"| total {total:.1f}s")
    if total > 178:
        print("warning: longer than 2:58; trim a scene")

    music = OUT_DIR / "music.wav"
    run([sys.executable, str(Path(__file__).with_name("music.py")), str(music), f"{total + 2:.1f}"])

    inputs: list[str] = []
    for p, _ in clips:
        inputs += ["-i", str(p)]
    inputs += ["-i", str(music)]
    chain = []
    last = "[0:v]"
    offset = 0.0
    for i in range(1, len(clips)):
        offset += clips[i - 1][1] - FADE
        label = f"[v{i}]"
        chain.append(f"{last}[{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}{label}")
        last = label
    a = len(clips)
    chain.append(f"[{a}:a]atrim=0:{total:.3f},afade=t=in:d=1.5,afade=t=out:st={total - 3:.3f}:d=3,volume=0.85[a]")
    out = OUT_DIR / "fiveusers-demo.mp4"
    run([FF, "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chain),
         "-map", last, "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
    print(f"wrote {out} ({total:.1f}s, {out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
