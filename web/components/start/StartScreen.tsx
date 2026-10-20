"use client";

import { useState } from "react";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MeetTheFive } from "@/components/landing/MeetTheFive";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { Samples } from "@/components/landing/Samples";
import { StackMarquee } from "@/components/landing/StackMarquee";
import { UnderTheHood } from "@/components/landing/UnderTheHood";
import { WatchRun } from "@/components/landing/WatchRun";
import { SiteFooter } from "@/components/SiteFooter";
import { FALLBACK_SAMPLES } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { useHealth } from "@/lib/useResource";
import { StartForm } from "./StartForm";

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
        <p className="text-13 text-ink-2">Dry run: persona decisions are scripted, and no models are called.</p>
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
    <div className="relative -mt-16 overflow-x-clip bg-lilac sm:-mt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(ellipse_at_70%_10%,#ffffff_0%,transparent_55%),radial-gradient(ellipse_at_10%_40%,#f6f3ff_0%,transparent_50%)]" />
      <div className="relative">
        <Hero
          form={(onActivity) => (
            <StartForm
              samples={samples}
              demoMode={demoMode}
              onBudgetExhausted={() => setBudgetExhausted(true)}
              status={status}
              onActivity={onActivity}
            />
          )}
        />
        <StackMarquee />
        <WatchRun />
        <HowItWorks />
        <MeetTheFive />
        <ReportPreview />
        <UnderTheHood models={h?.models} />
        <Samples />
        <FinalCta />
        <SiteFooter aside={h ? <>Credits remaining: {formatUsd(h.budget.remaining_usd)}</> : null} />
      </div>
    </div>
  );
}
