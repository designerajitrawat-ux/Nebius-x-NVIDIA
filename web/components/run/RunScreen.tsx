"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { ApiRequestError, getRun, subscribeRun, type ConnectionState } from "@/lib/api";
import { formatClock, formatUsd, hostOf } from "@/lib/format";
import { STAGE_WAITING_LINE } from "@/lib/labels";
import { initialRun, runReducer, type LiveRun } from "@/lib/runState";
import { PersonaLane } from "./PersonaLane";
import { StageRail } from "./StageRail";

export function RunScreen({ id }: { id: string }) {
  const [run, dispatch] = useReducer(runReducer, id, initialRun);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [notFound, setNotFound] = useState(false);

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

  const completed = run.lanes.filter((l) => l.result?.outcome === "completed").length;
  const waitingLine = STAGE_WAITING_LINE[run.stage] ?? "Waiting for the personas.";

  return (
    <>
      <div className="page pt-6 sm:pt-10">
        <RunHeader run={run} connection={connection} />

        <div className="mt-8">
          <StageRail stage={run.stage} failedAt={run.failedAt} />
        </div>

        {run.status === "done" && run.reportId ? (
          <div
            role="status"
            className="mt-8 flex flex-col gap-4 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-17 text-ink">
              The report is ready.{" "}
              {run.lanes.length > 0 ? (
                <span className="text-ink-2">
                  {completed} of {run.lanes.length} completed the task.
                </span>
              ) : null}
            </p>
            <Link
              href={`/r/${encodeURIComponent(run.reportId)}`}
              className="btn-primary self-start sm:self-auto"
            >
              Read the report
            </Link>
          </div>
        ) : null}

        {run.status === "failed" ? (
          <div role="alert" className="mt-8 rounded-control bg-signal-soft px-4 py-4">
            <p className="text-15 text-ink">{run.error ?? "The test stopped before it could finish."}</p>
            <p className="mt-2 text-15">
              <Link href="/samples" className="link font-medium">
                Try a sample
              </Link>
              <span className="text-ink-2"> or </span>
              <Link href="/" className="link">
                start a new test
              </Link>
              <span className="text-ink-2">.</span>
            </p>
          </div>
        ) : null}

        <section aria-label="Personas" className="mt-8 sm:mt-10">
          {run.lanes.length > 0 ? (
            <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
              {run.lanes.map((lane, i) => (
                <PersonaLane key={lane.persona.id} lane={lane} runId={id} order={i} reveal={run.revealLanes} />
              ))}
            </ol>
          ) : run.status === "running" ? (
            <p role="status" className="max-w-[60ch] text-15 text-ink-2">
              {waitingLine}
            </p>
          ) : null}
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function RunHeader({ run, connection }: { run: LiveRun; connection: ConnectionState }) {
  const elapsed = useElapsed(run.startedAt, run.endedAt);
  const site = run.url ? hostOf(run.url) : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-13 text-ink-2">
          {run.status === "running" ? "Live test" : run.status === "done" ? "Finished test" : "Stopped test"}
          {site ? (
            <>
              {" · "}
              <a href={run.url} target="_blank" rel="noreferrer" className="link text-ink-2">
                {site}
              </a>
            </>
          ) : null}
        </p>
        <h1 className="display mt-1 text-22 font-medium tracking-[-0.015em] text-ink sm:text-28">
          {run.task || "Starting the test"}
        </h1>
        {run.audience ? <p className="mt-1 text-13 text-ink-2">Audience: {run.audience}</p> : null}
        {run.mode === "dry_run" ? (
          <p className="mt-2 text-13 text-ink-2">Dry run, persona decisions are scripted, no models are called.</p>
        ) : null}
      </div>
      <dl className="flex shrink-0 gap-6 text-13 tabular-nums">
        <div>
          <dt className="text-ink-2">Elapsed</dt>
          <dd className="text-15 text-ink">{elapsed === null ? "-" : formatClock(elapsed)}</dd>
        </div>
        <div>
          <dt className="text-ink-2">{run.status === "running" ? "Cost so far" : "Total cost"}</dt>
          <dd className="text-15 text-ink">{formatUsd(run.costUsd)}</dd>
        </div>
        {connection === "reconnecting" && run.status === "running" ? (
          <div role="status">
            <dt className="text-ink-2">Connection</dt>
            <dd className="text-15 text-ink">Reconnecting…</dd>
          </div>
        ) : null}
      </dl>
    </div>
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

function RunNotFound() {
  return (
    <>
      <div className="page pt-10 sm:pt-20">
        <h1 className="display text-28 font-medium tracking-[-0.015em]">We couldn&rsquo;t find that run.</h1>
        <p className="mt-3 max-w-[60ch] text-17 text-ink-2">
          It may have expired, or the link is incomplete. Runs are kept for a limited time; sample reports are
          always available.
        </p>
        <p className="mt-6 text-15">
          <Link href="/samples" className="link font-medium">
            Open the sample reports
          </Link>
          <span className="text-ink-2"> or </span>
          <Link href="/" className="link">
            start a new test
          </Link>
          <span className="text-ink-2">.</span>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
