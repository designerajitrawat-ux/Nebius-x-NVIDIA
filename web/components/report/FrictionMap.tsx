import type { FrictionRow, Issue } from "@/lib/types";
import { PinMark } from "./PinMark";

/** Which screens caused trouble, for how many personas, and the worst issue there. */
export function FrictionMap({ rows, issues }: { rows: FrictionRow[]; issues: Issue[] }) {
  const issueById = new Map(issues.map((i) => [i.id, i]));
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-soft">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Friction by screen</caption>
        <thead>
          <tr className="border-b border-lilac-2 bg-mist text-[11px] font-semibold tracking-[0.08em] text-ink-2 uppercase">
            <th scope="col" className="py-3 pr-4 pl-5 font-semibold sm:pl-6">
              Screen
            </th>
            <th scope="col" className="py-3 pr-4 font-semibold sm:pr-6">
              Confused or quit
            </th>
            <th scope="col" className="hidden py-3 pr-6 font-semibold sm:table-cell">
              Worst issue
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const worst = row.worst_issue_id !== null ? issueById.get(row.worst_issue_id) : undefined;
            return (
              <tr key={row.screen} className="border-b border-lilac-2 align-top last:border-b-0">
                <th scope="row" className="py-4 pr-4 pl-5 font-normal sm:pl-6">
                  <span className="block text-15 font-medium text-ink">{row.label}</span>
                  <span className="mt-1 inline-block max-w-full rounded-md bg-lilac px-1.5 py-0.5 font-mono text-[11.5px] break-all text-ink-2">{row.path}</span>
                  {worst ? (
                    <a href={`#issue-${worst.id}`} className="mt-3 flex items-start gap-2 sm:hidden">
                      <PinMark n={worst.id} />
                      <span className="link text-13">{worst.title}</span>
                    </a>
                  ) : null}
                </th>
                <td className="py-4 pr-4 sm:pr-6">
                  <HitsBar hits={row.hits} visits={row.visits} />
                </td>
                <td className="hidden py-4 pr-6 sm:table-cell">
                  {worst ? (
                    <a
                      href={`#issue-${worst.id}`}
                      className="group inline-flex items-start gap-2.5 rounded-[12px] p-1 -m-1 transition-colors hover:bg-mist"
                    >
                      <PinMark n={worst.id} />
                      <span className="text-15 text-ink underline decoration-ink/30 underline-offset-[3px] group-hover:decoration-ink">{worst.title}</span>
                    </a>
                  ) : (
                    <span className="text-15 text-ink-2">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HitsBar({ hits, visits }: { hits: number; visits: number }) {
  const segments = Math.max(visits, hits);
  return (
    <span className="flex flex-col gap-2">
      <span className="text-15 text-ink tabular-nums">
        <span className="display text-22 font-semibold">{hits}</span> <span className="text-13 text-ink-2">of {visits} who saw it</span>
      </span>
      <span aria-hidden="true" className="flex flex-wrap gap-1">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={`h-2 w-5 rounded-full ${i < hits ? "bg-[#ff4d4d]" : "bg-lilac-2"}`} />
        ))}
      </span>
    </span>
  );
}
