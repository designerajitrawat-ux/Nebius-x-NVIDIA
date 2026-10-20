/** Small, locale-stable formatters. All inputs are plain numbers from the API. */

export function formatUsd(value: number, digits = 2): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `$${safe.toFixed(digits)}`;
}

/** Costs per model are often fractions of a cent; keep three decimals so columns line up. */
export function formatCost(value: number): string {
  return formatUsd(value, 3);
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${trimZero((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `${trimZero((value / 1_000).toFixed(value >= 100_000 ? 0 : 1))}k`;
  return String(Math.round(value));
}

function trimZero(text: string): string {
  return text.replace(/\.0$/, "");
}

/** "48 s", "2 min 05 s" */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, "0")} s`;
}

/** A running clock, such as "1:04". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** unix seconds → "19 Oct 2026" */
export function formatDate(unixSeconds: number): string {
  return dateFormatter.format(new Date(unixSeconds * 1000));
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Accepts "your-site.com" or "https://your-site.com/path"; returns a normalised URL or null. */
export function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname;
    const looksReal = host === "localhost" || host.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (!looksReal) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Priya, Maya and Dev" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
