"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { useEffect, useReducer, useState, type ReactNode } from "react";
import { ApiRequestError, getRun, subscribeRun, type ConnectionState } from "@/lib/api";
import { formatClock, formatUsd, hostOf } from "@/lib/format";
import { STAGE_WAITING_LINE, TIER_FALLBACK_LABEL } from "@/lib/labels";
import { initialRun, runReducer, type LiveRun } from "@/lib/runState";
import { useHealth } from "@/lib/useResource";
import { ArrivingLanes } from "./ArrivingLanes";
import { PersonaLane } from "./PersonaLane";
import { ReportReady } from "./ReportReady";
import { StageRail } from "./StageRail";

export function RunScreen({ id }: { id: string }) {
  const [run, dispatch] = useReducer(runReducer, id, initialRun);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [notFound, setNotFound] = useState(false);
  const stageModels = useStageModels(run.mode);

  // Hydrate from the snapshot (page reload mid-run), then attach the event stream.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    void (async () => {
      try {
        const snapshot = await getRun(id);
        if (cancelled) return;
        dispatch({ kind: "snapshot", state: snapshot });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setNotFound(true);
          return;
        }
        // Network trouble: the event stream below retries on its own.
      }
      if (cancelled) return;
      unsubscribe = subscribeRun(
        id,
        (event) => dispatch({ kind: "event", event, receivedAt: Date.now() / 1000 }),
        setConnection,
      );
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id]);

  if (notFound) return <RunNotFound />;

  const waitingLine = STAGE_WAITING_LINE[run.stage] ?? "Waiting for the personas.";
  const finished = run.lanes.filter((l) => l.result).length;

  return (
    <Lab>
      <div className="page relative pt-[100px] sm:pt-[128px]">
        <RunHeader run={run} connection={connection} />

        <div className="mt-8 sm:mt-10">
          <StageRail stage={run.stage} failedAt={run.failedAt} models={stageModels} />
        </div>

        {run.status === "done" && run.reportId ? (
          <div className="mt-6">
            <ReportReady reportId={run.reportId} lanes={run.lanes} />
          </div>
        ) : null}

        {run.status === "failed" ? (
          <div
            role="alert"
            className="mt-6 flex gap-3.5 rounded-[22px] border border-p-coral/40 bg-p-coral/10 p-5 backdrop-blur sm:p-6"
          >
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-p-coral text-15 font-bold text-ink">
              !
            </span>
            <div className="min-w-0">
              <p className="text-15 text-white">{run.error ?? "The test stopped before it could finish."}</p>
              <p className="mt-2 text-15">
                <Link href="/samples" className={DARK_LINK + " font-semibold"}>
                  Try a sample
                </Link>
                <span className="text-white/70"> or </span>
                <Link href="/" className={DARK_LINK}>
                  start a new test
                </Link>
                <span className="text-white/70">.</span>
              </p>
            </div>
          </div>
        ) : null}

        <section aria-label="Personas" className="mt-10 sm:mt-12">
          {run.lanes.length > 0 ? (
            <>
              <div aria-hidden="true" className="mb-4 flex items-center justify-between gap-4 text-13">
                <p className="inline-flex items-center gap-2 font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-p-sky shadow-[0_0_10px_rgba(56,182,255,0.9)]" />
                  {run.lanes.length} testers, each in their own browser
                </p>
                <p className="shrink-0 text-white/65 tabular-nums">
                  {finished} of {run.lanes.length} done
                </p>
              </div>
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {run.lanes.map((lane, i) => (
                  <PersonaLane key={lane.persona.id} lane={lane} runId={id} order={i} reveal={run.revealLanes} />
                ))}
              </ol>
            </>
          ) : run.status === "running" ? (
            <>
              <p role="status" className="mb-4 flex max-w-[60ch] items-center gap-2.5 text-15 text-white/80">
                <Spinner />
                {waitingLine}
              </p>
              <ArrivingLanes recruiting={run.stage === "recruiting" || run.stage === "testing"} />
            </>
          ) : null}
        </section>
      </div>
      <RunFooter />
    </Lab>
  );
}

const DARK_LINK =
  "text-white underline decoration-white/40 decoration-1 underline-offset-[3px] transition-colors hover:decoration-white";

/** Which model each stage runs on, from /health when it answers. Dry runs call no models. */
function useStageModels(mode: LiveRun["mode"]) {
  const health = useHealth();
  if (mode === "dry_run") return undefined;
  const m = health.status === "ready" ? health.data.models : null;
  const label = (tier: keyof typeof TIER_FALLBACK_LABEL) => m?.[tier]?.label || TIER_FALLBACK_LABEL[tier];
  return {
    preparing: label("fast"),
    recruiting: `Tavily + ${label("agent")}`,
    testing: label("agent"),
    reviewing: label("vision"),
    writing: label("reason"),
  };
}

/** The night lab: full-bleed dark canvas behind the glass header, with glows, a grid and grain. */
function Lab({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate -mt-16 flex flex-1 flex-col overflow-x-clip bg-night text-white sm:-mt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-[6%] h-[560px] w-[560px] rounded-full bg-violet/30 blur-[140px]" />
        <div className="absolute top-[18%] -right-32 h-[460px] w-[460px] rounded-full bg-lime/[0.12] blur-[140px]" />
        <div className="absolute top-[55%] -left-40 h-[420px] w-[420px] rounded-full bg-p-sky/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent_80%)]" />
        <div className="grain absolute inset-0 opacity-[0.35] mix-blend-soft-light" />
      </div>
      {children}
    </div>
  );
}

