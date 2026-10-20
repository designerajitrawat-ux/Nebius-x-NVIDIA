"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { useState } from "react";
import { CAST, SHOWCASE, type ShowcaseIssue } from "@/lib/landing";
import { Blob } from "./Blob";
import { Reveal, SectionIntro } from "./Reveal";

const SEVERITY = {
  critical: "bg-[#ff4d4d] text-white",
  major: "bg-[#ff8a3d] text-white",
  minor: "bg-[#f2b705] text-ink",
} as const;

const FIX_LABEL = { copy: "Copy fix", css: "CSS fix", flow: "Flow fix" } as const;

export function ReportPreview() {
  const lead = SHOWCASE.lead;
  const margaret = CAST.find((c) => c.id === "margaret")!;
  return (
    <section aria-labelledby="report-title" className="page py-16 sm:py-24">
      <SectionIntro
        id="report-title"
        eyebrow="What you get"
        title={
          <>
            Not a score. A <span className="marker">fix list</span> your team can ship today.
          </>
        }
        lede="Every issue is pinned on the screen where it happened, backed by what a persona actually thought, and comes with the change to make. This one is straight from our Signup sample report."
      />

      <Reveal className="mt-14">
        <div className="grid overflow-hidden rounded-[28px] bg-white shadow-float lg:grid-cols-[1.25fr_1fr]">
          <div className="relative bg-lilac p-4 sm:p-8">
            <div className="overflow-hidden rounded-[14px] bg-white shadow-soft">
              <div className="flex h-8 items-center gap-1.5 border-b border-lilac-2 px-3">
                <span className="h-2 w-2 rounded-full bg-ink/15" />
                <span className="h-2 w-2 rounded-full bg-ink/15" />
                <span className="h-2 w-2 rounded-full bg-ink/15" />
                <span className="ml-2 text-[11px] text-ink-2">fernhill.app/signup · Margaret, step 9</span>
              </div>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.image} alt="The signup form asks for card number, expiry and CVC before the account is created. Pin 1 marks the Submit button." className="block w-full" />
                <PulsePin x={lead.pin.x} y={lead.pin.y} />
              </div>
            </div>
            <p className="hand mt-4 -rotate-2 text-center text-[22px] text-violet">the pin comes from the page itself, not a guess</p>
          </div>

          <div className="flex flex-col p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${SEVERITY[lead.severity]}`}>
                {lead.severity}
              </span>
              <span className="rounded-full bg-lilac px-2.5 py-1 text-[11px] font-medium text-ink-2">Signup · hit 2 of 5 users</span>
            </div>
            <h3 className="display mt-4 text-28 font-semibold tracking-[-0.02em] text-ink">{lead.title}</h3>
            <p className="mt-3 text-15 leading-relaxed text-ink-2">{lead.why}</p>

            <figure className="mt-6 flex gap-3 rounded-[18px] bg-mist p-4">
              <Blob hue={margaret.hue} size={46} mood="worried" look={{ x: 0.6, y: -0.2 }} accessory="glasses" />
              <div>
                <blockquote className="voice text-17 leading-snug text-ink">&ldquo;{lead.quote}&rdquo;</blockquote>
                <figcaption className="mt-1 text-13 text-ink-2">{lead.quoteBy}, during the run</figcaption>
              </div>
            </figure>

            <FixToggle issue={lead} />

            <Link href="/r/sample-signup" className="btn-ink mt-8 self-start">
              Open the full report
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Reveal>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {SHOWCASE.more.map((issue, i) => (
          <Reveal key={issue.title} delay={0.1 * i}>
            <MiniIssue issue={issue} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PulsePin({ x, y }: { x: number; y: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden="true" className="absolute" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
      {!reduce ? (
        <motion.span
          className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4d4d]"
          animate={{ scale: [0.6, 1.8], opacity: [0.45, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
      <span className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#ff4d4d] text-15 font-semibold text-white shadow-[0_0_0_5px_rgba(255,255,255,0.9),0_8px_18px_-4px_rgba(255,77,77,0.8)]">
        1
      </span>
    </span>
  );
}

/** Before/after switch: the fix is the product, so it gets the one interactive control in the card. */
function FixToggle({ issue }: { issue: ShowcaseIssue }) {
  const [side, setSide] = useState<"before" | "after">("after");
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-13 font-semibold text-ink">
          {FIX_LABEL[issue.fixType]} <span className="font-normal text-ink-2">· {issue.fixSummary}</span>
        </p>
      </div>
      <div role="tablist" aria-label="Before and after" className="mt-3 inline-flex rounded-full bg-lilac p-1">
        {(["before", "after"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={side === s}
            onClick={() => setSide(s)}
            className="relative h-8 rounded-full px-4 text-13 font-medium capitalize transition-colors"
          >
            {side === s ? (
              <motion.span
                layoutId="fix-tab"
                className={`absolute inset-0 rounded-full ${s === "after" ? "bg-lime" : "bg-white"} shadow-soft`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
            <span className={`relative ${side === s ? "text-ink" : "text-ink-2"}`}>{s}</span>
          </button>
        ))}
      </div>
      <div className="relative mt-3 min-h-[84px]" role="tabpanel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={side}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`rounded-[14px] px-4 py-3 text-15 leading-relaxed ${
              side === "after" ? "bg-[#f3ffd6] text-ink" : "bg-[#fff1ef] text-ink"
            }`}
          >
            <span className={`mr-2 font-mono font-semibold ${side === "after" ? "text-[#4d7c0f]" : "text-[#c0392b]"}`}>
              {side === "after" ? "+" : "-"}
            </span>
            {side === "after" ? issue.after : issue.before}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function MiniIssue({ issue }: { issue: ShowcaseIssue }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex h-full flex-col rounded-card bg-white p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${SEVERITY[issue.severity]}`}>
          {issue.severity}
        </span>
        <span className="rounded-full bg-lilac px-2.5 py-1 text-[11px] font-medium text-ink-2">{issue.flow} sample</span>
      </div>
      <h3 className="display mt-3 text-22 font-semibold tracking-[-0.01em] text-ink">{issue.title}</h3>
      <p className="mt-2 text-15 leading-relaxed text-ink-2">{issue.why}</p>
      <blockquote className="voice mt-4 text-17 leading-snug text-ink">
        &ldquo;{issue.quote}&rdquo; <span className="font-sans text-13 not-italic text-ink-2">{issue.quoteBy}</span>
      </blockquote>
      <div className="mt-auto pt-5">
        <p className="text-13 font-semibold text-ink">
          {FIX_LABEL[issue.fixType]} <span className="font-normal text-ink-2">· {issue.fixSummary}</span>
        </p>
        {issue.fixType === "css" ? (
          <pre className="mt-2 overflow-x-auto rounded-[12px] bg-night px-4 py-3 font-mono text-[12px] leading-relaxed text-lime">
            {issue.after}
          </pre>
        ) : (
          <p className="mt-2 rounded-[12px] bg-[#f3ffd6] px-4 py-3 text-13 leading-relaxed text-ink">
            <span className="mr-1.5 font-mono font-semibold text-[#4d7c0f]">+</span>
            {issue.after}
          </p>
        )}
      </div>
    </motion.article>
  );
}
