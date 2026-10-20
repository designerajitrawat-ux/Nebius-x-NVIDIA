"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useState, type PointerEvent } from "react";
import { CAST, type CastMember } from "@/lib/landing";
import { Blob } from "./Blob";
import { Reveal, SectionIntro } from "./Reveal";

export function MeetTheFive() {
  return (
    <section aria-labelledby="cast-title" className="relative overflow-hidden py-16 sm:py-24">
      <div className="page">
        <SectionIntro
          id="cast-title"
          eyebrow="Meet the five"
          title={
            <>
              Not one tester. <span className="marker">Five reasons</span> to give up.
            </>
          }
          lede="Every run recruits a fresh cast for your product, but they always cover these five kinds of people. A site that works for all of them works for almost everyone."
        />
      </div>
      <ul className="page mt-14 grid snap-x snap-mandatory auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-6 sm:auto-cols-[44%] lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible">
        {CAST.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 0.07} className="snap-start">
            <PersonaCard p={p} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function PersonaCard({ p }: { p: CastMember }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 });
  const rotX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
    setLook({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 });
  }

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
        setHover(false);
        setLook({ x: 0, y: 0 });
      }}
      style={reduce ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
      className="group relative flex h-full min-h-[330px] flex-col overflow-hidden rounded-card bg-white p-5 shadow-soft"
    >
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: p.hue[0] }}
      />
      <div className="relative flex items-start justify-between">
        <motion.div whileHover={reduce ? undefined : { y: -6, rotate: -8 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
          <Blob hue={p.hue} size={76} mood={hover ? "happy" : p.mood} look={look} accessory={p.accessory} />
        </motion.div>
        <span className="flex items-center gap-1 rounded-full bg-lilac px-2 py-1 text-[11px] font-medium text-ink-2">
          {p.device === "phone" ? <PhoneIcon /> : <LaptopIcon />}
          {p.device}
        </span>
      </div>
      <h3 className="display relative mt-5 text-22 font-semibold tracking-[-0.01em] text-ink">
        {p.name}, {p.age}
      </h3>
      <p className="relative text-15 font-medium" style={{ color: p.hue[1] }}>
        {p.archetype}
      </p>
      <p className="relative mt-3 text-13 text-ink-2">
        <span className="font-semibold text-ink">Checks:</span> {p.tests}
      </p>
      <blockquote className="voice relative mt-auto border-t border-lilac-2 pt-4 text-17 leading-snug text-ink">
        &ldquo;{p.line}&rdquo;
      </blockquote>
    </motion.div>
  );
}

function PhoneIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
      <rect x="1" y="0.6" width="8" height="10.8" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 9.4h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
      <rect x="2" y="0.6" width="9" height="6.6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M0.6 9.2h11.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
