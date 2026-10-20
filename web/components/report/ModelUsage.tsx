import { formatCost, formatTokens, hostOf } from "@/lib/format";
import { TIER_ORDER, TIER_ROLE } from "@/lib/labels";
import type { Reference, Usage } from "@/lib/types";

/** Which Nemotron did what in this run, with calls, tokens and cost. */
export function ModelUsage({ usage, research }: { usage: Usage; research: Reference[] }) {
  const rank = (tier: string) => {
    const i = TIER_ORDER.indexOf(tier);
    return i === -1 ? TIER_ORDER.length : i;
  };
  const rows = [...usage.rows].sort((a, b) => rank(a.tier) - rank(b.tier));
  const hasTavilyRow = rows.some((r) => r.tier === "tavily");

  return (
    <div>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Model usage for this run</caption>
        <thead>
          <tr className="border-b border-line text-13 text-ink-2">
            <th scope="col" className="py-2 pr-4 font-normal">
              Model
            </th>
            <th scope="col" className="hidden py-2 pr-4 font-normal lg:table-cell">
              What it did
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">
              Calls
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">
              Tokens <span className="hidden sm:inline">in / out</span>
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Cost
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => {
            const isSearch = row.tier === "tavily";
            const role = TIER_ROLE[row.tier];
            return (
              <tr key={`${row.tier}-${row.model}`} className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="block text-15 text-ink">{row.label || row.model}</span>
                  {role ? <span className="mt-0.5 block text-13 text-ink-2 lg:hidden">{role}</span> : null}
                </th>
                <td className="hidden max-w-[44ch] py-3 pr-4 text-15 text-ink-2 lg:table-cell">{role ?? "-"}</td>
                <td className="py-3 pr-4 text-right text-15 text-ink">{row.calls}</td>
                <td className="py-3 pr-4 text-right text-15 text-ink">
                  {isSearch ? (
                    "n/a"
                  ) : (
                    <>
                      <span className="block sm:inline">{formatTokens(row.prompt_tokens)}</span>
                      <span className="hidden text-ink-2 sm:inline"> / </span>
                      <span className="block text-ink-2 sm:inline sm:text-ink">{formatTokens(row.completion_tokens)}</span>
                    </>
                  )}
                </td>
                <td className="py-3 text-right text-15 text-ink">{isSearch && row.cost_usd === 0 ? "n/a" : formatCost(row.cost_usd)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="tabular-nums">
          <tr>
            <th scope="row" colSpan={2} className="hidden py-3 pr-4 text-left text-15 font-medium text-ink lg:table-cell">
              Total cost of this run
            </th>
            <th scope="row" className="py-3 pr-4 text-left text-15 font-medium text-ink lg:hidden">
              Total cost of this run
            </th>
            <td className="py-3 pr-4" />
            <td className="py-3 pr-4" />
            <td className="py-3 text-right text-15 font-medium text-ink">{formatCost(usage.total_cost_usd)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-2 text-13 text-ink-2">
        Every model call ran on Nebius Token Factory.
        {!hasTavilyRow ? ` Tavily: ${usage.tavily_calls} ${usage.tavily_calls === 1 ? "search" : "searches"}.` : ""}
      </p>

      {research.length > 0 ? (
        <div className="mt-8 max-w-[72ch]">
          <p className="text-13 text-ink-2">
            <span className="font-semibold text-ink">What shaped the personas</span> · via Tavily
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {research.map((ref) => (
              <li key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer" className="link text-15">
                  {ref.title}
                </a>
                <p className="text-13 text-ink-2">
                  {hostOf(ref.url)}
                  {ref.note ? ` · ${ref.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
