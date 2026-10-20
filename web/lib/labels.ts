import type { FixType, Outcome, PersonaResult, Severity, Stage } from "./types";

// ---------- stages ----------

export const RAIL_STAGES = [
  { id: "preparing", label: "Preparing" },
  { id: "recruiting", label: "Recruiting" },
  { id: "testing", label: "Testing" },
  { id: "reviewing", label: "Reviewing" },
  { id: "writing", label: "Writing" },
] as const satisfies readonly { id: Stage; label: string }[];

/** Position on the rail: -1 before preparing, 5 when everything is done. */
export function stageIndex(stage: Stage): number {
  if (stage === "queued") return -1;
  if (stage === "done") return RAIL_STAGES.length;
  if (stage === "failed") return -1;
  return RAIL_STAGES.findIndex((s) => s.id === stage);
}

/** What the page says while there are no lanes yet. */
export const STAGE_WAITING_LINE: Partial<Record<Stage, string>> = {
  queued: "Waiting for a free slot in the test lab.",
  preparing: "Opening the site in a real browser and taking a first look.",
  recruiting: "Researching the product category and recruiting five personas.",
};

/** " · mobile" after an archetype, unless the archetype already says so. */
export function viewportSuffix(archetype: string, viewport: "desktop" | "mobile"): string {
  if (viewport !== "mobile") return "";
  return /mobile|phone/i.test(archetype) ? "" : " · mobile";
}

// ---------- outcomes ----------

export type Tone = "ok" | "signal";

export function outcomeTone(outcome: Outcome): Tone {
  return outcome === "completed" ? "ok" : "signal";
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  completed: "Completed",
  gave_up: "Gave up",
  stuck: "Got stuck",
  out_of_steps: "Ran out of steps",
  wrong_path: "Ended on the wrong page",
  error: "Stopped by an error",
};

/** "Completed in 6 steps", "Gave up at step 5" */
export function outcomeSentence(result: Pick<PersonaResult, "outcome" | "steps">): string {
  const { outcome, steps } = result;
  switch (outcome) {
    case "completed":
      return `Completed in ${steps} ${steps === 1 ? "step" : "steps"}`;
    case "gave_up":
      return `Gave up at step ${steps}`;
    case "stuck":
      return `Got stuck at step ${steps}`;
    case "out_of_steps":
      return `Ran out of steps after ${steps}`;
    case "wrong_path":
      return `Ended on the wrong page after ${steps} steps`;
    case "error":
      return `Stopped by an error at step ${steps}`;
  }
}

// ---------- severity ----------

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

/** Text colour per severity (AA-safe derivatives of signal / warn). */
export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "text-signal-ink",
  major: "text-warn-ink",
  minor: "text-ink-2",
};

/** Fill colour per severity, for small dots. */
export const SEVERITY_FILL: Record<Severity, string> = {
  critical: "bg-signal",
  major: "bg-warn",
  minor: "bg-ink-2",
};

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };

// ---------- fixes ----------

export const FIX_LABEL: Record<FixType, string> = {
  copy: "Copy fix",
  css: "CSS fix",
  flow: "Flow fix",
};

// ---------- model tiers ----------

export const TIER_ORDER = ["fast", "vision", "agent", "reason", "tavily", "dry"];

/** What each tier did in a run: the "which Nemotron did what" line. */
export const TIER_ROLE: Record<string, string> = {
  fast: "Labelled page elements and wrote short summaries",
  vision: "Read every screenshot in character, then reviewed each page",
  agent: "Recruited the five personas and decided every click and keystroke",
  reason: "Wrote this report: ranked the issues and drafted the fixes",
  tavily: "Researched the category and found how other products handle each issue",
  dry: "Scripted decisions for a dry run; no model was called",
};

/** Fallback badge names when /health hasn't answered yet. */
export const TIER_FALLBACK_LABEL: Record<"fast" | "vision" | "agent" | "reason", string> = {
  fast: "Nemotron Lightning",
  vision: "Nemotron Super VL",
  agent: "Nemotron Super",
  reason: "Nemotron Ultra",
};
