import { formatCost, formatTokens } from "@/lib/format";
import { TIER_ORDER, TIER_ROLE } from "@/lib/labels";
import type { Reference, Usage } from "@/lib/types";
import { RefCard } from "./ui";

const TIER_COLOR: Record<string, string> = {
  fast: "#38b6ff",
  vision: "#22c997",
  agent: "#8b7bff",
  reason: "#d4ff3f",
  tavily: "#ffb627",
  dry: "#9aa0a6",
};

/** Which Nemotron did what in this run, with calls, tokens and cost. Sits on the dark "lab" card. */
export function ModelUsage({ usage, research }: { usage: Usage; research: Reference[] }) {
  const rank = (tier: string) => {
    const i = TIER_ORDER.indexOf(tier);
    return i === -1 ? TIER_ORDER.length : i;
  };
  const rows = [...usage.rows].sort((a, b) => rank(a.tier) - rank(b.tier));
  const hasTavilyRow = rows.some((r) => r.tier === "tavily");
  const modelRows = rows.filter((r) => r.tier !== "tavily");
  const calls = modelRows.reduce((n, r) => n + r.calls, 0);
  const tokensIn = modelRows.reduce((n, r) => n + r.prompt_tokens, 0);
  const tokensOut = modelRows.reduce((n, r) => n + r.completion_tokens, 0);

  const facts = [
    { value: formatCost(usage.total_cost_usd), label: "total cost of this run" },
    { value: String(calls), label: "model calls" },
    { value: `${formatTokens(tokensIn)} / ${formatTokens(tokensOut)}`, label: "tokens in / out" },
    { value: String(usage.tavily_calls), label: usage.tavily_calls === 1 ? "Tavily search" : "Tavily searches" },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-night-line bg-night-line lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-night-2 p-4 sm:p-5">
            <dt className="sr-only">{f.label}</dt>
            <dd>
              <span className="display block text-28 font-semibold tracking-[-0.02em] text-lime tabular-nums sm:text-40">{f.value}</span>
              <span className="mt-1 block text-13 text-white/60">{f.label}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 overflow-x-auto rounded-[20px] border border-night-line bg-night-2/70">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Model usage for this run</caption>
          <thead>
            <tr className="border-b border-night-line text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">
              <th scope="col" className="py-3 pr-4 pl-4 font-semibold sm:pl-5">
                Model
              </th>
              <th scope="col" className="hidden py-3 pr-4 font-semibold lg:table-cell">
                What it did
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold sm:pr-4">
                Calls
              </th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold sm:pr-4">
                Tokens <span className="hidden sm:inline">in / out</span>
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold sm:pr-5">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => {
              const isSearch = row.tier === "tavily";
              const role = TIER_ROLE[row.tier];
              const color = TIER_COLOR[row.tier] ?? "#ffffff";
              return (
                <tr key={`${row.tier}-${row.model}`} className="border-b border-night-line align-top last:border-b-0">
                  <th scope="row" className="py-4 pr-4 pl-4 font-normal sm:pl-5">
                    <span className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full"
                        style={{ background: `color-mix(in srgb, ${color} 25%, transparent)`, boxShadow: `0 0 0 1px ${color}` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      </span>
                      <span className="min-w-0">
                        <span className="display block text-15 font-semibold text-white">{row.label || row.model}</span>
                        {row.label && row.model !== row.label ? (
                          <span className="mt-0.5 block font-mono text-[11px] break-all text-white/40">{row.model}</span>
                        ) : null}
                        {role ? <span className="mt-1 block text-13 text-white/60 lg:hidden">{role}</span> : null}
                      </span>
                    </span>
                  </th>
                  <td className="hidden max-w-[44ch] py-4 pr-4 text-15 text-white/70 lg:table-cell">{role ?? "-"}</td>
                  <td className="py-4 pr-3 text-right text-15 text-white sm:pr-4">{row.calls}</td>
                  <td className="py-4 pr-3 text-right text-15 text-white sm:pr-4">
                    {isSearch ? (
                      "n/a"
                    ) : (
                      <>
                        <span className="block sm:inline">{formatTokens(row.prompt_tokens)}</span>
                        <span className="hidden text-white/40 sm:inline"> / </span>
                        <span className="block text-white/60 sm:inline sm:text-white">{formatTokens(row.completion_tokens)}</span>
                      </>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-right text-15 text-white sm:pr-5">
                    {isSearch && row.cost_usd === 0 ? "n/a" : formatCost(row.cost_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="tabular-nums">
            <tr className="border-t border-night-line">
              <th scope="row" colSpan={2} className="hidden py-4 pr-4 pl-5 text-left text-15 font-medium text-white lg:table-cell">
                Total cost of this run
              </th>
              <th scope="row" className="py-4 pr-4 pl-4 text-left text-15 font-medium text-white sm:pl-5 lg:hidden">
                Total cost of this run
              </th>
              <td className="py-4 pr-3 sm:pr-4" />
              <td className="py-4 pr-3 sm:pr-4" />
              <td className="py-4 pr-4 text-right text-17 font-semibold text-lime sm:pr-5">{formatCost(usage.total_cost_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-13 text-white/55">
        Every model call ran on Nebius Token Factory.
        {!hasTavilyRow ? ` Tavily: ${usage.tavily_calls} ${usage.tavily_calls === 1 ? "search" : "searches"}.` : ""}
      </p>

      {research.length > 0 ? (
        <div className="mt-10">
          <p className="text-13 text-white/60">
            <span className="font-semibold text-white">What shaped the personas</span> · via Tavily
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {research.map((ref) => (
              <li key={ref.url}>
                <RefCard reference={ref} dark />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
