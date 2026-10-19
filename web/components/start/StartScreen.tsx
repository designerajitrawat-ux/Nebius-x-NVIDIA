"use client";

import { useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { FALLBACK_SAMPLES } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { useHealth } from "@/lib/useResource";
import { StartForm } from "./StartForm";
import { WhatHappens } from "./WhatHappens";

export function StartScreen() {
  const health = useHealth();
  const [budgetExhausted, setBudgetExhausted] = useState(false);

  const h = health.status === "ready" ? health.data : null;
  const demoMode = budgetExhausted || h?.budget.state === "hard";
  const samples = h && h.samples.length > 0 ? h.samples : FALLBACK_SAMPLES;

  const status = (
    <>
      {health.status === "waking" ? (
        <p role="status" className="text-13 text-ink-2">
          Waking up the test lab… free hosting sleeps when it&rsquo;s quiet, so this can take up to a minute.
        </p>
      ) : null}
      {h?.mode === "dry_run" ? (
        <p className="text-13 text-ink-2">Dry run, persona decisions are scripted, no models are called.</p>
      ) : null}
      {h?.mode === "unconfigured" ? (
        <p className="text-13 text-ink-2">
          The test lab isn&rsquo;t configured to run new tests right now. The sample reports still work.
        </p>
      ) : null}
      {h?.budget.state === "soft" && !demoMode ? (
        <p className="text-13 text-ink-2">
          Credits are running low, so new runs may pause soon. The sample reports will stay available.
        </p>
      ) : null}
    </>
  );

  return (
    <>
      <section className="page pt-10 sm:pt-20">
        <h1 className="display text-40 font-medium tracking-[-0.025em] text-balance sm:text-56 lg:text-pretty">
          <span className="lg:block">Five AI users walk through </span>
          <span className="lg:block">your product before real ones do.</span>
        </h1>
        <div className="max-w-[720px]">
          <div className="mt-10 sm:mt-12">
            <StartForm
              samples={samples}
              demoMode={demoMode}
              onBudgetExhausted={() => setBudgetExhausted(true)}
              status={status}
            />
          </div>
        </div>
      </section>

      <WhatHappens models={h?.models} />

      <SiteFooter aside={h ? <>Credits remaining: {formatUsd(h.budget.remaining_usd)}</> : null} />
    </>
  );
}
