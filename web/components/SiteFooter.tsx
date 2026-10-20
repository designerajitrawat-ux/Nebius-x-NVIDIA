import type { ReactNode } from "react";
import { DesignCredit } from "./DesignCredit";

/** Quiet footer. `aside` holds page-specific facts such as credits remaining. */
export function SiteFooter({ aside }: { aside?: ReactNode }) {
  return (
    <footer className="page mt-auto pt-16 pb-10">
      <div className="flex flex-col gap-2 border-t border-ink/10 pt-6 text-13 text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="display text-15 font-semibold tracking-[-0.01em] text-ink">FiveUsers</span>
          <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-ink/25 sm:block" />
          <span>Runs on Nebius Token Factory · NVIDIA Nemotron · Tavily</span>
        </p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
          {aside ? <div className="tabular-nums">{aside}</div> : null}
          <DesignCredit />
        </div>
      </div>
    </footer>
  );
}
