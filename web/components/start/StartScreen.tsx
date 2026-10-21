"use client";

import { useEffect, useState } from "react";
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
import { getHealth } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { StartForm } from "./StartForm";

export function StartScreen() {
  // The API sleeps when idle and every wake-up costs hosting credit, so only call it once someone starts
  // filling in the form. It warms up while they type.
  const [engaged, setEngaged] = useState(false);
  const health = useResource(engaged ? "health" : null, getHealth);
  const [budgetExhausted, setBudgetExhausted] = useState(false);
  // A cold start takes seconds. If the lab is still silent after a minute it is down (or out of hosting
  // credit for the month), so say so instead of "waking up" forever.
  const [unreachable, setUnreachable] = useState(false);
  useEffect(() => {
    if (health.status !== "waking") return;
    const timer = setTimeout(() => setUnreachable(true), 60_000);
    return () => clearTimeout(timer);
  }, [health.status]);

  const h = health.status === "ready" ? health.data : null;
  const demoMode = budgetExhausted || h?.budget.state === "hard";
  const samples = h && h.samples.length > 0 ? h.samples : FALLBACK_SAMPLES;

  const status = (
    <>
      {health.status === "waking" && !unreachable ? (
        <p role="status" className="text-13 text-ink-2">
          Waking up the test lab… it sleeps when it&rsquo;s quiet, so this can take a few seconds.
        </p>
      ) : null}
      {health.status === "waking" && unreachable ? (
        <p role="status" className="text-13 text-ink-2">
          The test lab isn&rsquo;t answering right now, so new tests can&rsquo;t start. The sample reports below
          still work.
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
              onActivity={(activity) => {
                if (activity !== "idle") setEngaged(true);
                onActivity(activity);
              }}
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
