"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { FormActivity } from "@/components/start/StartForm";
import { CAST, type CastMember } from "@/lib/landing";
import { Blob, type Mood } from "./Blob";

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08 * i, ease: [0.2, 0.7, 0.2, 1] as const } }),
};

/** Each persona's resting face, before you start typing. */
const IDLE: Record<string, Mood> = { amina: "calm", diego: "calm", kwame: "curious", margaret: "worried", sunita: "calm" };
const PERCH = [0.1, 0.29, 0.5, 0.71, 0.9];

/**
 * Above the fold the form is the hero. The five testers sit on top of the command bar and watch
 * you fill it in: their eyes follow you, they get happy when it's ready and jump when you press Run.
 */
export function Hero({ form }: { form: (onActivity: (a: FormActivity) => void) => ReactElement }) {
  const reduce = useReducedMotion();
  const anim = (i: number) => (reduce ? {} : { variants: rise, initial: "hidden", animate: "show", custom: i });
  const [activity, setActivity] = useState<FormActivity>("idle");
  const onActivity = useCallback((a: FormActivity) => setActivity(a), []);
  const pointer = usePointer(!reduce);

  return (
    <section id="start" aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-[92px] pb-16 sm:pt-[140px] sm:pb-24">
      <HeroBackdrop />

      <div className="page relative text-center">
        <motion.p {...anim(0)} className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-13 font-medium text-ink">
          <Spark />
          <span className="sm:hidden">Powered by NVIDIA Nemotron</span>
          <span className="hidden sm:inline">AI usability testing, powered by NVIDIA Nemotron</span>
        </motion.p>

        <motion.h1
          {...anim(1)}
          id="hero-title"
          className="display mx-auto mt-6 max-w-[21ch] text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-[4rem] lg:text-[4.4rem]"
        >
          Five AI users try your website <span className="marker">before real ones do.</span>
        </motion.h1>

        <motion.p {...anim(2)} className="mx-auto mt-5 max-w-[56ch] text-15 leading-relaxed text-ink-2 sm:mt-6 sm:text-17">
          Paste a link and say what to try. Five different people use your site in a real browser while you watch, then
          you get where they got stuck, why, and the exact fix.
        </motion.p>

        <motion.div {...anim(3)} className="relative mx-auto mt-24 max-w-[920px] text-left sm:mt-28">
          <Perch activity={activity} pointer={pointer} />
          {form(onActivity)}
        </motion.div>
      </div>
    </section>
  );
}

/** The five characters peeking over the top edge of the command bar. */
function Perch({ activity, pointer }: { activity: FormActivity; pointer: { x: number; y: number } | null }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[58px] h-[64px] sm:-top-[70px] sm:h-[76px]">
      {CAST.map((p, i) => (
        <Percher key={p.id} p={p} i={i} activity={activity} pointer={pointer} reduce={!!reduce} />
      ))}
    </div>
  );
}

function Percher({
  p,
  i,
  activity,
  pointer,
  reduce,
}: {
  p: CastMember;
  i: number;
  activity: FormActivity;
  pointer: { x: number; y: number } | null;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  const mood: Mood = hover
    ? "happy"
    : activity === "submitting"
      ? "excited"
      : activity === "ready"
        ? "happy"
        : activity === "error"
          ? i % 2
            ? "confused"
            : "worried"
          : activity === "url" || activity === "task"
            ? "curious"
            : IDLE[p.id] ?? "calm";

  // Eyes: towards the focused field while typing, otherwise towards the pointer.
  let look = { x: 0, y: 0.6 };
  const el = ref.current;
  if (el && typeof window !== "undefined") {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const focused = activity === "url" || activity === "task" ? document.activeElement : null;
    const target = focused instanceof HTMLElement ? centerOf(focused) : pointer;
    if (target) {
      const dx = target.x - cx;
      const dy = target.y - cy;
      const d = Math.max(60, Math.hypot(dx, dy));
      look = { x: (dx / d) * 1.2, y: (dy / d) * 1.2 };
    }
  }

  const size = 64;
  return (
    <motion.div
      ref={ref}
      className="pointer-events-auto absolute bottom-0 -translate-x-1/2"
      style={{ left: `${PERCH[i] * 100}%` }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      animate={
        reduce
          ? undefined
          : activity === "submitting"
            ? { y: [0, -34, 0], transition: { duration: 0.6, repeat: Infinity, delay: i * 0.08 } }
            : { y: [0, -5, 0], transition: { duration: 3 + i * 0.35, repeat: Infinity, ease: "easeInOut" } }
      }
    >
      <div className="relative translate-y-[16%] scale-[0.72] sm:scale-100">
        <Blob hue={p.hue} size={size} mood={mood} look={look} accessory={p.accessory} />
        <span
          className={`absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white transition-all duration-200 ${
            hover ? "opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          {p.name} · {p.archetype}
        </span>
      </div>
    </motion.div>
  );
}

function centerOf(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Pointer position in viewport pixels, updated at most once per frame. */
function usePointer(enabled: boolean) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [enabled]);
  return pos;
}

/** Soft violet sky, film grain and one white wave behind the command bar. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#cfc8ff_0%,#e6e2fb_45%,transparent_75%)]" />
      <div className="absolute -top-24 left-[8%] h-[420px] w-[420px] rounded-full bg-p-sky/25 blur-[110px]" />
      <div className="absolute top-10 right-[6%] h-[380px] w-[380px] rounded-full bg-lime/30 blur-[110px]" />
      <svg className="absolute inset-x-0 bottom-[8%] h-[300px] w-full" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wave" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 210 C 260 90, 520 80, 760 150 S 1200 250, 1440 120 L1440 300 L0 300 Z" fill="url(#wave)" />
        <path d="M0 210 C 260 90, 520 80, 760 150 S 1200 250, 1440 120" fill="none" stroke="#ffffff" strokeWidth="2" />
      </svg>
      <div className="grain absolute inset-0 opacity-[0.18] mix-blend-soft-light" />
    </div>
  );
}

function Spark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 0c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" fill="var(--color-violet)" />
    </svg>
  );
}
