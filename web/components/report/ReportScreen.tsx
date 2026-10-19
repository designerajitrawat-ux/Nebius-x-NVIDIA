"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PersonaMark } from "@/components/PersonaMark";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter } from "@/components/SiteFooter";
import { getReport } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { OUTCOME_LABEL, outcomeTone, SEVERITY_LABEL, TIER_FALLBACK_LABEL } from "@/lib/labels";
import type { Report, Severity } from "@/lib/types";
import { useResource } from "@/lib/useResource";
import type { ShotPin } from "./AnnotatedShot";
import { ExpertTable } from "./ExpertTable";
import { FrictionMap } from "./FrictionMap";
import { IssueBlock } from "./IssueBlock";
import { ModelUsage } from "./ModelUsage";
import { PersonaRows } from "./PersonaRows";
import { ReportActions } from "./ReportActions";

export function ReportScreen({ id }: { id: string }) {
  const load = useCallback(() => getReport(id), [id]);
  const report = useResource(`report:${id}`, load);

  if (report.status === "ready") return <ReportView report={report.data} />;

  return (
    <>
      <div className="page pt-10 sm:pt-20">
        {report.status === "loading" ? (
          <p role="status" className="sr-only">
            Loading the report…
          </p>
        ) : null}
        {report.status === "waking" ? (
          <p role="status" className="max-w-[60ch] text-15 text-ink-2">
            Waking up the test lab… free hosting sleeps when it&rsquo;s quiet, so the report can take up to a
            minute to open.
          </p>
        ) : null}
        {report.status === "error" ? (
          <div>
            <h1 className="display text-28 font-medium tracking-[-0.015em]">
              {report.error.status === 404 ? "We couldn’t find that report." : "We couldn’t open that report."}
            </h1>
            <p className="mt-3 max-w-[60ch] text-17 text-ink-2">
              {report.error.status === 404
                ? "It may have expired, or the link is incomplete. The sample reports are always available."
                : report.error.message}
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
        ) : null}
      </div>
      <SiteFooter />
    </>
  );
}

const SEVERITIES: Severity[] = ["critical", "major", "minor"];

function ReportView({ report }: { report: Report }) {
  const names = new Map(report.personas.map((p) => [p.id, p.name]));
  const nameOf = (personaId: string) => names.get(personaId) ?? personaId;

  const notFinished = report.personas.filter((p) => p.outcome !== "completed");
  const failedCount = Math.max(0, report.total - report.completed);
  const failedWord = notFinished.every((p) => p.outcome === "gave_up") ? "gave up" : "did not finish";

  const pinsByShot = new Map<string, ShotPin[]>();
  for (const issue of report.issues) {
    const list = pinsByShot.get(issue.screenshot) ?? [];
    list.push({ id: issue.id, x: issue.pin.x, y: issue.pin.y, title: issue.title });
    pinsByShot.set(issue.screenshot, list);
  }

  const severityCounts = SEVERITIES.map((s) => ({ s, n: report.issues.filter((i) => i.severity === s).length }))
    .filter(({ n }) => n > 0)
    .map(({ s, n }) => `${n} ${SEVERITY_LABEL[s].toLowerCase()}`)
    .join(" · ");

  const visionLabel =
    report.usage.rows.find((r) => r.tier === "vision")?.label || TIER_FALLBACK_LABEL.vision;

  return (
    <>
      <div className="page pt-6 sm:pt-10">
        <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <p className="text-13 text-ink-2">
            <span className="text-ink">{report.task}</span>
            {" · "}
            <a href={report.url} target="_blank" rel="noreferrer" className="link text-ink-2">
              {report.site}
            </a>
            {" · "}
            <time dateTime={new Date(report.created_at * 1000).toISOString()}>{formatDate(report.created_at)}</time>
            {" · "}
            {plural(report.total, "persona")} · {report.completed} completed · {failedCount} {failedWord}
          </p>
          <ReportActions report={report} />
        </div>

        {report.mode === "dry_run" || report.degraded ? (
          <div className="mt-4 flex flex-col gap-2">
            {report.mode === "dry_run" ? (
              <p className="text-13 text-ink-2">Dry run, persona decisions were scripted; no models were called.</p>
            ) : null}
            {report.degraded ? (
              <p className="text-13 text-ink-2">Written by Nemotron Super because Ultra was unavailable.</p>
            ) : null}
          </div>
        ) : null}

        <header className="mt-10 sm:mt-14">
          <h1 className="display max-w-[30ch] text-28 font-medium tracking-[-0.015em] text-balance text-ink">
            {report.headline}
          </h1>
          {report.subline ? <p className="mt-2 max-w-[62ch] text-17 text-ink-2">{report.subline}</p> : null}
          <ul aria-label="Outcome per persona" className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {report.personas.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <PersonaMark initial={p.initial} size="sm" />
                <span className="text-15 text-ink">{p.name}</span>
                <span
                  className={`text-13 font-medium ${outcomeTone(p.outcome) === "ok" ? "text-ok-ink" : "text-signal-ink"}`}
                >
                  {OUTCOME_LABEL[p.outcome].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </header>

        <section aria-labelledby="issues" className="mt-16 sm:mt-20">
          <SectionHeading id="issues" aside={severityCounts}>
            Issues
          </SectionHeading>
          {report.refs_status !== "ok" ? <p className="mt-3 text-13 text-ink-2">References unavailable</p> : null}
          {report.issues.length > 0 ? (
            <div className="divide-y divide-line">
              {report.issues.map((issue) => (
                <IssueBlock
                  key={issue.id}
                  issue={issue}
                  report={report}
                  pinsOnShot={pinsByShot.get(issue.screenshot) ?? []}
                  nameOf={nameOf}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-15 text-ink-2">No issues were serious enough to report.</p>
          )}
        </section>

        {report.friction_map.length > 0 ? (
          <section aria-labelledby="friction" className="mt-12 sm:mt-16">
            <SectionHeading id="friction">Friction map</SectionHeading>
            <div className="mt-4">
              <FrictionMap rows={report.friction_map} issues={report.issues} />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="personas" className="mt-16 sm:mt-20">
          <SectionHeading id="personas">Personas</SectionHeading>
          <div className="mt-4">
            <PersonaRows personas={report.personas} transcripts={report.transcripts} reportId={report.id} />
          </div>
        </section>

        {report.expert.length > 0 ? (
          <section aria-labelledby="expert" className="mt-16 sm:mt-20">
            <SectionHeading id="expert">Expert review</SectionHeading>
            <div className="mt-4">
              <ExpertTable findings={report.expert} visionLabel={visionLabel} />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="usage" className="mt-16 sm:mt-20">
          <SectionHeading id="usage">Model usage</SectionHeading>
          <div className="mt-4">
            <ModelUsage usage={report.usage} research={report.research} />
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
