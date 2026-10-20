"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { Ring, SkyBackdrop, Spark } from "@/components/report/ui";
import { SiteFooter } from "@/components/SiteFooter";
import { getSamples } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { SAMPLE_CARDS } from "@/lib/landing";
import type { SampleInfo } from "@/lib/types";
import { useResource } from "@/lib/useResource";

const TINTS = ["#e7f8c4", "#ffe2d6", "#e3e0ff"];

export function SamplesScreen() {
  const samples = useResource("samples", getSamples);
  const reduce = useReducedMotion();
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: 0.08 * i, ease: [0.2, 0.7, 0.2, 1] as const },
        };

  return (
    <div className="relative -mt-16 flex flex-1 flex-col overflow-x-clip bg-lilac sm:-mt-[72px]">
      <section aria-labelledby="samples-title" className="relative isolate overflow-hidden pt-[96px] pb-16 sm:pt-[136px] sm:pb-24">
        <SkyBackdrop />
        <div className="page relative">
          <motion.p {...rise(0)} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-13 font-medium text-ink">
            <Spark className="text-violet" />
            Real runs, real reports
          </motion.p>
          <motion.h1
            {...rise(1)}
            id="samples-title"
            className="display mt-6 max-w-[18ch] text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-56 lg:text-[4rem]"
          >
            Sample <span className="marker">reports</span>
          </motion.h1>
          <motion.p {...rise(2)} className="mt-5 max-w-[60ch] text-15 leading-relaxed text-ink-2 sm:text-17">
            Three small sites we built with deliberate usability flaws, each walked by five AI users. Open one to
            read the full report.
          </motion.p>

          <div className="mt-12 sm:mt-14">
            {samples.status === "ready" ? (
              samples.data.length > 0 ? (
                <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {samples.data.map((sample, i) => (
                    <Reveal as="li" key={`${sample.id}-${i}`} delay={i * 0.1}>
                      <SampleCard sample={sample} index={i} />
                    </Reveal>
                  ))}
                </ul>
              ) : (
                <p className="rounded-card bg-white p-6 text-15 text-ink-2 shadow-soft">No sample reports are published yet.</p>
              )
            ) : null}
            {samples.status === "loading" ? (
              <>
                <p role="status" className="sr-only">
                  Loading the sample reports…
                </p>
                <SkeletonCards />
              </>
            ) : null}
            {samples.status === "waking" ? (
              <div className="flex flex-col gap-5">
                <p role="status" className="glass self-start rounded-[16px] px-4 py-3 text-15 text-ink-2">
                  Waking up the test lab… free hosting sleeps when it&rsquo;s quiet, so this can take up to a minute.
                </p>
                <SkeletonCards />
              </div>
            ) : null}
            {samples.status === "error" ? (
              <p role="alert" className="rounded-card bg-white p-6 text-15 text-ink shadow-soft">
                {samples.error.message}
              </p>
            ) : null}
          </div>

          <Reveal className="mt-14 flex flex-col items-start gap-4 rounded-card bg-white/70 p-6 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="display text-22 font-semibold tracking-[-0.01em] text-ink">Want one for your own site?</p>
              <p className="mt-1 text-15 text-ink-2">Paste a link, say what to try, and get a report like these in about three minutes.</p>
            </div>
            <Link href="/#start" className="btn-lime shrink-0">
              Run a test
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function SampleCard({ sample, index }: { sample: SampleInfo; index: number }) {
  const reduce = useReducedMotion();
  const look = SAMPLE_CARDS.find((c) => c.id === sample.id);
  const tint = look?.tint ?? TINTS[index % TINTS.length];
  const site = look?.site ?? hostOf(sample.url);

  return (
    <motion.div whileHover={reduce ? undefined : "hover"} initial="rest" animate="rest" className="h-full">
      <Link
        href={`/r/${encodeURIComponent(sample.id)}`}
        className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-soft transition-shadow duration-300 hover:shadow-float"
      >
        <div className="relative h-[200px] overflow-hidden" style={{ background: tint }}>
          <div aria-hidden="true" className="grid-lines absolute inset-0 opacity-50" />
          <motion.div
            className="absolute inset-x-6 top-6 overflow-hidden rounded-[12px] bg-white shadow-float"
            variants={{ rest: { y: 0, rotate: -2 }, hover: { y: -8, rotate: 0 } }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
          >
            <div className="flex h-5 items-center gap-1 border-b border-lilac-2 px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
            </div>
            {look ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={look.image} alt="" className="block aspect-[1.6] w-full object-cover object-top" />
            ) : (
              <div className="grid aspect-[1.6] w-full place-items-center bg-mist px-4 text-center text-13 text-ink-2">{hostOf(sample.url)}</div>
            )}
          </motion.div>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-22 font-semibold tracking-[-0.01em] text-ink">{sample.title}</h2>
            <Ring completed={sample.completed} total={sample.total} />
          </div>
          <p className="mt-1 text-13 text-ink-2">{site}</p>
          <p className="mt-4 text-15 leading-relaxed text-ink">{sample.headline}</p>
          <p className="mt-3 text-13 text-ink-2">
            <span className="font-medium text-ink">Task: </span>
            {sample.task}
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-15 font-semibold text-violet">
            Open report
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonCards() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-5 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-card bg-white/70 shadow-soft">
          <div className="h-[200px] bg-white/60" />
          <div className="space-y-3 p-6">
            <div className="h-6 w-1/2 rounded-full bg-lilac" />
            <div className="h-4 w-3/4 rounded-full bg-lilac" />
            <div className="h-4 w-2/3 rounded-full bg-lilac" />
          </div>
        </div>
      ))}
    </div>
  );
}
