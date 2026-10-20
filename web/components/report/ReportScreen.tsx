"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { Blob } from "@/components/landing/Blob";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteFooter } from "@/components/SiteFooter";
import { getReport } from "@/lib/api";
import { SEVERITY_LABEL, TIER_FALLBACK_LABEL } from "@/lib/labels";
import type { Report, Severity } from "@/lib/types";
import { useResource } from "@/lib/useResource";
import type { ShotPin } from "./AnnotatedShot";
import { buildCast } from "./cast";
import { ExpertTable } from "./ExpertTable";
import { FrictionMap } from "./FrictionMap";
import { IssueBlock } from "./IssueBlock";
import { ModelUsage } from "./ModelUsage";
import { PersonaRows } from "./PersonaRows";
import { ReportHero } from "./ReportHero";
import { SEVERITY_DOT, SkyBackdrop } from "./ui";

/** Lilac page that slides under the sticky glass header, like the landing page. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mt-16 flex flex-1 flex-col overflow-x-clip bg-lilac sm:-mt-[72px]">
      {children}
      <SiteFooter />
    </div>
  );
}

export function ReportScreen({ id }: { id: string }) {
  const load = useCallback(() => getReport(id), [id]);
  const report = useResource(`report:${id}`, load);

  if (report.status === "ready") return <ReportView report={report.data} />;

  return (
    <Shell>
      <section className="relative isolate flex-1 overflow-hidden pt-[112px] pb-24 sm:pt-[156px]">
        <SkyBackdrop />
        <div className="page relative">
          {report.status === "loading" ? (
            <>
              <p role="status" className="sr-only">
                Loading the report…
              </p>
              <LoadingSkeleton />
            </>
          ) : null}
          {report.status === "waking" ? (
            <div className="glass mx-auto flex max-w-[560px] flex-col items-center gap-4 rounded-card px-6 py-8 text-center">
              <Blob hue={["#c4bbff", "#6d5cff"]} size={72} mood="calm" accessory="headband" />
              <p role="status" className="max-w-[46ch] text-15 text-ink-2">
                Waking up the test lab… free hosting sleeps when it&rsquo;s quiet, so the report can take up to a
                minute to open.
              </p>
            </div>
          ) : null}
          {report.status === "error" ? (
            <div className="mx-auto flex max-w-[640px] flex-col items-center text-center">
              <Blob hue={["#ffb199", "#ff6a3d"]} size={104} mood="confused" accessory="sprout" look={{ x: 0.4, y: -0.3 }} />
              <h1 className="display mt-8 text-40 font-semibold tracking-[-0.03em] text-balance text-ink sm:text-56">
                {report.error.status === 404 ? "We couldn’t find that report." : "We couldn’t open that report."}
              </h1>
              <p className="mt-4 max-w-[52ch] text-17 text-ink-2">
                {report.error.status === 404
                  ? "It may have expired, or the link is incomplete. The sample reports are always available."
                  : report.error.message}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <Link href="/samples" className="btn-lime">
                  Open the sample reports
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-[52px] items-center rounded-full bg-white/60 px-6 text-15 font-medium text-ink ring-1 ring-ink/10 transition-colors hover:bg-white"
                >
                  Start a new test
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Shell>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="flex gap-2">
        <div className="h-8 w-36 rounded-full bg-white/70" />
        <div className="h-8 w-40 rounded-full bg-white/60" />
      </div>
      <div className="mt-7 h-12 w-[min(100%,720px)] rounded-[14px] bg-white/70" />
      <div className="mt-3 h-12 w-[min(80%,520px)] rounded-[14px] bg-white/60" />
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-[120px] rounded-card bg-white/60 ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`} />
        ))}
      </div>
    </div>
  );
}

const SEVERITIES: Severity[] = ["critical", "major", "minor"];

function ReportView({ report }: { report: Report }) {
  const names = new Map(report.personas.map((p) => [p.id, p.name]));
  const nameOf = (personaId: string) => names.get(personaId) ?? personaId;
  const castOf = buildCast(report);

  const pinsByShot = new Map<string, ShotPin[]>();
  for (const issue of report.issues) {
    const list = pinsByShot.get(issue.screenshot) ?? [];
    list.push({ id: issue.id, x: issue.pin.x, y: issue.pin.y, title: issue.title });
    pinsByShot.set(issue.screenshot, list);
  }

  const severityCounts = SEVERITIES.map((s) => ({ s, n: report.issues.filter((i) => i.severity === s).length })).filter(
    ({ n }) => n > 0,
  );

  const visionLabel = report.usage.rows.find((r) => r.tier === "vision")?.label || TIER_FALLBACK_LABEL.vision;

  const sections = [
    { id: "issues", label: "Issues", count: report.issues.length },
    ...(report.friction_map.length > 0 ? [{ id: "friction", label: "Friction map" }] : []),
    { id: "personas", label: "Personas", count: report.personas.length },
    ...(report.expert.length > 0 ? [{ id: "expert", label: "Expert review", count: report.expert.length }] : []),
    { id: "usage", label: "Model usage" },
  ];

  return (
    <Shell>
      <ReportHero report={report} sections={sections} />

      <div className="page">
        <section aria-labelledby="issues" className="pt-4 sm:pt-8">
          <Reveal>
            <SectionHeading
              id="issues"
              eyebrow="What to fix"
              lede="Worst first. Each one is pinned on the screen where it happened, with what a tester said and the change to make."
              aside={
                severityCounts.length > 0 ? (
                  <ul className="flex flex-wrap gap-2" aria-label="Issues by severity">
                    {severityCounts.map(({ s, n }) => (
                      <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-13 font-medium text-ink shadow-soft">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${SEVERITY_DOT[s]}`} />
                        {n} {SEVERITY_LABEL[s].toLowerCase()}
                      </li>
                    ))}
                  </ul>
                ) : null
              }
            >
              Issues
            </SectionHeading>
          </Reveal>
          {report.refs_status !== "ok" ? <p className="mt-3 text-13 text-ink-2">References unavailable</p> : null}
          {report.issues.length > 0 ? (
            <div className="mt-10 flex flex-col gap-8 sm:gap-10">
              {report.issues.map((issue) => (
                <Reveal key={issue.id} y={32}>
                  <IssueBlock
                    issue={issue}
                    report={report}
                    pinsOnShot={pinsByShot.get(issue.screenshot) ?? []}
                    nameOf={nameOf}
                    castOf={castOf}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-card bg-white p-6 text-15 text-ink-2 shadow-soft">No issues were serious enough to report.</p>
          )}
        </section>

        {report.friction_map.length > 0 ? (
          <section aria-labelledby="friction" className="mt-20 sm:mt-28">
            <Reveal>
              <SectionHeading id="friction" eyebrow="Where it hurt" lede="Screens where testers got confused or quit, and the worst issue on each.">
                Friction map
              </SectionHeading>
            </Reveal>
            <Reveal className="mt-8" delay={0.08}>
              <FrictionMap rows={report.friction_map} issues={report.issues} />
            </Reveal>
          </section>
        ) : null}

        <section aria-labelledby="personas" className="mt-20 sm:mt-28">
          <Reveal>
            <SectionHeading id="personas" eyebrow="Every step" lede="Open a transcript to see each screen they saw, what went through their head and what they clicked.">
              Personas
            </SectionHeading>
          </Reveal>
          <Reveal className="mt-8" delay={0.08}>
            <PersonaRows personas={report.personas} transcripts={report.transcripts} reportId={report.id} />
          </Reveal>
        </section>

        {report.expert.length > 0 ? (
          <section aria-labelledby="expert" className="mt-20 sm:mt-28">
            <Reveal>
              <SectionHeading
                id="expert"
                eyebrow="Second opinion"
                lede={`Each screen the testers visited was also reviewed against usability heuristics by ${visionLabel}${
                  report.expert.some((f) => f.source === "a11y") ? ", plus rule-based accessibility checks" : ""
                }.`}
              >
                Expert review
              </SectionHeading>
            </Reveal>
            <Reveal className="mt-8" delay={0.08}>
              <ExpertTable findings={report.expert} visionLabel={visionLabel} />
            </Reveal>
          </section>
        ) : null}

        <Reveal className="mt-20 sm:mt-28">
          <section aria-labelledby="usage" className="relative overflow-hidden rounded-[28px] bg-night px-4 py-10 text-white sm:px-10 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full bg-violet/30 blur-[120px]" />
              <div className="absolute right-0 bottom-0 h-[320px] w-[320px] rounded-full bg-lime/15 blur-[120px]" />
              <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            </div>
            <div className="relative">
              <SectionHeading
                id="usage"
                dark
                eyebrow="Under the hood"
                lede={
                  report.mode === "dry_run"
                    ? "This was a dry run: scripted decisions stood in for the models, so nothing was billed."
                    : "Which NVIDIA Nemotron model did what in this run, served by Nebius Token Factory, with every call, token and cent."
                }
              >
                Model usage
              </SectionHeading>
              <div className="mt-8">
                <ModelUsage usage={report.usage} research={report.research} />
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </Shell>
  );
}
