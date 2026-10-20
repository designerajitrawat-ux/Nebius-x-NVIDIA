"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { MouseEvent, ReactNode } from "react";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { formatCost, formatDate, formatDuration, plural } from "@/lib/format";
import { OUTCOME_LABEL, outcomeTone, SEVERITY_LABEL, viewportSuffix } from "@/lib/labels";
import { moodForOutcome } from "@/lib/personaLook";
import type { Report, Severity } from "@/lib/types";
import { ReportActions } from "./ReportActions";
import { OutcomeChip, Ring, SEVERITY_DOT, SkyBackdrop, Spark } from "./ui";

const SEVERITIES: Severity[] = ["critical", "major", "minor"];

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.07 * i, ease: [0.2, 0.7, 0.2, 1] as const } }),
};

/** "1 of 5 users could not..." gets the lime marker on the count, like the landing headline. */
function Headline({ text }: { text: string }) {
  const m = /^(\d+ of \d+ (?:users?|personas?|people))(.*)$/i.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="marker">{m[1]}</span>
      {m[2]}
    </>
  );
}

export function ReportHero({ report, sections }: { report: Report; sections: { id: string; label: string; count?: number }[] }) {
  const reduce = useReducedMotion();
  const anim = (i: number) => (reduce ? {} : { variants: rise, initial: "hidden" as const, animate: "show" as const, custom: i });

  const isSample = report.id.startsWith("sample-");
  const notFinished = report.personas.filter((p) => p.outcome !== "completed");
  const failedCount = Math.max(0, report.total - report.completed);
  const failedWord = notFinished.every((p) => p.outcome === "gave_up") ? "gave up" : "did not finish";
  const severityCounts = SEVERITIES.map((s) => ({ s, n: report.issues.filter((i) => i.severity === s).length })).filter(({ n }) => n > 0);
  const modelCalls = report.usage.rows.filter((r) => r.tier !== "tavily").reduce((n, r) => n + r.calls, 0);
  const longest = report.personas.reduce((m, p) => Math.max(m, p.seconds), 0);
  const dry = report.mode === "dry_run";

  return (
    <header className="relative isolate overflow-hidden pt-[96px] pb-14 sm:pt-[136px] sm:pb-20">
      <SkyBackdrop />
      <div className="page relative">
        <motion.div {...anim(0)} className="flex flex-wrap items-center gap-2">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-13 font-medium text-ink">
            <Spark className="text-violet" />
            {isSample ? "Sample report" : dry ? "Dry run report" : "Live test report"}
          </span>
          <a
            href={report.url}
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-13 text-ink-2 transition-colors hover:text-ink"
          >
            <GlobeIcon />
            <span className="min-w-0 truncate">{report.site}</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens the tested site in a new tab)</span>
          </a>
          <span className="glass inline-flex items-center rounded-full px-3.5 py-1.5 text-13 text-ink-2">
            <time dateTime={new Date(report.created_at * 1000).toISOString()}>{formatDate(report.created_at)}</time>
          </span>
        </motion.div>

        <motion.h1
          {...anim(1)}
          className="display mt-6 max-w-[22ch] text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-56 lg:text-[4rem]"
        >
          <Headline text={report.headline} />
        </motion.h1>

        {report.subline ? (
          <motion.p {...anim(2)} className="mt-5 max-w-[64ch] text-15 leading-relaxed text-ink-2 sm:text-17">
            {report.subline}
          </motion.p>
        ) : null}

        <motion.div {...anim(3)} className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="inline-flex max-w-full items-start gap-2.5 self-start rounded-[16px] bg-white/80 px-4 py-2.5 text-15 text-ink shadow-soft">
            <FlagIcon />
            <span className="min-w-0">
              <span className="text-ink-2">Task: </span>
              {report.task}
            </span>
          </p>
          <ReportActions report={report} />
        </motion.div>

        {/* stats */}
        <motion.dl {...anim(4)} className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
          <Stat className="col-span-2 lg:col-span-1" label="Finished the task">
            <div className="flex items-center gap-4">
              <Ring completed={report.completed} total={report.total} size={64} />
              <div>
                <p className="display text-28 leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
                  {report.completed} of {report.total}
                </p>
                <p className="mt-1.5 text-13 text-ink-2">
                  finished · {failedCount} {failedWord}
                </p>
              </div>
            </div>
          </Stat>
          <Stat label="Issues found">
            <p className="display text-28 leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">{report.issues.length}</p>
            {severityCounts.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-13 text-ink-2" aria-label="Issues by severity">
                {severityCounts.map(({ s, n }) => (
                  <li key={s} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${SEVERITY_DOT[s]}`} />
                    {n} {SEVERITY_LABEL[s].toLowerCase()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 text-13 text-ink-2">none worth reporting</p>
            )}
          </Stat>
          <Stat label="Model cost">
            <p className="display text-28 leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {formatCost(report.usage.total_cost_usd)}
            </p>
            <p className="mt-2.5 text-13 text-ink-2">{plural(modelCalls, "model call")}</p>
          </Stat>
          <Stat label="Longest walk">
            <p className="display text-28 leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {longest > 0 ? formatDuration(longest) : "n/a"}
            </p>
            <p className="mt-2.5 text-13 text-ink-2">personas walk in parallel</p>
          </Stat>
          <Stat label="Mode">
            <p className="display flex items-center gap-2 text-22 leading-none font-semibold tracking-[-0.02em] text-ink">
              <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
                {!dry ? <span className="absolute inset-0 animate-ping rounded-full bg-p-mint opacity-60 [animation-duration:2s]" /> : null}
                <span className={`relative h-2.5 w-2.5 rounded-full ${dry ? "bg-ink-2" : "bg-p-mint"}`} />
              </span>
              {dry ? "Dry run" : "Live"}
            </p>
            <p className="mt-2.5 text-13 text-ink-2">{dry ? "scripted, no models" : report.degraded ? "Nemotron, with a fallback" : "NVIDIA Nemotron on Nebius"}</p>
          </Stat>
        </motion.dl>

        {dry || report.degraded ? (
          <motion.div {...anim(5)} className="mt-3 flex flex-col gap-2">
            {dry ? <Notice>Dry run: persona decisions were scripted, and no models were called.</Notice> : null}
            {report.degraded ? <Notice>Written by Nemotron Super because Ultra was unavailable.</Notice> : null}
          </motion.div>
        ) : null}

        {/* the cast */}
        <motion.div {...anim(5)} className="mt-3 rounded-card bg-white/85 p-4 shadow-soft backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[12px] font-semibold tracking-[0.1em] text-violet uppercase">The testers</p>
            <p className="text-13 text-ink-2">Pick one to read their walk, step by step.</p>
          </div>
          <ul
            aria-label="Outcome per persona"
            className="-mx-4 mt-4 flex snap-x snap-mandatory gap-1 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5"
          >
            {report.personas.map((p, index) => (
              <li key={p.id} className="w-[132px] shrink-0 snap-start sm:w-auto">
                <CastLink id={p.id}>
                  <PersonaAvatar persona={p} index={index} size={60} mood={moodForOutcome(p.outcome)} />
                  <span className="mt-2 block text-15 font-semibold text-ink">{p.name}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-2">
                    {p.archetype}
                    {viewportSuffix(p.archetype, p.viewport)}
                  </span>
                  <span className="mt-2.5 block">
                    <OutcomeChip ok={outcomeTone(p.outcome) === "ok"}>{OUTCOME_LABEL[p.outcome]}</OutcomeChip>
                  </span>
                </CastLink>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.nav {...anim(6)} aria-label="Report sections" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/60 px-3.5 text-13 font-medium text-ink-2 ring-1 ring-white transition-colors hover:bg-white hover:text-ink"
                >
                  {s.label}
                  {s.count !== undefined ? (
                    <span className="rounded-full bg-lilac px-1.5 py-px text-[11px] font-semibold text-ink tabular-nums">{s.count}</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>
      </div>
    </header>
  );
}

function Stat({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card bg-white/85 p-4 shadow-soft backdrop-blur sm:p-5 ${className}`}>
      <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase">{label}</dt>
      <dd className="mt-3">{children}</dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-start gap-2 self-start rounded-[14px] bg-[#fff6dc] px-3.5 py-2 text-13 text-warn-ink ring-1 ring-[#ffe2a0]">
      <span aria-hidden="true" className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-p-amber" />
      {children}
    </p>
  );
}

/** A cast member that glides to their row further down. */
function CastLink({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(`persona-${id}`);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#persona-${id}`);
  }
  return (
    <motion.a
      href={`#persona-${id}`}
      onClick={onClick}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="flex h-full flex-col items-center rounded-[18px] px-2 pt-3 pb-3.5 text-center transition-colors duration-200 hover:bg-mist"
    >
      {children}
    </motion.a>
  );
}

function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.8 8h12.4M8 1.7c1.8 1.8 2.6 3.9 2.6 6.3S9.8 12.5 8 14.3M8 1.7C6.2 3.5 5.4 5.6 5.4 8s.8 4.5 2.6 6.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="mt-[3px] shrink-0 text-violet">
      <path d="M3.5 14.5v-12M3.5 2.8h8.2l-1.7 3 1.7 3H3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
