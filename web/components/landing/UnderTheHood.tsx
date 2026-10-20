"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { RUN_FACTS } from "@/lib/landing";
import type { Health } from "@/lib/types";
import { Reveal, SectionIntro } from "./Reveal";

type Models = Health["models"] | undefined;

const STAGES = [
  { tier: "fast", fallback: "Nemotron 3.5 Lightning", role: "Reads your site and names its category", when: "Preparing", color: "#38b6ff" },
  { tier: "tavily", fallback: "Tavily", role: "Researches who uses products like yours and what they hate", when: "Recruiting", color: "#ffb627" },
  { tier: "agent", fallback: "Nemotron 3 Super", role: "Writes the five personas, then decides every click and keystroke with tool calls", when: "Recruiting · Testing", color: "#8b7bff" },
  { tier: "vision", fallback: "Nemotron 3.5 Super VL", role: "Looks at every screenshot as that persona, checks every “done”, reviews each screen", when: "Testing · Reviewing", color: "#22c997" },
  { tier: "reason", fallback: "Nemotron 3 Ultra", role: "Reads the whole run and writes the issues, quotes and fixes", when: "Writing", color: "#d4ff3f" },
] as const;

export function UnderTheHood({ models }: { models: Models }) {
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="hood-title" className="relative overflow-hidden bg-night py-20 text-white sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-violet/30 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[380px] w-[380px] rounded-full bg-lime/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="page relative">
        <SectionIntro
          dark
          id="hood-title"
          eyebrow="Under the hood"
          title={
            <>
              Every step runs on <span className="text-lime">NVIDIA Nemotron</span>, served by Nebius Token Factory.
            </>
          }
          lede="Four Nemotron models, each on the job it's best at, plus Tavily for live research. One run is a real multi-step agent workflow, not a single prompt."
        />

        <ol className="relative mt-14 grid gap-3">
          {/* the wire the run travels along */}
          <span aria-hidden="true" className="absolute top-6 bottom-6 left-[27px] w-px bg-gradient-to-b from-p-sky via-violet to-lime opacity-50 sm:left-[31px]" />
          {!reduce ? (
            <motion.span
              aria-hidden="true"
              className="absolute left-[24px] h-2 w-2 rounded-full bg-lime shadow-[0_0_14px_4px_rgba(212,255,63,0.7)] sm:left-[28px]"
              animate={{ top: ["4%", "94%"] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            />
          ) : null}
          {STAGES.map((s, i) => {
            const label = s.tier === "tavily" ? s.fallback : models?.[s.tier]?.label || s.fallback;
            const id = s.tier === "tavily" ? "api.tavily.com" : models?.[s.tier]?.id;
            return (
              <Reveal as="li" key={s.tier} delay={i * 0.08}>
                <div className="group relative flex items-start gap-4 rounded-[20px] border border-night-line bg-night-2/70 p-4 backdrop-blur transition-colors duration-300 hover:border-white/25 sm:items-center sm:gap-6 sm:p-5">
                  <span
                    className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full sm:h-8 sm:w-8"
                    style={{ background: `color-mix(in srgb, ${s.color} 25%, transparent)`, boxShadow: `0 0 0 1px ${s.color}` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                    <div>
                      <p className="display text-17 font-semibold text-white">{label}</p>
                      {id ? <p className="truncate font-mono text-[11px] text-white/45">{id}</p> : null}
                    </div>
                    <p className="text-15 text-white/75">{s.role}</p>
                    <span className="w-fit rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60">{s.when}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-night-line bg-night-line lg:grid-cols-4">
          {RUN_FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.06} className="bg-night-2 p-6">
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="display block text-40 font-semibold tracking-[-0.03em] text-lime sm:text-56">{f.value}</span>
                <span className="mt-1 block text-13 text-white/60">{f.label}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
