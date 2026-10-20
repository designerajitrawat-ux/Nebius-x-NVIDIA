"use client";

import { useState } from "react";
import { SEVERITY_ORDER } from "@/lib/labels";
import type { ExpertFinding } from "@/lib/types";
import { SeverityChip } from "./ui";

/** Rows shown before "Show all". The list is sorted worst first, so these are the ones that matter most. */
const FIRST_ROWS = 8;

/** Heuristic (vision) and accessibility findings per visited screen. */
export function ExpertTable({ findings, visionLabel }: { findings: ExpertFinding[]; visionLabel: string }) {
  const [all, setAll] = useState(false);
  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const shown = all ? sorted : sorted.slice(0, FIRST_ROWS);
  const sourceLabel = (source: ExpertFinding["source"]) => (source === "a11y" ? "Accessibility check" : "Vision review");
  const sourceTitle = (source: ExpertFinding["source"]) =>
    source === "a11y" ? "Rule-based check, no model" : `Reviewed by ${visionLabel}`;

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-soft">
      <table id="expert-findings" className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">Expert review findings</caption>
        <thead>
          <tr className="border-b border-lilac-2 bg-mist text-[11px] font-semibold tracking-[0.08em] text-ink-2 uppercase">
            <th scope="col" className="w-[34%] py-3 pr-4 pl-5 font-semibold sm:pl-6 md:w-[22%]">
              Screen
            </th>
            <th scope="col" className="py-3 pr-5 font-semibold sm:pr-6 md:pr-4">
              Finding
            </th>
            <th scope="col" className="hidden w-[12%] py-3 pr-4 font-semibold md:table-cell">
              Severity
            </th>
            <th scope="col" className="hidden w-[17%] py-3 pr-6 font-semibold md:table-cell">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((f, i) => (
            <tr key={`${f.screen}-${f.heuristic}-${i}`} className="border-b border-lilac-2 align-top last:border-b-0">
              <th scope="row" className="py-4 pr-4 pl-5 text-15 font-medium text-ink sm:pl-6">
                {f.screen_label}
                <span className="mt-2 block md:hidden">
                  <SeverityChip severity={f.severity} />
                </span>
              </th>
              <td className="py-4 pr-5 sm:pr-6 md:pr-4">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-violet uppercase">{f.heuristic}</p>
                <p className="mt-1 max-w-[60ch] text-15 leading-relaxed text-ink">{f.finding}</p>
                {f.suggestion ? (
                  <p className="mt-2 max-w-[60ch] rounded-[12px] bg-[#f3ffd6] px-3 py-2 text-13 leading-relaxed text-ink">
                    <span className="font-semibold">Suggestion:</span> {f.suggestion}
                  </p>
                ) : null}
                <p className="mt-2 text-13 text-ink-2 md:hidden" title={sourceTitle(f.source)}>
                  {sourceLabel(f.source)}
                </p>
              </td>
              <td className="hidden py-4 pr-4 md:table-cell">
                <SeverityChip severity={f.severity} />
              </td>
              <td className="hidden py-4 pr-6 md:table-cell" title={sourceTitle(f.source)}>
                <span className="inline-flex items-center gap-1.5 text-13 text-ink-2">
                  <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.source === "a11y" ? "bg-p-sky" : "bg-p-mint"}`} />
                  {sourceLabel(f.source)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > FIRST_ROWS ? (
        <div className="border-t border-lilac-2 bg-mist px-5 py-3 sm:px-6">
          <button
            type="button"
            aria-expanded={all}
            aria-controls="expert-findings"
            onClick={() => setAll((v) => !v)}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-13 font-medium text-ink shadow-soft transition-transform duration-150 hover:-translate-y-px"
          >
            {all ? "Show fewer" : `Show all ${sorted.length} findings`}
            <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 transition-transform duration-200 ${all ? "rotate-180" : ""}`}>
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
