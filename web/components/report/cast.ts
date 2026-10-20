import type { Mood } from "@/components/landing/Blob";
import { moodForConfusion } from "@/lib/personaLook";
import type { Quote, Report, ReportPersona } from "@/lib/types";

export interface CastEntry {
  persona: ReportPersona;
  /** Slot in the run, the fallback for the character's colour. */
  index: number;
}

export type CastLookup = (personaId: string) => CastEntry | undefined;

export function buildCast(report: Report): CastLookup {
  const map = new Map(report.personas.map((persona, index) => [persona.id, { persona, index }]));
  return (personaId) => map.get(personaId);
}

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The face next to a quote: the confusion of the step where the persona said it, when we can find
 * that step in their transcript; otherwise "confused", since quotes are picked from trouble spots.
 */
export function moodForQuote(report: Report, quote: Quote): Mood {
  const q = normalise(quote.text);
  if (!q) return "confused";
  const head = q.slice(0, 40);
  const steps = report.transcripts[quote.persona_id] ?? [];
  const step = steps.find((s) => {
    const v = normalise(s.inner_voice);
    return v.length > 0 && (v.includes(head) || q.includes(v.slice(0, 40)));
  });
  return step ? moodForConfusion(step.confusion) : "confused";
}
