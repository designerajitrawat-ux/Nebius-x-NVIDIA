import { fileUrl } from "@/lib/api";
import { hostOf, joinNames } from "@/lib/format";
import { SEVERITY_LABEL, SEVERITY_TEXT } from "@/lib/labels";
import type { Issue, Report } from "@/lib/types";
import { AnnotatedShot, type ShotPin } from "./AnnotatedShot";
import { FixBlock } from "./FixBlock";
import { PinMark } from "./PinMark";

/** One issue: annotated screenshot left (2/3), the finding right (1/3). */
export function IssueBlock({
  issue,
  report,
  pinsOnShot,
  nameOf,
}: {
  issue: Issue;
  report: Report;
  pinsOnShot: ShotPin[];
  nameOf: (personaId: string) => string;
}) {
  const phone = issue.viewport[0] > 0 && issue.viewport[0] < issue.viewport[1];
  const hitNames = issue.personas_hit.map(nameOf);
  const headingId = `issue-${issue.id}-title`;
  const others = pinsOnShot.filter((p) => p.id !== issue.id).map((p) => p.id);

  return (
    <article
      id={`issue-${issue.id}`}
      aria-labelledby={headingId}
      className={`grid gap-x-6 gap-y-6 py-10 sm:py-12 ${
        phone ? "md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]" : "md:grid-cols-12"
      }`}
    >
      <figure className={phone ? "w-full max-w-[280px]" : "md:col-span-7 lg:col-span-8"}>
        <AnnotatedShot
          src={fileUrl(report.id, issue.screenshot)}
          alt={issue.alt || `Screenshot of ${issue.screen_label}`}
          viewport={issue.viewport}
          pins={pinsOnShot}
          currentId={issue.id}
        />
        <figcaption className="mt-3 text-13 text-ink-2">
          {issue.screen_label}
          {others.length > 0 ? ` · also on this screen: ${others.length === 1 ? "issue" : "issues"} ${others.join(", ")}` : ""}
        </figcaption>
      </figure>

      <div className={`min-w-0 ${phone ? "max-w-[62ch]" : "md:col-span-5 lg:col-span-4"}`}>
        <p className="flex items-center gap-3">
          <PinMark n={issue.id} />
          <span className={`text-13 font-semibold ${SEVERITY_TEXT[issue.severity]}`}>
            {SEVERITY_LABEL[issue.severity]}
          </span>
        </p>
        <h3 id={headingId} className="display mt-3 text-22 font-medium tracking-[-0.01em] text-ink">
          {issue.title}
        </h3>
        {hitNames.length > 0 ? (
          <p className="mt-2 text-13 text-ink-2">
            Hit by {hitNames.length} of {report.total}: <span className="text-ink">{joinNames(hitNames)}</span>
          </p>
        ) : null}

        {issue.quote ? (
          <figure className="mt-6">
            <blockquote className="voice text-22 leading-[1.3] text-ink">
              <p>
                <span aria-hidden="true">“</span>
                {issue.quote.text}
                <span aria-hidden="true">”</span>
              </p>
            </blockquote>
            <figcaption className="mt-2 text-13 text-ink-2">{nameOf(issue.quote.persona_id)}</figcaption>
          </figure>
        ) : null}

        <p className="mt-6 text-15 text-ink">{issue.why}</p>

        <FixBlock fix={issue.fix} />

        {issue.refs.length > 0 ? (
          <div className="mt-6">
            <p className="text-13 text-ink-2">
              <span className="font-semibold text-ink">See how others do it</span> · via Tavily
            </p>
            <ul className="mt-2 flex flex-col gap-3">
              {issue.refs.map((ref) => (
                <li key={ref.url}>
                  <a href={ref.url} target="_blank" rel="noreferrer" className="link text-15">
                    {ref.title}
                  </a>
                  <p className="text-13 text-ink-2">
                    {hostOf(ref.url)}
                    {ref.note ? ` · ${ref.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
