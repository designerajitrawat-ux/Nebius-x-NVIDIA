/**
 * Numbered friction pin: signal circle, white numeral, 2px paper ring.
 * `current` adds a soft halo; `other` is smaller for neighbouring issues on the same screenshot.
 */
export function PinMark({ n, variant = "plain" }: { n: number; variant?: "plain" | "current" | "other" }) {
  const size = variant === "other" ? "size-[18px] text-[11px]" : "size-[22px] text-[12px]";
  const ring =
    variant === "current"
      ? "shadow-[0_0_0_2px_var(--color-paper),0_0_0_7px_rgba(228,87,46,0.28)]"
      : "shadow-[0_0_0_2px_var(--color-paper)]";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-signal leading-none font-semibold text-card tabular-nums ${size} ${ring}`}
    >
      {n}
    </span>
  );
}
