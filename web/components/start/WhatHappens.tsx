import { SectionHeading } from "@/components/SectionHeading";
import { TIER_FALLBACK_LABEL } from "@/lib/labels";
import type { Health } from "@/lib/types";

type Models = Health["models"] | undefined;

function label(models: Models, tier: keyof typeof TIER_FALLBACK_LABEL): string {
  return models?.[tier]?.label || TIER_FALLBACK_LABEL[tier];
}

/** Four steps, each with the one line that says who does the work. */
export function WhatHappens({ models }: { models: Models }) {
  const steps = [
    { title: "Recruit five personas", by: `Tavily research · ${label(models, "agent")}` },
    {
      title: "Each one walks your site",
      by: `In a real browser · ${label(models, "vision")} sees, ${label(models, "agent")} decides`,
    },
    { title: "Expert review", by: `${label(models, "vision")} · accessibility checks` },
    { title: "Report with fixes", by: `${label(models, "reason")} writes it` },
  ];

  return (
    <section aria-labelledby="what-happens" className="page mt-20 sm:mt-24">
      <SectionHeading id="what-happens">What happens</SectionHeading>
      <ol className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span aria-hidden="true" className="display w-4 shrink-0 text-15 leading-[1.5] text-ink-2 tabular-nums">
              {i + 1}
            </span>
            <div className="max-w-[34ch]">
              <h3 className="text-15 font-medium text-ink">{step.title}</h3>
              <p className="mt-1 text-13 text-ink-2">{step.by}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
