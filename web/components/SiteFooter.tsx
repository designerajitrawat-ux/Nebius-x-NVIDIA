import type { ReactNode } from "react";

/** Hairline footer. `aside` holds page-specific facts such as credits remaining. */
export function SiteFooter({ aside }: { aside?: ReactNode }) {
  return (
    <footer className="page mt-auto pt-16 pb-8">
      <div className="flex flex-col gap-1 border-t border-line pt-4 text-13 text-ink-2 sm:flex-row sm:items-baseline sm:justify-between">
        <p>Runs on Nebius Token Factory · NVIDIA Nemotron · Tavily</p>
        {aside ? <div className="tabular-nums">{aside}</div> : null}
      </div>
    </footer>
  );
}
