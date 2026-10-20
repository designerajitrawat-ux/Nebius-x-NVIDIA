"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { SAMPLE_CARDS } from "@/lib/landing";
import { Reveal, SectionIntro } from "./Reveal";

export function Samples() {
  return (
    <section aria-labelledby="samples-title" className="page py-16 sm:py-24">
      <SectionIntro
        id="samples-title"
        eyebrow="Real runs"
        title={
          <>
            Three flawed sites. <span className="marker">Three real reports.</span>
          </>
        }
        lede="We built three websites with known usability flaws and let FiveUsers loose on them. Open any report: every step, every quote and every fix is from the actual run."
      />
      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {SAMPLE_CARDS.map((s, i) => (
          <Reveal as="li" key={s.id} delay={i * 0.1}>
            <SampleCard {...s} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function SampleCard({ id, title, site, task, completed, total, image, tint }: (typeof SAMPLE_CARDS)[number]) {
  const reduce = useReducedMotion();
  return (
    <motion.div whileHover={reduce ? undefined : "hover"} initial="rest" animate="rest" className="h-full">
      <Link
        href={`/r/${id}`}
        className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-soft transition-shadow duration-300 hover:shadow-float"
      >
        <div className="relative h-[200px] overflow-hidden" style={{ background: tint }}>
          <motion.div
            className="absolute inset-x-6 top-6 overflow-hidden rounded-[12px] bg-white shadow-float"
            variants={{ rest: { y: 0, rotate: -2 }, hover: { y: -8, rotate: 0 } }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="block aspect-[1.6] w-full object-cover object-top" />
          </motion.div>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="display text-22 font-semibold tracking-[-0.01em] text-ink">{title}</h3>
            <Ring completed={completed} total={total} />
          </div>
          <p className="mt-1 text-13 text-ink-2">{site}</p>
          <p className="mt-4 text-15 text-ink">
            <span className="text-ink-2">Task: </span>
            {task}
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-15 font-semibold text-violet">
            Open report
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function Ring({ completed, total }: { completed: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = completed / total;
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center" title={`${completed} of ${total} finished the task`}>
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-lilac-2)" strokeWidth="5" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={frac >= 0.6 ? "#22c997" : frac > 0 ? "#ffb627" : "#ff4d4d"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - Math.max(frac, 0.02)) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <span className="absolute text-[12px] font-semibold text-ink tabular-nums">
        {completed}/{total}
      </span>
      <span className="sr-only">
        {completed} of {total} users finished the task
      </span>
    </span>
  );
}
