"""
Original background track for the demo video, synthesised from scratch (no samples, no third-party audio),
so it is free of copyright. Soft lo-fi electronic at 96 BPM: warm pads, a gentle kick, hats and a bright
arpeggio that enters after the intro, ducking under the kick, fading out at the end.

    api\\.venv\\Scripts\\python scripts\\video\\music.py recordings\\music.wav 165
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
RNG = np.random.default_rng(11)

# Am7, Fmaj7, Cmaj7, G6 voiced around middle C (MIDI numbers)
CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 64]]
BASS = [45, 41, 48, 43]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # one-pole, run twice for 12 dB/oct
        acc = (1 - a) * v + a * acc
        y[i] = acc
    z = np.empty_like(y)
    acc = 0.0
    for i, v in enumerate(y):
        acc = (1 - a) * v + a * acc
        z[i] = acc
    return z


def saw(f: float, t: np.ndarray) -> np.ndarray:
    return 2 * ((t * f) % 1.0) - 1


def pad_note(m: int, dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    tone = sum(saw(hz(m) * d, t + RNG.random()) for d in (0.996, 1.0, 1.004)) / 3
    env = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 0.8).clip(0, 1)
    return tone * env


def pluck(m: int, dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    tri = 2 * np.abs(2 * ((t * hz(m)) % 1) - 1) - 1
    sine = np.sin(2 * np.pi * hz(m + 12) * t) * 0.35
    return (tri + sine) * np.exp(-t * 7.5)


def kick() -> np.ndarray:
    t = np.arange(int(0.45 * SR)) / SR
    f = 42 + 90 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def hat(open_: bool = False) -> np.ndarray:
    n = int((0.18 if open_ else 0.05) * SR)
    noise = RNG.standard_normal(n)
    noise = noise - lowpass(noise, 6500)  # keep the top end
    return noise * np.exp(-np.arange(n) / SR * (14 if open_ else 60))


def render(seconds: float) -> np.ndarray:
    n = int(seconds * SR)
    pads = np.zeros(n)
    bass = np.zeros(n)
    arp = np.zeros(n)
    drums = np.zeros(n)
    duck = np.ones(n)
    bars = int(seconds / BAR) + 1
    k = kick()
    for b in range(bars):
        start = int(b * BAR * SR)
        if start >= n:
            break
        chord = CHORDS[b % 4]
        for m in chord:
            note = pad_note(m, BAR + 0.6)
            end = min(n, start + len(note))
            pads[start:end] += note[: end - start] * 0.16
        bnote = pad_note(BASS[b % 4] - 12, BAR)
        end = min(n, start + len(bnote))
        bass[start:end] += np.sin(np.cumsum(np.full(end - start, 2 * np.pi * hz(BASS[b % 4] - 12) / SR))) * np.minimum(1, np.arange(end - start) / SR / 0.05) * 0.30
        drums_on = 4 <= b < bars - 3
        arp_on = 8 <= b < bars - 2
        for beat in range(4):
            s = start + int(beat * BEAT * SR)
            if drums_on:
                e = min(n, s + len(k))
                drums[s:e] += k[: e - s] * 0.55
                d = np.minimum(1, 0.45 + 0.55 * np.arange(int(0.3 * SR)) / (0.3 * SR))
                de = min(n, s + len(d))
                duck[s:de] = np.minimum(duck[s:de], d[: de - s])
                for off, open_ in ((0.5, beat == 3),):
                    hs = s + int(off * BEAT * SR)
                    hh = hat(open_)
                    he = min(n, hs + len(hh))
                    if hs < n:
                        drums[hs:he] += hh[: he - hs] * 0.06
            if arp_on:
                for eighth in range(2):
                    idx = (beat * 2 + eighth + b) % 4
                    m = chord[idx] + 12
                    ps = s + int(eighth * BEAT / 2 * SR)
                    p = pluck(m, 0.6)
                    pe = min(n, ps + len(p))
                    if ps < n:
                        arp[ps:pe] += p[: pe - ps] * 0.11
    pads = lowpass(pads, 1400)
    mix_l = (pads * duck + bass * duck * 0.9) + drums + arp * 0.9
    mix_r = (pads * duck + bass * duck * 0.9) + drums + np.roll(arp, int(0.012 * SR))
    # a little space: two feedback taps
    for d, g in ((0.27, 0.22), (0.41, 0.14)):
        sh = int(d * SR)
        mix_l[sh:] += mix_r[:-sh] * g
        mix_r[sh:] += mix_l[:-sh] * g
    stereo = np.stack([mix_l, mix_r], axis=1)
    fade_in = np.minimum(1, np.arange(n) / (2.5 * SR))
    fade_out = np.minimum(1, (n - np.arange(n)) / (5 * SR))
    stereo *= (fade_in * fade_out)[:, None]
    stereo /= np.max(np.abs(stereo)) + 1e-9
    return stereo * 0.89


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "recordings/music.wav")
    seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 165
    out.parent.mkdir(parents=True, exist_ok=True)
    pcm = (render(seconds) * 32767).astype(np.int16)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {out} ({seconds:.0f} s)")


if __name__ == "__main__":
    main()
