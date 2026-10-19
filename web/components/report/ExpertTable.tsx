import { SEVERITY_LABEL, SEVERITY_ORDER, SEVERITY_TEXT } from "@/lib/labels";
import type { ExpertFinding } from "@/lib/types";

/** Heuristic (vision) and accessibility findings per visited screen, as a hairline table. */
export function ExpertTable({ findings, visionLabel }: { findings: ExpertFinding[]; visionLabel: string }) {
  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const sourceLabel = (source: ExpertFinding["source"]) =>
    source === "a11y" ? "Accessibility check" : "Vision review";
  const sourceTitle = (source: ExpertFinding["source"]) =>
    source === "a11y" ? "Rule-based check, no model" : `Reviewed by ${visionLabel}`;

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">Expert review findings</caption>
      <thead>
        <tr className="border-b border-line text-13 text-ink-2">
          <th scope="col" className="w-[32%] py-2 pr-4 font-normal md:w-[22%]">
            Screen
          </th>
          <th scope="col" className="py-2 pr-4 font-normal">
            Finding
          </th>
          <th scope="col" className="hidden w-[10%] py-2 pr-4 font-normal md:table-cell">
            Severity
          </th>
          <th scope="col" className="hidden w-[14%] py-2 font-normal md:table-cell">
            Source
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((f, i) => (
          <tr key={`${f.screen}-${f.heuristic}-${i}`} className="border-b border-line align-top">
            <th scope="row" className="py-3 pr-4 text-15 font-normal text-ink">
              {f.screen_label}
              <span className={`mt-1 block text-13 font-semibold md:hidden ${SEVERITY_TEXT[f.severity]}`}>
                {SEVERITY_LABEL[f.severity]}
              </span>
            </th>
            <td className="py-3 pr-4">
              <p className="text-13 text-ink-2">{f.heuristic}</p>
              <p className="mt-0.5 max-w-[60ch] text-15 text-ink">{f.finding}</p>
              {f.suggestion ? (
                <p className="mt-1 max-w-[60ch] text-15 text-ink-2">
                  <span className="text-ink">Suggestion:</span> {f.suggestion}
                </p>
              ) : null}
              <p className="mt-1 text-13 text-ink-2 md:hidden" title={sourceTitle(f.source)}>
                {sourceLabel(f.source)}
              </p>
            </td>
            <td className={`hidden py-3 pr-4 text-13 font-semibold md:table-cell ${SEVERITY_TEXT[f.severity]}`}>
              {SEVERITY_LABEL[f.severity]}
            </td>
            <td className="hidden py-3 text-13 text-ink-2 md:table-cell" title={sourceTitle(f.source)}>
              {sourceLabel(f.source)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
