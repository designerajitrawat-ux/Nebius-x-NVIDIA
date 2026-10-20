"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useEffect, useState } from "react";
import { CAST, HERO_BEATS, HERO_REST } from "@/lib/landing";
import { Blob, type Mood } from "./Blob";

const BEAT_MS = 2600;
/** -1 = personas arrive, 0..n-1 = one persona acts, n = report ready. */
const LAST = HERO_BEATS.length;

const TONE = {
  critical: { bg: "#ff4d4d", ring: "rgba(255,77,77,0.35)", label: "Critical" },
  major: { bg: "#ff8a3d", ring: "rgba(255,138,61,0.35)", label: "Major" },
  minor: { bg: "#f2b705", ring: "rgba(242,183,5,0.35)", label: "Minor" },
} as const;

const spring = { type: "spring", stiffness: 120, damping: 18, mass: 0.9 } as const;

/**
 * The hero: five persona orbs use a real sample page (the Fernhill pricing screen), think out loud,
 * and drop issue pins, then the run turns into a report. It loops; with reduced motion it rests on
 * the finished state.
 */
export function HeroStage() {
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(-1);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduce) {
      setBeat(LAST);
      return;
    }
    const id = window.setInterval(() => {
      setBeat((b) => {
        if (b >= LAST) {
          setCycle((c) => c + 1);
          return -1;
        }
        return b + 1;
      });
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const active = beat >= 0 && beat < LAST ? HERO_BEATS[beat] : null;
  const pins = HERO_BEATS.slice(0, Math.max(0, Math.min(beat, LAST - 1) + (beat >= 0 ? 1 : 0))).filter((b) => b.pin);
  const done = beat >= LAST;

  return (
    <div className="relative isolate mx-auto w-full max-w-[640px] select-none lg:max-w-none" aria-hidden="true">
      {/* Glow and blueprint behind the window */}
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute top-[8%] left-[12%] h-[62%] w-[62%] rounded-full bg-violet/25 blur-3xl" />
        <div className="absolute right-[2%] bottom-[6%] h-[46%] w-[46%] rounded-full bg-lime/50 blur-3xl" />
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(closest-side,black,transparent)]" />
      </div>

      {/* Live chip */}
      <motion.div
        className="glass absolute -top-5 left-4 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-13 font-medium text-ink sm:left-8"
        initial={false}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: reduce ? 0 : Infinity, ease: "easeInOut" }}
      >
        <span className="relative flex h-2.5 w-2.5">
          {!done && !reduce ? <span className="absolute inset-0 animate-ping rounded-full bg-p-mint opacity-60" /> : null}
          <span className={`relative h-2.5 w-2.5 rounded-full ${done ? "bg-violet" : "bg-p-mint"}`} />
        </span>
        {done ? "Report ready" : "Live · 5 AI users testing"}
      </motion.div>

      {/* The browser window */}
      <motion.div
        className="relative overflow-visible rounded-[18px] bg-white shadow-float"
        style={{ transformPerspective: 1400 }}
        initial={reduce ? false : { rotateX: 8, rotateY: -10, y: 30, opacity: 0 }}
        animate={{ rotateX: 4, rotateY: -6, y: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="flex h-9 items-center gap-2 rounded-t-[18px] border-b border-lilac-2 bg-mist px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c941]" />
          <span className="mx-auto flex h-6 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] text-ink-2 shadow-[0_0_0_1px_var(--color-lilac-2)]">
            <svg width="9" height="10" viewBox="0 0 9 10" fill="none"><rect x="1" y="4.5" width="7" height="5" rx="1.2" fill="currentColor" /><path d="M2.6 4.5V3a1.9 1.9 0 0 1 3.8 0v1.5" stroke="currentColor" strokeWidth="1.1" /></svg>
            fernhill.app/pricing
          </span>
          <span className="w-10" />
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-b-[18px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/pricing.jpg" alt="" className="block aspect-[1.6] w-full object-cover object-top" draggable={false} />
            <motion.div
              className="absolute inset-0 rounded-b-[18px] bg-gradient-to-t from-violet/20 via-transparent to-transparent"
              animate={{ opacity: done ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            />
          </div>

          {/* Issue pins */}
          <AnimatePresence>
            {pins.map((b) => {
              const tone = TONE[b.pin!.tone];
              return (
                <motion.div
                  key={`${cycle}-pin-${b.pin!.n}`}
                  className="absolute z-10"
                  style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
                  initial={reduce ? false : { y: -40, opacity: 0, scale: 0.4 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: reduce ? 0 : 0.9 }}
                >
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-13 font-semibold text-white"
                    style={{ background: tone.bg, boxShadow: `0 0 0 6px ${tone.ring}, 0 6px 14px -4px ${tone.bg}` }}
                  >
                    {b.pin!.n}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Personas */}
          {CAST.map((p, i) => {
            const isActive = active?.who === p.id;
            const pos = isActive ? { x: active!.x, y: active!.y } : HERO_REST[p.id];
            return (
              <motion.div
                key={p.id}
                className="absolute z-20"
                initial={reduce ? false : { left: `${HERO_REST[p.id].x * 100}%`, top: "-30%", opacity: 0 }}
                animate={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, opacity: done && !reduce ? 0.85 : 1 }}
                transition={{ ...spring, delay: beat === -1 ? 0.15 * i : 0 }}
              >
                <motion.div
                  className="-translate-x-1/2 -translate-y-1/2"
                  animate={reduce ? undefined : { y: isActive ? 0 : [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div animate={{ scale: isActive ? 1.22 : 1 }} transition={spring}>
                    <Blob hue={p.hue} size={44} accessory={p.accessory} mood={moodOf(p.id, beat)} look={isActive ? { x: 0, y: 0.8 } : { x: 0, y: 0 }} />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}

          {/* Click ripple + thought bubble for the active persona */}
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={`${cycle}-${beat}`}
                className="pointer-events-none absolute z-30"
                style={{ left: `${active.x * 100}%`, top: `${active.y * 100}%` }}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <motion.span
                  className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: [0.2, 1.6], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.9, delay: 0.7, ease: "easeOut" }}
                />
                <Bubble beatX={active.x} beatY={active.y} who={active.who} say={active.say} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Report-ready card */}
      <AnimatePresence>
        {done ? (
          <motion.div
            key={`${cycle}-report`}
            className="glass absolute -right-2 -bottom-8 z-40 w-[250px] rounded-[18px] p-4 sm:-right-6"
            initial={reduce ? false : { y: 24, opacity: 0, rotate: 4 }}
            animate={{ y: 0, opacity: 1, rotate: -2 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
          >
            <p className="text-13 font-semibold text-ink">3 issues found</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {HERO_BEATS.filter((b) => b.pin).map((b) => {
                const tone = TONE[b.pin!.tone];
                return (
                  <li key={b.pin!.n} className="flex items-center gap-2 text-13 text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: tone.bg }}>
                      {b.pin!.n}
                    </span>
                    <span className="min-w-0 truncate">{b.pin!.label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-lilac-2 pt-2 text-[12px] text-ink-2">Written by Nemotron 3 Ultra · with fixes</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Calm while waiting; the face they made on their beat; still showing it once the report is in. */
function moodOf(id: string, beat: number): Mood {
  const idx = HERO_BEATS.findIndex((b) => b.who === id);
  if (idx === -1 || beat < idx) return "calm";
  return HERO_BEATS[idx].mood;
}

function Bubble({ beatX, beatY, who, say }: { beatX: number; beatY: number; who: string; say: string }) {
  const person = CAST.find((c) => c.id === who)!;
  const left = beatX > 0.55;
  const below = beatY < 0.3;
  return (
    <motion.div
      className={`absolute w-[230px] ${left ? "right-6" : "left-6"} ${below ? "top-5" : "bottom-5"}`}
      initial={{ opacity: 0, y: below ? -6 : 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.85 }}
    >
      <div className="rounded-[16px] border border-white bg-white/95 px-3.5 py-2.5 shadow-float backdrop-blur">
        <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full" style={{ background: person.hue[1] }} />
        <p className="text-[11px] font-medium tracking-wide text-ink-2 uppercase">
          {person.name} · {person.archetype}
        </p>
        <p className="voice mt-0.5 text-17 leading-snug text-ink">&ldquo;{say}&rdquo;</p>
      </div>
    </motion.div>
  );
}
