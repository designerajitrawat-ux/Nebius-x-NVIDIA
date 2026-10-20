import { RAIL_STAGES, stageIndex } from "@/lib/labels";
import type { Stage } from "@/lib/types";

type StepState = "done" | "current" | "failed" | "todo";

/** Preparing ── Recruiting ── Testing ── Reviewing ── Writing, on a hairline. */
export function StageRail({ stage, failedAt }: { stage: Stage; failedAt: Stage | null }) {
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
    <div>
      <ol aria-label="Run stages" className="grid grid-cols-5">
        {RAIL_STAGES.map((s, i) => {
          const state = states[i];
          return (
            <li key={s.id} aria-current={state === "current" ? "step" : undefined} className="relative pt-5">
              <span aria-hidden="true" className="absolute inset-x-0 top-[5px] h-px bg-line" />
              <span
                aria-hidden="true"
                className={`absolute top-[4.5px] left-0 h-[2px] bg-ink transition-[width] duration-500 ease-out ${
                  state === "done" ? "w-full" : "w-0"
                }`}
              />
              <span aria-hidden="true" className="absolute top-0 left-0">
                <Dot state={state} />
              </span>
              <span
                className={`hidden pr-2 text-13 sm:block ${
                  state === "current"
                    ? "font-medium text-ink"
                    : state === "failed"
                      ? "font-medium text-signal-ink"
                      : "text-ink-2"
                }`}
              >
                {s.label}
              </span>
              <span className="sr-only sm:hidden">{s.label}</span>
              <span className="sr-only">
                {state === "done" ? ", done" : state === "current" ? ", in progress" : state === "failed" ? ", stopped" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="mt-1 text-13 text-ink sm:hidden">
        {summary}
      </p>
    </div>
  );
}

function Dot({ state }: { state: StepState }) {
  if (state === "current") {
    return <span className="block size-[11px] rounded-full border-2 border-ink bg-paper" />;
  }
  if (state === "failed") {
    return <span className="block size-[11px] rounded-full bg-signal" />;
  }
  return (
    <span className="flex size-[11px] items-center justify-center">
      <span className={`block size-[7px] rounded-full ${state === "done" ? "bg-ink" : "bg-line"}`} />
    </span>
  );
}