function RunHeader({ run, connection }: { run: LiveRun; connection: ConnectionState }) {
  const reduce = useReducedMotion();
  const elapsed = useElapsed(run.startedAt, run.endedAt);
  const site = run.url ? hostOf(run.url) : null;
  const live = run.status === "running";

  return (
    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
      <motion.div
        className="min-w-0 lg:max-w-[760px]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <p
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold tracking-[0.1em] uppercase ${
            run.status === "failed" ? "text-p-coral" : "text-lime"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {live ? <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-70 motion-reduce:hidden" /> : null}
            <span className={`relative h-2 w-2 rounded-full ${run.status === "failed" ? "bg-p-coral" : "bg-lime"}`} />
          </span>
          {live ? "Live test" : run.status === "done" ? "Finished test" : "Stopped test"}
        </p>
        <h1 className="display mt-4 text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white sm:text-40 lg:text-[3.25rem] lg:leading-[1.04]">
          {run.task || "Starting the test"}
        </h1>
        {site || run.audience ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            {site ? (
              <a
                href={run.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1 pr-3 pl-1.5 text-13 font-medium text-white transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M1 6h10M6 1c1.6 1.4 2.4 3.1 2.4 5S7.6 9.6 6 11M6 1C4.4 2.4 3.6 4.1 3.6 6S4.4 9.6 6 11" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </span>
                <span className="truncate">{site}</span>
                <svg aria-hidden="true" width="9" height="9" viewBox="0 0 10 10" fill="none" className="shrink-0 text-white/60">
                  <path d="M3 1h6v6M9 1L1.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </a>
            ) : null}
            {run.audience ? (
              <p className="text-13 text-white/70">
                <span className="text-white/60">Audience:</span> {run.audience}
              </p>
            ) : null}
          </div>
        ) : null}
        {run.mode === "dry_run" ? (
          <p className="mt-3 text-13 text-white/65">Dry run: persona decisions are scripted, and no models are called.</p>
        ) : null}
      </motion.div>

      <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-night-line bg-night-line lg:w-[420px]">
        <Counter label="Elapsed" value={elapsed === null ? "-" : formatClock(elapsed)} />
        <Counter label={live ? "Cost so far" : "Total cost"} value={formatUsd(run.costUsd)} />
        {connection === "reconnecting" && live ? (
          <div role="status" className="col-span-2 flex items-center justify-between gap-3 bg-night-2 px-5 py-3">
            <dt className="text-[12px] font-semibold tracking-[0.08em] text-white/65 uppercase">Connection</dt>
            <dd className="inline-flex items-center gap-2 text-13 font-medium text-p-amber">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-p-amber opacity-70 motion-reduce:hidden" />
                <span className="relative h-2 w-2 rounded-full bg-p-amber" />
              </span>
              Reconnecting…
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-night-2/90 px-4 py-4 sm:px-5 sm:py-5">
      <dt className="text-[12px] font-semibold tracking-[0.08em] text-white/65 uppercase">{label}</dt>
      <dd className="mt-1 truncate font-sans text-[2.25rem] leading-none font-semibold tracking-[-0.03em] text-lime tabular-nums sm:text-[3rem]">
        {value}
      </dd>
    </div>
  );
}

function Spinner() {
  return (
    <span aria-hidden="true" className="relative inline-flex h-4 w-4 shrink-0">
      <span className="absolute inset-0 rounded-full border-2 border-white/15" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-lime" />
    </span>
  );
}

function useElapsed(startedAt: number | null, endedAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, endedAt]);
  if (startedAt === null) return null;
  return Math.max(0, (endedAt ?? now) - startedAt);
}

/** Dark twin of the site footer, so the lab runs edge to edge. */
function RunFooter() {
  return (
    <footer className="page relative mt-auto pt-20 pb-8">
      <div className="flex flex-col gap-1 border-t border-night-line pt-4 text-13 text-white/60 sm:flex-row sm:items-baseline sm:justify-between">
        <p>Runs on Nebius Token Factory · NVIDIA Nemotron · Tavily</p>
      </div>
    </footer>
  );
}

function RunNotFound() {
  return (
    <Lab>
      <div className="page relative pt-[110px] sm:pt-[160px]">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold tracking-[0.1em] text-p-coral uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-p-coral" />
          Run not found
        </p>
        <h1 className="display mt-5 text-28 font-semibold tracking-[-0.02em] text-white sm:text-40">
          We couldn&rsquo;t find that run.
        </h1>
        <p className="mt-3 max-w-[60ch] text-17 text-white/70">
          It may have expired, or the link is incomplete. Runs are kept for a limited time; sample reports are
          always available.
        </p>
        <p className="mt-6 text-15">
          <Link href="/samples" className={DARK_LINK + " font-semibold"}>
            Open the sample reports
          </Link>
          <span className="text-white/70"> or </span>
          <Link href="/" className={DARK_LINK}>
            start a new test
          </Link>
          <span className="text-white/70">.</span>
        </p>
      </div>
      <RunFooter />
    </Lab>
  );
}
