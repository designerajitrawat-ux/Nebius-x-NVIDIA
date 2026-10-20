/**
 * Numbered friction pin: coral circle, white numeral, white ring.
 * `current` is larger and pulses (CSS only, so reduced motion stills it); `other` is smaller for
 * neighbouring issues on the same screenshot.
 */
export function PinMark({ n, variant = "plain" }: { n: number; variant?: "plain" | "current" | "other" }) {
  if (variant === "current") {
    return (
      <span aria-hidden="true" className="relative inline-grid size-8 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#ff4d4d] opacity-40 [animation-duration:1.8s]" />
        <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-[#ff4d4d] text-15 leading-none font-semibold text-white tabular-nums shadow-[0_0_0_4px_rgba(255,255,255,0.92),0_8px_18px_-4px_rgba(255,77,77,0.8)]">
          {n}
        </span>
      </span>
    );
  }
  const size = variant === "other" ? "size-[22px] text-[11px]" : "size-6 text-[12px]";
  const ring =
    variant === "other"
      ? "shadow-[0_0_0_3px_rgba(255,255,255,0.9),0_4px_10px_-3px_rgba(40,30,90,0.4)] bg-ink"
      : "shadow-[0_0_0_2px_#ffffff] bg-[#ff4d4d]";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full leading-none font-semibold text-white tabular-nums ${size} ${ring}`}
    >
      {n}
    </span>
  );
}
