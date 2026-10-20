"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { fileUrl } from "@/lib/api";
import { OUTCOME_LABEL, outcomeSentence, viewportSuffix } from "@/lib/labels";
import { moodForConfusion, moodForOutcome, personaLook } from "@/lib/personaLook";
import type { Lane, Outcome } from "@/lib/types";
import { LaneFrame } from "./LaneFrame";
import { LaneMeter } from "./LaneMeter";

/** Outcome stamp and status colours, by how the walk ended. */
const OUTCOME_TONE: Record<Outcome, { stamp: string; text: string; tint: string }> = {
  completed: { stamp: "bg-lime text-ink", text: "text-lime", tint: "#d4ff3f" },
  gave_up: { stamp: "bg-p-coral text-ink", text: "text-p-coral", tint: "#ff7a59" },
  stuck: { stamp: "bg-p-coral text-ink", text: "text-p-coral", tint: "#ff7a59" },
  out_of_steps: { stamp: "bg-p-amber text-ink", text: "text-p-amber", tint: "#ffb627" },
  wrong_path: { stamp: "bg-p-amber text-ink", text: "text-p-amber", tint: "#ffb627" },
  error: { stamp: "bg-white text-ink", text: "text-white", tint: "#ffffff" },
};

export function PersonaLane({
  lane,
  runId,
  order,
  reveal,
}: {
  lane: Lane;
  runId: string;
  order: number;
  /** Play the one orchestrated motion: lanes rise in one by one, 120 ms apart. */
  reveal: boolean;
}) {
  const reduce = useReducedMotion();
  const { persona, latest, result } = lane;
  const headingId = `lane-${persona.id}`;
  const hue = personaLook(persona, order).hue[1];
  const tone = result ? OUTCOME_TONE[result.outcome] : null;
  const mood = result ? moodForOutcome(result.outcome) : moodForConfusion(latest?.confusion);
  const phone = persona.viewport === "mobile";

  const where = result ? outcomeSentence(result) : latest ? `On ${latest.path}` : "Opening the site";
  const animateIn = reveal && !reduce;

  return (
    <motion.li
      className="min-w-0"
      initial={animateIn ? { opacity: 0, y: 28 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: animateIn ? order * 0.12 : 0, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <motion.article
        aria-labelledby={headingId}
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-[22px] border border-night-line bg-night-2/85 p-3.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur transition-colors duration-300 hover:border-white/20"
      >
        {/* a wash of the persona's colour at the top of the card */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
          style={{ background: `radial-gradient(ellipse 80% 100% at 20% 0%, color-mix(in srgb, ${hue} 22%, transparent), transparent 70%)` }}
        />

        <header className="relative flex items-center gap-3">
          <span className="relative shrink-0">
            <PersonaAvatar persona={persona} index={order} size={52} mood={mood} look={result ? undefined : { x: 0.2, y: 0.7 }} />
            {!result ? (
              <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-60 motion-reduce:hidden" />
                <span className="relative h-3 w-3 rounded-full border-2 border-night-2 bg-lime" />
              </span>
            ) : null}
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="display truncate text-17 font-semibold text-white">
              {persona.name}, {persona.age}
            </h2>
            <p className="line-clamp-2 text-[12.5px] leading-snug text-white/70" title={persona.archetype}>
              {persona.archetype}
              {viewportSuffix(persona.archetype, persona.viewport)}
            </p>
          </div>
        </header>

        <p
          className={`relative -mt-1 flex min-w-0 items-center gap-2 text-[12px] leading-snug ${tone ? `font-semibold ${tone.text}` : "text-white/75"}`}
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone ? "bg-current" : "bg-lime shadow-[0_0_8px_rgba(212,255,63,0.9)]"}`}
          />
          <span className="min-w-0 truncate" title={where}>
            {where}
          </span>
        </p>

        <div className="relative">
          <LaneFrame
            src={latest ? fileUrl(runId, latest.screenshot) : null}
            alt={latest?.see ? `What ${persona.name} sees: ${latest.see}` : `${persona.name}'s screen at step ${latest?.index ?? 0}`}
            viewport={persona.viewport}
            emptyLabel={phone ? "Opening" : "Opening the site…"}
            hue={hue}
            path={latest?.path}
            device={
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-white/70">
                <DeviceIcon phone={phone} />
                {phone ? "Phone" : "Desktop"}
              </span>
            }
            overlay={
              <AnimatePresence>
                {result && tone ? (
                  <motion.div
                    key="stamp"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <span
                      className="absolute inset-0 top-6"
                      style={{ background: `linear-gradient(to top, color-mix(in srgb, ${tone.tint} 20%, transparent), transparent 45%)` }}
                    />
                    <motion.span
                      className={`absolute right-2 bottom-2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.7)] ${tone.stamp}`}
                      initial={reduce ? false : { scale: 0.4, rotate: -12, opacity: 0 }}
                      animate={{ scale: 1, rotate: -3, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.1 }}
                    >
                      {OUTCOME_LABEL[result.outcome]}
                    </motion.span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            }
          />
        </div>

        <div className="relative sm:min-h-[96px]">
          <AnimatePresence mode="wait" initial={false}>
            {latest ? (
              <motion.div
                key={latest.index}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, transition: { duration: 0.14 } }}
                transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                className="relative rounded-[16px] rounded-tl-[6px] border border-white/10 bg-white/[0.07] px-3.5 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-[5px] left-4 h-2.5 w-2.5 rotate-45 border-t border-l border-white/10 bg-[#282a37]"
                />
                <p className="voice text-17 leading-[1.3] text-white">
                  <span aria-hidden="true">&ldquo;</span>
                  {latest.inner_voice}
                  <span aria-hidden="true">&rdquo;</span>
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="waiting"
                exit={{ opacity: 0 }}
                className="rounded-[16px] border border-dashed border-white/15 px-3.5 py-3 text-13 text-white/65"
              >
                Waiting for the first step.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {latest ? (
          <div className="relative mt-auto flex flex-col gap-2.5 border-t border-white/[0.07] pt-3">
            <LaneMeter level={latest.confusion} />
            <p className="text-13 leading-snug text-white/85">{latest.action}</p>
            <p className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/65">
              <span className="font-semibold text-white/85 tabular-nums">Step {latest.index}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/35" />
              <span className="truncate">{latest.model}</span>
            </p>
          </div>
        ) : null}
      </motion.article>
    </motion.li>
  );
}

function DeviceIcon({ phone }: { phone: boolean }) {
  return phone ? (
    <svg aria-hidden="true" width="9" height="12" viewBox="0 0 9 12" fill="none">
      <rect x="0.75" y="0.75" width="7.5" height="10.5" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 9.2h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="13" height="11" viewBox="0 0 13 11" fill="none">
      <rect x="0.75" y="0.75" width="11.5" height="7.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 10.3h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
