const DESCRIPTION = ["calm", "a little unsure", "confused", "lost"] as const;

/**
 * Four segments for confusion 0–3: level 0 fills one, level 3 fills all four.
 * Segments turn signal from level 2 up.
 */
export function ConfusionMeter({ level, compact = false }: { level: number; compact?: boolean }) {
  const value = Math.max(0, Math.min(3, Math.round(level)));
  const filled = value + 1;
  const hot = value >= 2;
  return (
    <div className="flex items-center gap-2">
      {compact ? null : <span className="text-13 text-ink-2">Confusion</span>}
      <span
        role="img"
        aria-label={`Confusion ${value} of 3, ${DESCRIPTION[value]}`}
        className="inline-flex gap-[3px]"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2 w-3.5 rounded-[1px] transition-colors duration-200 ${
              i < filled ? (hot ? "bg-signal" : "bg-ink") : "bg-line"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
