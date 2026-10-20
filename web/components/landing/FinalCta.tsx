"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import Link from "next/link";
import { CAST } from "@/lib/landing";
import { Blob } from "./Blob";
import { Reveal } from "./Reveal";

/** Closing panel: one line, one button, the five testers bouncing like they're ready to go. */
export function FinalCta() {
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="cta-title" className="page pb-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-violet/40 blur-[100px]" />
            <div className="absolute -bottom-32 left-1/3 h-[260px] w-[420px] rounded-full bg-lime/25 blur-[100px]" />
          </div>
          <div aria-hidden="true" className="relative flex justify-center gap-3">
            {CAST.map((p, i) => (
              <motion.span
                key={p.id}
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 2.4, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
              >
                <Blob hue={p.hue} size={60} mood={i % 2 ? "happy" : "excited"} look={{ x: 0, y: -0.4 }} accessory={p.accessory} />
              </motion.span>
            ))}
          </div>
          <h2 id="cta-title" className="display relative mx-auto mt-10 max-w-[18ch] text-40 font-semibold tracking-[-0.03em] text-balance text-white sm:text-56">
            Your users are about to try it. <span className="text-lime">Let five go first.</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-[52ch] text-17 text-white/70">
            One link, one task, about three minutes. No signup, no SDK, nothing to install on your site.
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#start" className="btn-lime">
              Run a free test
              <span aria-hidden="true">→</span>
            </a>
            <Link href="/samples" className="inline-flex h-[52px] items-center rounded-full px-6 text-15 font-medium text-white/85 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white">
              Browse sample reports
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
