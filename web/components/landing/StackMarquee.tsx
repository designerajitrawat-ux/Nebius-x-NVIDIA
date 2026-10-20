"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

const ITEMS = [
  "NVIDIA Nemotron 3 Ultra",
  "Nebius Token Factory",
  "Nemotron 3 Super",
  "Tavily live research",
  "Nemotron 3.5 Super VL",
  "Real Chromium browsers",
  "Nemotron 3.5 Lightning",
  "Accessibility checks",
];

/** A slow ribbon naming the stack, so the hackathon's required tools are visible in the first scroll. */
export function StackMarquee() {
  const reduce = useReducedMotion();
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {ITEMS.map((t) => (
        <span key={t} className="flex items-center gap-8 text-17 font-medium whitespace-nowrap text-ink">
          {t}
          <Spark />
        </span>
      ))}
    </div>
  );
  return (
    <section aria-label="Built with" className="relative border-y border-white/70 bg-white/50 py-5 backdrop-blur">
      <p className="sr-only">Built with {ITEMS.join(", ")}.</p>
      <div aria-hidden="true" className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <motion.div
          className="flex"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        >
          {row}
          {row}
        </motion.div>
      </div>
    </section>
  );
}

function Spark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 0c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" fill="var(--color-violet)" />
    </svg>
  );
}
