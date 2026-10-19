import { ConfusionMeter } from "@/components/ConfusionMeter";
import { PersonaMark } from "@/components/PersonaMark";
import { fileUrl } from "@/lib/api";
import { outcomeSentence, outcomeTone, viewportSuffix } from "@/lib/labels";
import type { Lane } from "@/lib/types";
import { LaneFrame } from "./LaneFrame";

const HEADER_TONE = {
  running: "bg-transparent",
  ok: "bg-ok-soft",
  signal: "bg-signal-soft",
} as const;

const OUTCOME_TEXT = {
  ok: "text-ok-ink",
  signal: "text-signal-ink",
} as const;

export function PersonaLane({
  lane,
  runId,
  order,
  reveal,
}: {
  lane: Lane;
  runId: string;
  order: number;
  /** Play the one orchestrated motion: lanes appear one by one, 120 ms apart. */
  reveal: boolean;
}) {
  const { persona, latest, result } = lane;
  const tone = result ? outcomeTone(result.outcome) : "running";
  const headingId = `lane-${persona.id}`;

  const where = result ? outcomeSentence(result) : latest ? `On ${latest.path}` : "Opening the site";

  return (
    <li
      className={`min-w-0 ${reveal ? "animate-lane-in" : ""}`}
      style={reveal ? { animationDelay: `${order * 120}ms` } : undefined}
    >
      <article
        aria-labelledby={headingId}
        className="grid h-full grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-3 sm:flex sm:flex-col sm:gap-3"
      >
        <header
          className={`col-span-2 -mx-1.5 flex items-center gap-3 rounded-control px-1.5 py-2 transition-colors duration-300 ${HEADER_TONE[tone]}`}
        >
          <PersonaMark initial={persona.initial} size="lg" />
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-15 font-semibold text-ink">
              {persona.name}, {persona.age}
            </h2>
            <p className="truncate text-13 text-ink-2" title={persona.archetype}>
              {persona.archetype}
              {viewportSuffix(persona.archetype, persona.viewport)}
            </p>
            <p
              className={`truncate text-13 ${tone === "running" ? "text-ink-2" : `font-medium ${OUTCOME_TEXT[tone]}`}`}
              aria-live="polite"
            >
              {where}
            </p>
          </div>
        </header>

        <div className="w-full self-start">
          <LaneFrame
            src={latest ? fileUrl(runId, latest.screenshot) : null}
            alt={latest?.see ? `What ${persona.name} sees: ${latest.see}` : `${persona.name}'s screen at step ${latest?.index ?? 0}`}
            viewport={persona.viewport}
            emptyLabel={persona.viewport === "mobile" ? "…" : "Opening the site…"}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-1">
          {latest ? (
            <p className="voice text-17 leading-[1.35] text-ink sm:min-h-[69px]">
              <span aria-hidden="true">“</span>
              {latest.inner_voice}
              <span aria-hidden="true">”</span>
            </p>
          ) : (
            <p className="text-13 text-ink-2 sm:min-h-[69px]">Waiting for the first step.</p>
          )}

          {latest ? (
            <div className="flex flex-col gap-1.5">
              <ConfusionMeter level={latest.confusion} />
              <p className="text-13 text-ink">{latest.action}</p>
              <p className="text-13 text-ink-2">
                Step {latest.index} · {latest.model}
              </p>
            </div>
          ) : null}
        </div>
      </article>
    </li>
  );
}
