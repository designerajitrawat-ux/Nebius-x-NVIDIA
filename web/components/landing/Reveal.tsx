"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { ReactNode } from "react";

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** Render as a list item when it sits directly inside a <ul> or <ol>. */
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Section eyebrow + title + optional lede, shared by every landing section. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  lede,
  dark = false,
  center = false,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-[760px] text-center" : "max-w-[760px]"}>
      <p
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.1em] uppercase ${
          dark ? "bg-white/10 text-lime" : "bg-white text-violet shadow-soft"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-lime" : "bg-violet"}`} />
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`display mt-5 text-40 font-semibold tracking-[-0.03em] text-balance sm:text-56 ${dark ? "text-white" : "text-ink"}`}
      >
        {title}
      </h2>
      {lede ? <p className={`mt-5 text-17 leading-relaxed ${dark ? "text-white/70" : "text-ink-2"}`}>{lede}</p> : null}
    </Reveal>
  );
}
