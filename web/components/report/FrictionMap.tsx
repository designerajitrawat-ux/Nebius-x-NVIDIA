import type { FrictionRow, Issue } from "@/lib/types";
import { PinMark } from "./PinMark";

/** Hairline table: which screens caused trouble, for how many personas, and the worst issue there. */
export function FrictionMap({ rows, issues }: { rows: FrictionRow[]; issues: Issue[] }) {
  const issueById = new Map(issues.map((i) => [i.id, i]));
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Friction by screen</caption>
      <thead>
        <tr className="border-b border-line text-13 text-ink-2">
          <th scope="col" className="py-2 pr-4 font-normal">
            Screen
          </th>
          <th scope="col" className="py-2 pr-4 font-normal">
            Confused or quit
          </th>
          <th scope="col" className="hidden py-2 font-normal sm:table-cell">
            Worst issue
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const worst = row.worst_issue_id !== null ? issueById.get(row.worst_issue_id) : undefined;
          return (
            <tr key={row.screen} className="border-b border-line align-top">
              <th scope="row" className="py-3 pr-4 font-normal">
                <span className="block text-15 text-ink">{row.label}</span>
                <span className="block text-13 break-all text-ink-2">{row.path}</span>
                {worst ? (
                  <a href={`#issue-${worst.id}`} className="mt-2 inline-flex items-center gap-2 sm:hidden">
                    <PinMark n={worst.id} />
                    <span className="link text-13">{worst.title}</span>
                  </a>
                ) : null}
              </th>
              <td className="py-3 pr-4">
                <HitsBar hits={row.hits} visits={row.visits} />
              </td>
              <td className="hidden py-3 sm:table-cell">
                {worst ? (
                  <a href={`#issue-${worst.id}`} className="inline-flex items-start gap-2 rounded-control">
                    <PinMark n={worst.id} />
                    <span className="link text-15">{worst.title}</span>
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
  );
}

function HitsBar({ hits, visits }: { hits: number; visits: number }) {
  const segments = Math.max(visits, hits);
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-15 text-ink tabular-nums">
        {hits} <span className="text-13 text-ink-2">of {visits} who saw it</span>
      </span>
      <span aria-hidden="true" className="flex gap-[3px]">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-[1px] ${i < hits ? "bg-signal" : "bg-line"}`} />
        ))}
      </span>
    </span>
  );
}
