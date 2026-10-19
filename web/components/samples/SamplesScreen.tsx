"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { getSamples } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { useResource } from "@/lib/useResource";

export function SamplesScreen() {
  const samples = useResource("samples", getSamples);

  return (
    <>
      <div className="page pt-10 sm:pt-20">
        <h1 className="display text-28 font-medium tracking-[-0.015em] sm:text-40">Sample reports</h1>
        <p className="mt-3 max-w-[60ch] text-17 text-ink-2">
          Three small sites we built with deliberate usability flaws, each walked by five AI users. Open one to
          read the full report.
        </p>

        <div className="mt-10 sm:mt-12">
          {samples.status === "ready" ? (
            samples.data.length > 0 ? (
              <ul className="border-t border-line">
                {samples.data.map((sample, i) => (
                  <li key={`${sample.id}-${i}`} className="border-b border-line">
                    <Link
                      href={`/r/${encodeURIComponent(sample.id)}`}
                      className="group grid gap-x-6 gap-y-2 py-6 md:grid-cols-12 md:items-baseline"
                    >
                      <h2 className="display text-22 font-medium tracking-[-0.01em] text-ink md:col-span-3">
                        {sample.title}
                      </h2>
                      <div className="md:col-span-7">
                        <p className="text-17 text-ink">{sample.headline}</p>
                        <p className="mt-1 text-13 text-ink-2">
                          {sample.task} · {hostOf(sample.url)}
                        </p>
                      </div>
                      <p className="text-15 text-ink underline decoration-ink/40 decoration-1 underline-offset-[3px] group-hover:decoration-ink md:col-span-2 md:text-right">
                        Read the report
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-15 text-ink-2">No sample reports are published yet.</p>
            )
          ) : null}
          {samples.status === "waking" ? (
            <p role="status" className="text-15 text-ink-2">
              Waking up the test lab… free hosting sleeps when it&rsquo;s quiet, so this can take up to a minute.
            </p>
          ) : null}
          {samples.status === "error" ? (
            <p role="alert" className="text-15 text-ink">
              {samples.error.message}
            </p>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
