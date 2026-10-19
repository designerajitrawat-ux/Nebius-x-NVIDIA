// Mirrors api/app/models.py, change both together.

export type Viewport = "desktop" | "mobile";
export type Stage =
  | "queued"
  | "preparing"
  | "recruiting"
  | "testing"
  | "reviewing"
  | "writing"
  | "done"
  | "failed";
export type Outcome = "completed" | "gave_up" | "stuck" | "out_of_steps" | "wrong_path" | "error";
export type Severity = "critical" | "major" | "minor";
export type FixType = "copy" | "css" | "flow";
export type RunMode = "live" | "dry_run";
export type BBox = [number, number, number, number];

export interface Persona {
  id: string;
  name: string;
  age: number;
  initial: string;
  archetype: string;
  bio: string;
  goal: string;
  tech_confidence: "low" | "medium" | "high";
  patience: number;
  reading_style: string;
  frustrations: string[];
  voice: string;
  viewport: Viewport;
}

export interface PersonaResult {
  persona_id: string;
  outcome: Outcome;
  reason: string;
  steps: number;
  seconds: number;
}

/** One step as shown in a live lane. `screenshot` is relative to the run folder. */
export interface LaneStep {
  index: number;
  path: string;
  screenshot: string;
  see: string | null;
  inner_voice: string;
  confusion: number; // 0..3
  action: string; // 'Clicked "Get started"'
  model: string; // badge of the deciding model, e.g. "Nemotron 3 Super"
}

export interface Lane {
  persona: Persona;
  latest: LaneStep | null;
  result: PersonaResult | null;
}

export interface RunState {
  id: string;
  mode: RunMode;
  url: string;
  task: string;
  audience: string | null;
  stage: Stage;
  status: "running" | "done" | "failed";
  error: string | null;
  created_at: number;
  lanes: Lane[];
  report_ready: boolean;
  cost_usd: number;
}

// ---------- report ----------

export interface Pin {
  x: number; // 0..1 of screenshot width
  y: number; // 0..1 of screenshot height
}

export interface Quote {
  persona_id: string;
  text: string;
}

export interface Fix {
  type: FixType;
  summary: string;
  before: string;
  after: string;
}

export interface Reference {
  title: string;
  url: string;
  note: string;
}

export interface Issue {
  id: number; // also the pin number
  severity: Severity;
  title: string;
  screen: string;
  screen_label: string;
  screenshot: string;
  viewport: [number, number];
  pin: Pin;
  personas_hit: string[];
  quote: Quote | null;
  why: string;
  fix: Fix;
  refs: Reference[];
  alt: string;
}

export interface FrictionRow {
  screen: string;
  label: string;
  path: string;
  hits: number;
  visits: number;
  worst_issue_id: number | null;
}

export interface ReportPersona {
  id: string;
  name: string;
  age: number;
  initial: string;
  archetype: string;
  bio: string;
  viewport: Viewport;
  outcome: Outcome;
  reason: string;
  steps: number;
  seconds: number;
}

export interface TranscriptStep {
  index: number;
  path: string;
  screenshot: string;
  see: string | null;
  inner_voice: string;
  confusion: number;
  action: string;
}

export interface ExpertFinding {
  screen: string;
  screen_label: string;
  source: "vision" | "a11y";
  heuristic: string;
  severity: Severity;
  finding: string;
  suggestion: string;
  element_id: number | null;
  screenshot: string | null;
}

export interface UsageRow {
  tier: string; // fast | vision | agent | reason | tavily | dry
  model: string;
  label: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

export interface Usage {
  rows: UsageRow[];
  total_cost_usd: number;
  tavily_calls: number;
}

export interface Report {
  id: string;
  mode: RunMode;
  degraded: boolean;
  created_at: number; // unix seconds
  url: string;
  site: string;
  task: string;
  audience: string | null;
  category: string;
  headline: string;
  subline: string;
  completed: number;
  total: number;
  personas: ReportPersona[];
  issues: Issue[];
  friction_map: FrictionRow[];
  expert: ExpertFinding[];
  transcripts: Record<string, TranscriptStep[]>;
  usage: Usage;
  refs_status: "ok" | "unavailable" | "skipped";
  research: Reference[];
}

// ---------- misc endpoints ----------

export interface SampleInfo {
  id: string; // report id
  title: string;
  url: string;
  task: string;
  headline: string;
  completed: number;
  total: number;
}

export interface Health {
  ok: boolean;
  mode: "live" | "dry_run" | "unconfigured";
  models: Record<"fast" | "vision" | "agent" | "reason", { id: string; label: string }>;
  budget: {
    spent_usd: number;
    soft_usd: number;
    hard_usd: number;
    remaining_usd: number;
    state: "ok" | "soft" | "hard";
  };
  limits: { per_hour: number; per_day: number; max_personas: number; max_steps: number };
  active_runs: number;
  samples: SampleInfo[];
}

/** Error body returned by the API for 4xx/5xx: { detail: { code, message } } */
export interface ApiError {
  code: string; // e.g. "budget_exhausted" | "rate_limited" | "busy" | "bad_url" | "unconfigured"
  message: string;
}

// ---------- SSE (GET /runs/{id}/events) ----------
// Each message carries `id: <seq>`. On connect the server replays every event so far,
// then streams live. The server closes the stream after `report_ready` or `error`;
// the client must call EventSource.close() on those, or it will auto-reconnect.

export type RunEvent =
  | { type: "stage"; stage: Stage; at: number; cost_usd: number }
  | { type: "personas"; lanes: Lane[] }
  | { type: "persona_step"; persona_id: string; step: LaneStep; cost_usd?: number }
  | { type: "persona_done"; persona_id: string; result: PersonaResult }
  | { type: "report_ready"; report_id: string }
  | { type: "error"; stage: Stage; message: string };
