/**
 * Typed client for the FiveUsers API (docs/03-architecture.md → API).
 * The id "fixture" is served from lib/fixtures/ so every screen works without a backend.
 */
import { API_URL, FIXTURE_ID, USE_FIXTURES } from "./constants";
import type { ApiError, Health, Report, RunEvent, RunState, SampleInfo } from "./types";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }

  /** Worth retrying quietly (cold start, network blip), as opposed to "not found". */
  get retryable(): boolean {
    return this.code === "network" || this.code === "timeout" || this.status >= 500;
  }
}

const NETWORK_MESSAGE =
  "We couldn't reach the test lab. It may still be waking up, try again in a few seconds.";

const STATUS_DEFAULTS: Record<number, { code: string; message: string }> = {
  400: { code: "bad_request", message: "The test lab couldn't use that request. Check the fields and try again." },
  402: {
    code: "budget_exhausted",
    message: "This demo has used its model credits. You can still explore the sample reports.",
  },
  404: { code: "not_found", message: "We couldn't find that. It may have expired." },
  422: { code: "bad_request", message: "Some of the fields look wrong. Check them and try again." },
  429: { code: "rate_limited", message: "Too many runs from here for now. Try again later, or open a sample report." },
  503: { code: "busy", message: "The test lab is busy. Try again in a minute." },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiError(value: unknown): value is ApiError {
  return isRecord(value) && typeof value.code === "string" && typeof value.message === "string";
}

async function toApiError(res: Response): Promise<ApiRequestError> {
  const fallback = STATUS_DEFAULTS[res.status] ?? {
    code: "server",
    message: `The test lab answered with an error (${res.status}). Try again in a moment.`,
  };
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // not JSON, keep the fallback
  }
  const detail = isRecord(body) ? body.detail : undefined;
  if (isApiError(detail)) return new ApiRequestError(detail.code, detail.message, res.status);
  if (typeof detail === "string" && detail.trim()) {
    return new ApiRequestError(fallback.code, detail, res.status);
  }
  return new ApiRequestError(fallback.code, fallback.message, res.status);
}

async function request<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 20_000, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: { Accept: "application/json", ...headers },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    throw new ApiRequestError(aborted ? "timeout" : "network", NETWORK_MESSAGE, 0);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

// ---------- endpoints ----------

export async function getHealth(): Promise<Health> {
  if (USE_FIXTURES) return (await import("./fixtures/health")).fixtureHealth;
  return request<Health>("/health", { timeoutMs: 8_000 });
}

export async function getSamples(): Promise<SampleInfo[]> {
  if (USE_FIXTURES) return (await import("./fixtures/health")).fixtureHealth.samples;
  return request<SampleInfo[]>("/samples", { timeoutMs: 10_000 });
}

export interface RunInput {
  url: string;
  task: string;
  audience?: string;
}

export async function createRun(input: RunInput): Promise<{ run_id: string }> {
  if (USE_FIXTURES) return { run_id: FIXTURE_ID };
  return request<{ run_id: string }>("/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: 30_000,
  });
}

export async function getRun(id: string): Promise<RunState> {
  if (id === FIXTURE_ID) return (await import("./fixtures/run")).fixtureRunState();
  return request<RunState>(`/runs/${enc(id)}`);
}

export async function getReport(id: string): Promise<Report> {
  if (id === FIXTURE_ID) return (await import("./fixtures/report")).fixtureReport;
  return request<Report>(`/reports/${enc(id)}`);
}

/** The API's Markdown export; null for the fixture, which is exported client-side. */
export function reportMarkdownUrl(id: string): string | null {
  if (id === FIXTURE_ID) return null;
  return `${API_URL}/reports/${enc(id)}.md`;
}

/** Every screenshot path in the API is relative to its run or report folder. */
export function fileUrl(ownerId: string, relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, "");
  if (ownerId === FIXTURE_ID) return `/fixtures/${clean}`;
  const encodedPath = clean.split("/").map(enc).join("/");
  return `${API_URL}/files/${enc(ownerId)}/${encodedPath}`;
}

// ---------- live events ----------

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

const EVENT_TYPES: RunEvent["type"][] = [
  "stage",
  "personas",
  "persona_step",
  "persona_done",
  "report_ready",
  "error",
];

/**
 * Subscribe to a run's events. The server replays every past event on connect, so
 * events are de-duplicated by their `id:` sequence number. Closes on report_ready / error.
 */
export function subscribeRun(
  id: string,
  onEvent: (event: RunEvent) => void,
  onConnection?: (state: ConnectionState) => void,
): () => void {
  if (id === FIXTURE_ID) {
    let cancelled = false;
    let stop = () => {};
    onConnection?.("open");
    void import("./fixtures/run").then((m) => {
      if (!cancelled) stop = m.playFixtureRun(onEvent);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }

  const url = `${API_URL}/runs/${enc(id)}/events`;
  let source: EventSource | null = null;
  let lastSeq = -1;
  let finished = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const detach = (es: EventSource) => {
    for (const type of EVENT_TYPES) es.removeEventListener(type, handle);
    es.close();
  };

  const handle = (raw: Event) => {
    // The native connection "error" event shares the name with our `event: error`; only ours has data.
    if (!(raw instanceof MessageEvent) || typeof raw.data !== "string") return;
    if (raw.lastEventId !== "") {
      const seq = Number(raw.lastEventId);
      if (Number.isFinite(seq)) {
        if (seq <= lastSeq) return;
        lastSeq = seq;
      }
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.data);
    } catch {
      return;
    }
    if (!isRecord(parsed)) return;
    const event = { ...parsed, type: parsed.type ?? raw.type } as RunEvent;
    onEvent(event);
    if (event.type === "report_ready" || event.type === "error") {
      finished = true;
      if (source) detach(source);
      onConnection?.("closed");
    }
  };

  const connect = () => {
    if (finished) return;
    const es = new EventSource(url);
    source = es;
    for (const type of EVENT_TYPES) es.addEventListener(type, handle);
    es.onopen = () => {
      attempt = 0;
      onConnection?.("open");
    };
    es.onerror = () => {
      if (finished) return;
      onConnection?.("reconnecting");
      if (es.readyState === EventSource.CLOSED) {
        // The browser gives up for good after a non-200 answer (e.g. a 502 while the API restarts).
        // Retry ourselves with backoff; the server replays every event and duplicates are dropped by seq.
        detach(es);
        attempt += 1;
        retryTimer = setTimeout(connect, Math.min(30_000, 2_000 * 2 ** Math.min(attempt - 1, 4)));
      }
    };
  };

  onConnection?.("connecting");
  connect();

  return () => {
    finished = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (source) detach(source);
  };
}
