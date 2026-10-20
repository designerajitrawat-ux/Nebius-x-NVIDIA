"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import type { Lane } from "@/lib/types";

/** The finish line: a calm glass panel with the five testers cheering and one lime button. */
export function ReportReady({ reportId, lanes }: { reportId: string; lanes: Lane[] }) {
  const reduce = useReducedMotion();
  const completed = lanes.filter((l) => l.result?.outcome === "completed").length;

  return (
    <motion.div
      role="status"
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 20, mass: 0.9 }}
      className="relative overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.06] p-5 shadow-[0_30px_80px_-30px_rgba(150,190,0,0.45)] backdrop-blur-xl sm:p-7"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-10 h-[260px] w-[360px] rounded-full bg-lime/20 blur-[80px]" />
        <div className="absolute -bottom-24 left-10 h-[200px] w-[300px] rounded-full bg-violet/30 blur-[80px]" />
      </div>

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {lanes.length > 0 ? (
            <div aria-hidden="true" className="flex shrink-0 items-end -space-x-2.5">
              {lanes.map((lane, i) => (
                <motion.span
                  key={lane.persona.id}
                  className="relative"
                  style={{ zIndex: lanes.length - i }}
                  initial={reduce ? false : { y: 18, opacity: 0 }}
                  animate={reduce ? { y: 0, opacity: 1 } : { y: [18, -10, 0], opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.25 + i * 0.09, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <PersonaAvatar persona={lane.persona} index={i} size={46} mood="happy" />
                </motion.span>
              ))}
            </div>
          ) : null}
          <div className="min-w-0">
            <p aria-hidden="true" className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.1em] text-lime uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              Report ready
            </p>
            <p className="display mt-1.5 text-22 font-semibold tracking-[-0.02em] text-white sm:text-28">
              The report is ready.
            </p>
            {lanes.length > 0 ? (
              <p className="mt-1 text-15 text-white/70">
                <span className="font-semibold text-white tabular-nums">
                  {completed} of {lanes.length}
                </span>{" "}
                completed the task.
              </p>
            ) : null}
          </div>
        </div>
        <Link href={`/r/${encodeURIComponent(reportId)}`} className="btn-lime self-start md:self-auto">
          Read the report
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </motion.div>
  );
}
