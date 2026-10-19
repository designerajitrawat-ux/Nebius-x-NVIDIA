/**
 * Pure state for the live run page. Safe under replay: the server re-sends every
 * event on (re)connect, and a snapshot from GET /runs/{id} may arrive first, so every
 * update is monotonic (stages only advance, lane steps only move forward).
 */
import { stageIndex } from "./labels";
import type { Lane, LaneStep, RunEvent, RunMode, RunState, Stage } from "./types";

export interface LiveRun {
  id: string;
  mode: RunMode;
  url: string;
  task: string;
  audience: string | null;
  stage: Stage;
  /** Last stage reached before a failure, so the rail can show where it stopped. */
  failedAt: Stage | null;
  status: "running" | "done" | "failed";
  error: string | null;
  lanes: Lane[];
  /** True when lanes arrived live (play the reveal), false when hydrated from a snapshot. */
  revealLanes: boolean;
  reportId: string | null;
  costUsd: number;
  startedAt: number | null; // unix seconds
  endedAt: number | null; // unix seconds
}

export type RunAction =
  | { kind: "snapshot"; state: RunState }
  | { kind: "event"; event: RunEvent; receivedAt: number };

export function initialRun(id: string): LiveRun {
  return {
    id,
    mode: "live",
    url: "",
    task: "",
    audience: null,
    stage: "queued",
    failedAt: null,
    status: "running",
    error: null,
    lanes: [],
    revealLanes: false,
    reportId: null,
    costUsd: 0,
    startedAt: null,
    endedAt: null,
  };
}

function laterStage(current: Stage, next: Stage): Stage {
  if (current === "failed") return current;
  if (next === "failed") return next;
  return stageIndex(next) >= stageIndex(current) ? next : current;
}

function newerStep(a: LaneStep | null, b: LaneStep | null): LaneStep | null {
  if (!a) return b;
  if (!b) return a;
  return b.index >= a.index ? b : a;
}

function mergeLanes(existing: Lane[], incoming: Lane[]): Lane[] {
  const byId = new Map(existing.map((lane) => [lane.persona.id, lane]));
  return incoming.map((lane) => {
    const prev = byId.get(lane.persona.id);
    if (!prev) return lane;
    return {
      persona: lane.persona,
      latest: newerStep(prev.latest, lane.latest),
      result: prev.result ?? lane.result,
    };
  });
}

function updateLane(lanes: Lane[], personaId: string, update: (lane: Lane) => Lane): Lane[] {
  let changed = false;
  const next = lanes.map((lane) => {
    if (lane.persona.id !== personaId) return lane;
    const updated = update(lane);
    if (updated !== lane) changed = true;
    return updated;
  });
  return changed ? next : lanes;
}

export function runReducer(state: LiveRun, action: RunAction): LiveRun {
  if (action.kind === "snapshot") {
    const s = action.state;
    const failed = s.status === "failed";
    return {
      ...state,
      mode: s.mode,
      url: s.url,
      task: s.task,
      audience: s.audience,
      stage: laterStage(state.stage, s.stage),
      failedAt: failed ? (state.failedAt ?? null) : state.failedAt,
      status: state.status === "running" ? s.status : state.status,
      error: state.error ?? s.error,
      lanes: mergeLanes(state.lanes, s.lanes),
      revealLanes: state.lanes.length > 0 ? state.revealLanes : false,
      // The snapshot has no report id; the report is stored under the run id.
      reportId: state.reportId ?? (s.report_ready ? s.id : null),
      costUsd: Math.max(state.costUsd, s.cost_usd),
      startedAt: s.created_at || state.startedAt,
    };
  }

  const { event, receivedAt } = action;
  switch (event.type) {
    case "stage": {
      const stage = laterStage(state.stage, event.stage);
      const ended = stage === "done" || stage === "failed";
      return {
        ...state,
        stage,
        costUsd: Math.max(state.costUsd, event.cost_usd),
        startedAt: state.startedAt ?? event.at,
        endedAt: ended ? (state.endedAt ?? event.at) : state.endedAt,
      };
    }
    case "personas": {
      const firstArrival = state.lanes.length === 0;
      return {
        ...state,
        lanes: mergeLanes(state.lanes, event.lanes),
        revealLanes: firstArrival ? true : state.revealLanes,
      };
    }
    case "persona_step":
      return {
        ...state,
        costUsd: Math.max(state.costUsd, event.cost_usd ?? 0),
        lanes: updateLane(state.lanes, event.persona_id, (lane) => {
          const latest = newerStep(lane.latest, event.step);
          return latest === lane.latest ? lane : { ...lane, latest };
        }),
      };
    case "persona_done":
      return {
        ...state,
        lanes: updateLane(state.lanes, event.persona_id, (lane) =>
          lane.result ? lane : { ...lane, result: event.result },
        ),
      };
    case "report_ready":
      return {
        ...state,
        stage: "done",
        status: "done",
        reportId: event.report_id,
        endedAt: state.endedAt ?? receivedAt,
      };
    case "error":
      return {
        ...state,
        status: "failed",
        failedAt: event.stage === "failed" ? state.stage : event.stage,
        stage: "failed",
        error: event.message,
        endedAt: state.endedAt ?? receivedAt,
      };
  }
}
