/* eslint-disable @next/next/no-img-element -- API screenshots come from varying hosts; plain <img> on purpose. */
"use client";

import { useState } from "react";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { fileUrl } from "@/lib/api";
import { formatDuration, plural } from "@/lib/format";
import { OUTCOME_LABEL, outcomeTone, viewportSuffix } from "@/lib/labels";
import { moodForConfusion, moodForOutcome } from "@/lib/personaLook";
import type { ReportPersona, TranscriptStep } from "@/lib/types";
import { OutcomeChip } from "./ui";

/** One card per persona; each opens its step-by-step transcript. */
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
    <ul className="flex flex-col gap-4">
      {personas.map((persona, index) => (
        <PersonaRow key={persona.id} persona={persona} index={index} steps={transcripts[persona.id] ?? []} reportId={reportId} />
      ))}
    </ul>
  );
}

function PersonaRow({
  persona,
  index,
  steps,
  reportId,
}: {
  persona: ReportPersona;
  index: number;
  steps: TranscriptStep[];
  reportId: string;
}) {
  const [open, setOpen] = useState(false);
  const ok = outcomeTone(persona.outcome) === "ok";
  const panelId = `transcript-${persona.id}`;

  return (
    <li id={`persona-${persona.id}`} className="scroll-mt-24 overflow-hidden rounded-card bg-white shadow-soft transition-shadow duration-300 hover:shadow-float">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 p-4 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-center md:gap-x-6">
        <PersonaAvatar persona={persona} index={index} size={56} mood={moodForOutcome(persona.outcome)} />
        <div className="min-w-0">
          <p className="display text-17 font-semibold text-ink">
            {persona.name}, {persona.age}
          </p>
          <p className="text-13 text-ink-2">
            {persona.archetype}
            {viewportSuffix(persona.archetype, persona.viewport)}
          </p>
        </div>
        <div className="col-start-2 min-w-0 md:col-start-auto">
          <div className="flex flex-wrap items-center gap-2">
            <OutcomeChip ok={ok}>{OUTCOME_LABEL[persona.outcome]}</OutcomeChip>
            <span className="text-13 text-ink-2 tabular-nums">
              {plural(persona.steps, "step")} · {formatDuration(persona.seconds)}
            </span>
          </div>
          {persona.reason ? <p className="mt-1.5 text-13 leading-relaxed text-ink-2">{persona.reason}</p> : null}
        </div>
        <div className="col-start-2 md:col-start-auto md:justify-self-end">
          {steps.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex h-10 min-w-[164px] items-center justify-center gap-2 rounded-full px-4 text-13 font-medium transition-colors duration-150 ${
                open ? "bg-ink text-white hover:bg-ink/90" : "bg-lilac text-ink hover:bg-lilac-2"
              }`}
            >
              {open ? "Hide transcript" : "Show transcript"}
              <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {steps.length > 0 ? (
        <div id={panelId} hidden={!open} className="border-t border-lilac-2 bg-mist px-4 py-5 sm:px-6 sm:py-6">
          {open ? <Transcript steps={steps} reportId={reportId} persona={persona} index={index} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function Transcript({
  steps,
  reportId,
  persona,
  index,
}: {
  steps: TranscriptStep[];
  reportId: string;
  persona: ReportPersona;
  index: number;
}) {
  const phone = persona.viewport === "mobile";
  const name = persona.name;
  return (
    <ol className="relative flex animate-lane-in flex-col gap-5">
      {steps.map((step) => {
        const src = fileUrl(reportId, step.screenshot);
        return (
          <li
            key={step.index}
            className={`grid gap-x-4 gap-y-3 ${
              phone ? "grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)]" : "grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)]"
            }`}
          >
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className={`group block self-start overflow-hidden bg-white shadow-soft ring-1 ring-ink/5 transition-transform duration-200 hover:-translate-y-0.5 ${
                phone ? "rounded-[14px] border-[3px] border-ink" : "rounded-[10px]"
              }`}
            >
              {!phone ? (
                <span aria-hidden="true" className="hidden h-4 items-center gap-1 border-b border-lilac-2 px-2 sm:flex">
                  <span className="h-1 w-1 rounded-full bg-ink/20" />
                  <span className="h-1 w-1 rounded-full bg-ink/20" />
                  <span className="h-1 w-1 rounded-full bg-ink/20" />
                </span>
              ) : null}
              <span className={`block ${phone ? "aspect-[390/844]" : "aspect-[16/10]"}`}>
                <img
                  src={src}
                  alt={step.see ? `Step ${step.index}, what ${name} saw: ${step.see}` : `Step ${step.index} screenshot`}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover object-top"
                />
              </span>
            </a>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-13 text-ink-2">
                <span className="inline-flex h-6 items-center rounded-full bg-white px-2.5 text-[12px] font-semibold text-ink shadow-soft tabular-nums">
                  Step {step.index}
                </span>
                <span className="min-w-0 rounded-md bg-lilac px-1.5 py-0.5 font-mono text-[11.5px] break-all">{step.path}</span>
              </p>
              <div className="mt-3 flex items-start gap-2.5">
                <PersonaAvatar persona={persona} index={index} size={34} mood={moodForConfusion(step.confusion)} />
                <p className="voice min-w-0 rounded-[16px] rounded-tl-[4px] bg-white px-3.5 py-2.5 text-17 leading-[1.35] text-ink shadow-soft">
                  <span aria-hidden="true">“</span>
                  {step.inner_voice}
                  <span aria-hidden="true">”</span>
                </p>
              </div>
              {step.see ? <p className="mt-2.5 text-13 leading-relaxed text-ink-2">Saw: {step.see}</p> : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white">
                  <CursorIcon />
                  <span className="min-w-0">{step.action}</span>
                </p>
                <ConfusionDots level={step.confusion} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const CONFUSION_WORD = ["calm", "a little unsure", "confused", "lost"] as const;
const CONFUSION_FILL = ["bg-p-mint", "bg-p-amber", "bg-[#ff8a3d]", "bg-[#ff4d4d]"] as const;

/** Four segments for confusion 0 to 3, coloured from calm mint to lost red. */
function ConfusionDots({ level }: { level: number }) {
  const value = Math.max(0, Math.min(3, Math.round(level)));
  return (
    <span role="img" aria-label={`Confusion ${value} of 3, ${CONFUSION_WORD[value]}`} className="inline-flex items-center gap-2">
      <span className="inline-flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-full ${i <= value ? CONFUSION_FILL[value] : "bg-lilac-2"}`} />
        ))}
      </span>
      <span className="text-[12px] text-ink-2">{CONFUSION_WORD[value]}</span>
    </span>
  );
}

function CursorIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      <path d="M1.5 1 10.5 5 6.6 6.4 5 10.5Z" fill="currentColor" />
    </svg>
  );
}
