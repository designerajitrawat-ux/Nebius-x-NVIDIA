/**
 * DEV / DEMO ONLY. Replays a scripted ~25 s run on timers so /run/fixture shows the full
 * live experience without a backend. Built from the fixture report's personas and transcripts.
 */
import type { Lane, PersonaResult, RunEvent, RunState, Stage } from "../types";
import { fixturePersonas, fixtureReport, fixtureTranscripts } from "./report";

const DECIDER = "Nemotron 3 Super";

/** Per persona: first step time and spacing (seconds). Priya gives up first. */
const CADENCE: Record<string, { start: number; every: number }> = {
  priya: { start: 5.2, every: 1.3 },
  rohan: { start: 5.5, every: 1.55 },
  maya: { start: 5.9, every: 1.95 },
  dev: { start: 6.3, every: 1.8 },
  asha: { start: 6.6, every: 1.6 },
};

const STAGES: [at: number, stage: Stage, cost: number][] = [
  [0.3, "preparing", 0],
  [2.0, "recruiting", 0.002],
  [4.6, "testing", 0.006],
  [19.8, "reviewing", 0.112],
  [22.2, "writing", 0.121],
  [24.9, "done", 0.176],
];

export function fixtureRunState(): RunState {
  return {
    id: "fixture",
    mode: fixtureReport.mode,
    url: fixtureReport.url,
    task: fixtureReport.task,
    audience: fixtureReport.audience,
    stage: "queued",
    status: "running",
    error: null,
    created_at: Date.now() / 1000,
    lanes: [],
    report_ready: false,
    cost_usd: 0,
  };
}

function schedule(): [at: number, make: () => RunEvent][] {
  const now = () => Date.now() / 1000;
  const timeline: [number, () => RunEvent][] = STAGES.map(([at, stage, cost]) => [
    at,
    () => ({ type: "stage", stage, at: now(), cost_usd: cost }),
  ]);

  const lanes: Lane[] = fixturePersonas.map((persona) => ({ persona, latest: null, result: null }));
  timeline.push([4.2, () => ({ type: "personas", lanes })]);

  for (const persona of fixturePersonas) {
    const cadence = CADENCE[persona.id];
    const transcript = fixtureTranscripts[persona.id] ?? [];
    transcript.forEach((step, i) => {
      timeline.push([
        cadence.start + i * cadence.every,
        () => ({
          type: "persona_step",
          persona_id: persona.id,
          step: { ...step, model: DECIDER },
        }),
      ]);
    });
    const summary = fixtureReport.personas.find((p) => p.id === persona.id);
    if (summary) {
      const result: PersonaResult = {
        persona_id: persona.id,
        outcome: summary.outcome,
        reason: summary.reason,
        steps: summary.steps,
        seconds: summary.seconds,
      };
      const doneAt = cadence.start + (transcript.length - 1) * cadence.every + 0.5;
      timeline.push([doneAt, () => ({ type: "persona_done", persona_id: persona.id, result })]);
    }
  }

  timeline.push([25.1, () => ({ type: "report_ready", report_id: "fixture" })]);
  return timeline.sort((a, b) => a[0] - b[0]);
}

/** Starts the scripted run; returns a function that cancels it. */
export function playFixtureRun(onEvent: (event: RunEvent) => void): () => void {
  const timers = schedule().map(([at, make]) => setTimeout(() => onEvent(make()), at * 1000));
  return () => timers.forEach(clearTimeout);
}
