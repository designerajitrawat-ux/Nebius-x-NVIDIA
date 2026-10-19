/* eslint-disable @next/next/no-img-element -- API screenshots come from varying hosts; plain <img> on purpose. */
"use client";

import { useState } from "react";
import { ConfusionMeter } from "@/components/ConfusionMeter";
import { PersonaMark } from "@/components/PersonaMark";
import { fileUrl } from "@/lib/api";
import { formatDuration, plural } from "@/lib/format";
import { OUTCOME_LABEL, outcomeTone, viewportSuffix } from "@/lib/labels";
import type { ReportPersona, TranscriptStep } from "@/lib/types";

const TONE_TEXT = { ok: "text-ok-ink", signal: "text-signal-ink" } as const;

/** One row per persona; each opens its step-by-step transcript. */
export function PersonaRows({
  personas,
  transcripts,
  reportId,
}: {
  personas: ReportPersona[];
  transcripts: Record<string, TranscriptStep[]>;
  reportId: string;
}) {
  return (
    <ul className="border-t border-line">
      {personas.map((persona) => (
        <PersonaRow
          key={persona.id}
          persona={persona}
          steps={transcripts[persona.id] ?? []}
          reportId={reportId}
        />
      ))}
    </ul>
  );
}

function PersonaRow({
  persona,
  steps,
  reportId,
}: {
  persona: ReportPersona;
  steps: TranscriptStep[];
  reportId: string;
}) {
  const [open, setOpen] = useState(false);
  const tone = outcomeTone(persona.outcome);
  const panelId = `transcript-${persona.id}`;

  return (
    <li className="border-b border-line">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 py-4 md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.6fr)_5rem_5.5rem_auto] md:items-center">
        <PersonaMark initial={persona.initial} size="md" />
        <div className="min-w-0">
          <p className="text-15 font-medium text-ink">
            {persona.name}, {persona.age}
          </p>
          <p className="text-13 text-ink-2">
            {persona.archetype}
            {viewportSuffix(persona.archetype, persona.viewport)}
          </p>
        </div>
        <div className="col-start-2 min-w-0 md:col-start-auto">
          <p className={`text-15 font-medium ${TONE_TEXT[tone]}`}>{OUTCOME_LABEL[persona.outcome]}</p>
          {persona.reason ? <p className="text-13 text-ink-2">{persona.reason}</p> : null}
        </div>
        <p className="col-start-2 text-13 text-ink-2 tabular-nums md:col-start-auto md:text-15 md:text-ink">
          <span className="md:hidden">
            {plural(persona.steps, "step")} · {formatDuration(persona.seconds)}
          </span>
          <span className="hidden md:inline">{plural(persona.steps, "step")}</span>
        </p>
        <p className="hidden text-15 text-ink tabular-nums md:block">{formatDuration(persona.seconds)}</p>
        <div className="col-start-2 md:col-start-auto md:justify-self-end">
          {steps.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="btn-secondary min-w-[148px] gap-2"
            >
              {open ? "Hide transcript" : "Show transcript"}
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              >
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {steps.length > 0 ? (
        <div id={panelId} hidden={!open} className="pb-6 md:pl-[52px]">
          <Transcript steps={steps} reportId={reportId} name={persona.name} phone={persona.viewport === "mobile"} />
        </div>
      ) : null}
    </li>
  );
}

function Transcript({
  steps,
  reportId,
  name,
  phone,
}: {
  steps: TranscriptStep[];
  reportId: string;
  name: string;
  phone: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step) => {
        const src = fileUrl(reportId, step.screenshot);
        return (
          <li
            key={step.index}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 border-t border-line py-4 first:border-t-0 first:pt-0 sm:grid-cols-[112px_minmax(0,1fr)]"
          >
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className={`block self-start overflow-hidden rounded-control border border-line bg-card ${
                phone ? "aspect-[390/844] w-12" : "aspect-[16/10] w-full"
              }`}
            >
              <img
                src={src}
                alt={step.see ? `Step ${step.index}, what ${name} saw: ${step.see}` : `Step ${step.index} screenshot`}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover object-top"
              />
            </a>
            <div className="min-w-0">
              <p className="text-13 text-ink-2">
                Step {step.index} · {step.path}
              </p>
              <p className="voice mt-1 text-17 leading-[1.35] text-ink">
                <span aria-hidden="true">“</span>
                {step.inner_voice}
                <span aria-hidden="true">”</span>
              </p>
              {step.see ? <p className="mt-1 text-13 text-ink-2">Saw: {step.see}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-13 text-ink">{step.action}</p>
                <ConfusionMeter level={step.confusion} compact />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
