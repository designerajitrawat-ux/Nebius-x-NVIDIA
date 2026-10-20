"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { ReactNode } from "react";
import { GlassIcon } from "./GlassIcon";
import { Reveal, SectionIntro } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Five people are recruited",
    body: "Tavily researches your product's category and what its users complain about. Nemotron 3 Super turns that into five personas, each with a device, a reading style and a breaking point.",
    tags: ["Tavily research", "Nemotron 3 Super"],
    from: "#d4ff3f",
    to: "#3fb950",
    back: "circle" as const,
    glyph: (
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="17" r="6" />
        <path d="M7 38c0-6.6 4.9-11 11-11s11 4.4 11 11" />
        <circle cx="33" cy="15" r="4.6" />
        <path d="M31 25.5c5.4.6 9.5 4.6 9.5 10.5" />
      </g>
    ),
  },
  {
    n: "02",
    title: "They use your site, live",
    body: "Five real browsers open at once. On every screen Nemotron 3.5 Super VL looks at what's there and Nemotron 3 Super decides what this person would click, type, or give up on. You watch them think.",
    tags: ["Real Chromium", "Nemotron 3.5 Super VL"],
    from: "#a99cff",
    to: "#5b47ff",
    back: "square" as const,
    glyph: (
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="9" width="36" height="28" rx="5" />
        <path d="M6 17h36" />
        <path d="M24 24l11 4.5-4.6 1.6-1.6 4.6z" fill="currentColor" />
      </g>
    ),
  },
  {
    n: "03",
    title: "You get the fixes",
    body: "Nemotron 3 Ultra reads every step and writes the report: who got stuck, where, in their own words, and the exact change to ship. Copy, CSS or flow.",
    tags: ["Nemotron 3 Ultra", "Pins on screenshots"],
    from: "#ffc29e",
    to: "#ff5a2c",
    back: "tilted" as const,
    glyph: (
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6h17l9 9v27H12z" />
        <path d="M29 6v9h9" />
        <path d="M18 24h12M18 31h8" />
        <circle cx="35" cy="36" r="6" fill="currentColor" stroke="none" />
      </g>
    ),
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" id="how" className="page py-16 sm:py-24">
      <SectionIntro
        id="how-title"
        eyebrow="How it works"
        title={
          <>
            From a link to a fix list in <span className="marker">three steps</span>
          </>
        }
        lede="No recruiting, no scheduling, no screen-share. Every step below runs on its own when you press Run."
      />
      <ol className="mt-14 grid gap-5 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 0.1}>
            <StepCard {...s} icon={<GlassIcon from={s.from} to={s.to} glyph={s.glyph} back={s.back} />} />
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function StepCard({
  n,
  title,
  body,
  tags,
  to,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  tags: string[];
  to: string;
  icon: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-white bg-white/65 p-7 shadow-soft backdrop-blur"
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-35 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: to }}
      />
      <div className="relative flex items-start justify-between">
        <motion.div whileHover={reduce ? undefined : { rotate: -6, scale: 1.05 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
          {icon}
        </motion.div>
        <span className="display text-56 leading-none font-semibold tracking-[-0.04em] text-ink/10">{n}</span>
      </div>
      <h3 className="display relative mt-6 text-28 font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="relative mt-2 text-15 leading-relaxed text-ink-2">{body}</p>
      <div className="relative mt-auto flex flex-wrap gap-1.5 pt-6">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-ink shadow-[0_0_0_1px_var(--color-lilac-2)]">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
