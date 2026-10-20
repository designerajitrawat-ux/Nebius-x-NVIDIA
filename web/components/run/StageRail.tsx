"use client";

import { motion } from "motion/react";
import { RAIL_STAGES, stageIndex } from "@/lib/labels";
import type { Stage } from "@/lib/types";

type StepState = "done" | "current" | "failed" | "todo";

/**
 * Preparing, Recruiting, Testing, Reviewing, Writing as a glowing pipeline: finished stages are
 * solid lime, the current one pulses, upcoming ones wait in the dark. `models` names the model
 * behind each stage when it is known.
 */
export function StageRail({
  stage,
  failedAt,
  models,
}: {
  stage: Stage;
  failedAt: Stage | null;
  models?: Partial<Record<(typeof RAIL_STAGES)[number]["id"], string>>;
}) {
  const failed = stage === "failed";
  const position = failed ? stageIndex(failedAt ?? "queued") : stageIndex(stage);
  const states: StepState[] = RAIL_STAGES.map((_, i) =>
    i < position ? "done" : i === position ? (failed ? "failed" : "current") : "todo",
  );
  const activeIndex = states.findIndex((s) => s === "current" || s === "failed");
  const allDone = position >= RAIL_STAGES.length;

  let summary: string;
  if (allDone) summary = "All stages done";
  else if (activeIndex >= 0)
    summary = `${RAIL_STAGES[activeIndex].label}${failed ? " (stopped)" : ""} · ${activeIndex + 1} of ${RAIL_STAGES.length}`;
  else summary = "Waiting to start";

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-night-line bg-night-2/70 px-3 pt-5 pb-4 backdrop-blur sm:px-6 sm:pt-6 sm:pb-5">
      <ol aria-label="Run stages" className="relative grid grid-cols-5">
        {RAIL_STAGES.map((s, i) => {
          const state = states[i];
          const nextState = states[i + 1];
          const model = models?.[s.id];
          return (
            <li
              key={s.id}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-col items-center text-center"
            >
              {/* the wire to the next stage */}
              {i < RAIL_STAGES.length - 1 ? (
                <span aria-hidden="true" className="absolute top-[15px] left-1/2 h-[2px] w-full overflow-hidden rounded-full bg-white/10 sm:top-[17px]">
                  <span
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r from-lime to-lime-deep shadow-[0_0_12px_rgba(212,255,63,0.7)] transition-[width] duration-700 ease-out ${
                      state === "done" ? "w-full" : "w-0"
                    }`}
                  />
                  {state === "current" && nextState === "todo" ? (
                    <motion.span
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-lime/80 to-transparent motion-reduce:hidden"
                      initial={{ left: "-35%" }}
                      animate={{ left: ["-35%", "100%"] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </span>
              ) : null}

              <span aria-hidden="true" className="relative z-10">
                <Node state={state} n={i + 1} />
              </span>

              <span
                className={`mt-2.5 block max-w-full truncate px-0.5 text-[11px] leading-tight sm:text-13 ${
                  state === "current"
                    ? "font-semibold text-lime"
                    : state === "failed"
                      ? "font-semibold text-p-coral"
                      : state === "done"
                        ? "font-medium text-white"
                        : "text-white/60"
                }`}
              >
                {s.label}
              </span>
              <span className="sr-only">
                {state === "done" ? ", done" : state === "current" ? ", in progress" : state === "failed" ? ", stopped" : ""}
              </span>
              {model ? (
                <span
                  className={`mt-0.5 hidden max-w-full truncate px-1 font-mono text-[10.5px] leading-tight sm:block ${
                    state === "todo" ? "text-white/45" : "text-white/65"
                  }`}
                >
                  <span className="sr-only">, model: </span>
                  {model}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="mt-3 text-center text-[12px] text-white/70 sm:hidden">
        {summary}
      </p>
    </div>
  );
}

function Node({ state, n }: { state: StepState; n: number }) {
  const base = "grid size-8 place-items-center rounded-full sm:size-9";
  if (state === "done") {
    return (
      <span className={`${base} bg-lime text-ink shadow-[0_0_18px_-2px_rgba(212,255,63,0.65)]`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.4l2.6 2.6L11 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative block">
        <motion.span
          className="absolute inset-0 rounded-full bg-lime motion-reduce:hidden"
          animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          className="absolute inset-0 rounded-full bg-lime motion-reduce:hidden"
          animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
        />
        <span className={`${base} relative border-2 border-lime bg-night shadow-[0_0_22px_-2px_rgba(212,255,63,0.8)]`}>
          <span className="h-2.5 w-2.5 rounded-full bg-lime" />
        </span>
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className={`${base} bg-p-coral text-[13px] font-bold text-ink shadow-[0_0_18px_-2px_rgba(255,122,89,0.7)]`}>!</span>
    );
  }
  return (
    <span className={`${base} border border-white/15 bg-night text-[12px] font-medium text-white/50 tabular-nums`}>{n}</span>
  );
}
