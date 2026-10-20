"use client";

import { PersonaAvatar } from "@/components/PersonaAvatar";
import { fileUrl } from "@/lib/api";
import { hostOf, joinNames } from "@/lib/format";
import type { Issue, Reference, Report } from "@/lib/types";
import type { ShotPin } from "./AnnotatedShot";
import { AnnotatedShot } from "./AnnotatedShot";
import { moodForQuote, type CastLookup } from "./cast";
import { FixBlock } from "./FixBlock";
import { RefCard, SeverityChip } from "./ui";

/** One issue as a big card: annotated screenshot on a lilac panel, the finding and the fix beside it. */
export function IssueBlock({
  issue,
  report,
  pinsOnShot,
  nameOf,
  castOf,
}: {
  issue: Issue;
  report: Report;
  pinsOnShot: ShotPin[];
  nameOf: (personaId: string) => string;
  castOf: CastLookup;
}) {
  const phone = issue.viewport[0] > 0 && issue.viewport[0] < issue.viewport[1];
  const hitNames = issue.personas_hit.map(nameOf);
  const headingId = `issue-${issue.id}-title`;
  const others = pinsOnShot.filter((p) => p.id !== issue.id).map((p) => p.id);
  const quoter = issue.quote ? castOf(issue.quote.persona_id) : undefined;

  return (
    <article
      id={`issue-${issue.id}`}
      aria-labelledby={headingId}
      className="scroll-mt-24 overflow-clip rounded-[28px] bg-white shadow-float"
    >
      <div
        className={`grid ${
          phone ? "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        }`}
      >
        <div className="relative bg-lilac p-4 sm:p-8">
          <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
          <div className="relative lg:sticky lg:top-24">
            <figure>
              <div className={phone ? "mx-auto w-full max-w-[280px]" : "w-full"}>
                <AnnotatedShot
                  src={fileUrl(report.id, issue.screenshot)}
                  alt={issue.alt || `Screenshot of ${issue.screen_label}`}
                  viewport={issue.viewport}
                  pins={pinsOnShot}
                  currentId={issue.id}
                  label={`${hostOf(report.url)} · ${issue.screen_label}`}
                />
              </div>
              <figcaption className={`mt-4 text-13 text-ink-2 ${phone ? "text-center" : ""}`}>
                <span className="font-medium text-ink">{issue.screen_label}</span>
                {others.length > 0 ? ` · also on this screen: ${others.length === 1 ? "issue" : "issues"} ${others.join(", ")}` : ""}
              </figcaption>
            </figure>
            {/* On wide screens the references sit under the screenshot; display:none keeps the copy below out of the a11y tree. */}
            <IssueRefs refs={issue.refs} className="mt-8 hidden lg:block" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-2 text-13 font-semibold text-white tabular-nums">
              <span className="sr-only">Issue </span>
              {issue.id}
            </span>
            <SeverityChip severity={issue.severity} />
          </div>

          <h3 id={headingId} className="display mt-4 text-[1.5rem] leading-[1.18] font-semibold tracking-[-0.02em] text-balance text-ink sm:text-28">
            {issue.title}
          </h3>

          {hitNames.length > 0 ? (
            <div className="mt-3 flex items-center gap-2.5">
              <span aria-hidden="true" className="flex -space-x-1.5">
                {issue.personas_hit.map((pid) => {
                  const entry = castOf(pid);
                  return entry ? (
                    <span key={pid} className="rounded-full bg-white p-px">
                      <PersonaAvatar persona={entry.persona} index={entry.index} size={24} mood="confused" />
                    </span>
                  ) : null;
                })}
              </span>
              <p className="text-13 text-ink-2">
                Hit by {hitNames.length} of {report.total}: <span className="text-ink">{joinNames(hitNames)}</span>
              </p>
            </div>
          ) : null}

          <p className="mt-5 text-15 leading-relaxed text-ink-2">{issue.why}</p>

          {issue.quote ? (
            <figure className="mt-6 flex gap-3.5 rounded-[18px] bg-mist p-4">
              {quoter ? (
                <PersonaAvatar persona={quoter.persona} index={quoter.index} size={46} mood={moodForQuote(report, issue.quote)} look={{ x: 0.6, y: -0.2 }} />
              ) : null}
              <div className="min-w-0">
                <blockquote className="voice text-17 leading-snug text-ink sm:text-[1.2rem]">
                  <p>
                    <span aria-hidden="true">“</span>
                    {issue.quote.text}
                    <span aria-hidden="true">”</span>
                  </p>
                </blockquote>
                <figcaption className="mt-1.5 text-13 text-ink-2">{nameOf(issue.quote.persona_id)}, during the run</figcaption>
              </div>
            </figure>
          ) : null}

          <FixBlock fix={issue.fix} />

          <IssueRefs refs={issue.refs} className="mt-7 lg:hidden" />
        </div>
      </div>
    </article>
  );
}

/** "See how others do it": the Tavily references for one issue. */
function IssueRefs({ refs, className }: { refs: Reference[]; className: string }) {
  if (refs.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-13 text-ink-2">
        <span className="font-semibold text-ink">See how others do it</span> · via Tavily
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {refs.map((ref) => (
          <li key={ref.url}>
            <RefCard reference={ref} />
          </li>
        ))}
      </ul>
    </div>
  );
}
