const LEVELS = [
  { word: "Calm", color: "#d4ff3f" },
  { word: "A little unsure", color: "#ffb627" },
  { word: "Confused", color: "#ff7a59" },
  { word: "Lost", color: "#ff4d4d" },
] as const;

/**
 * Four segments for confusion 0 to 3 on the dark lab: level 0 fills one in lime, level 3 fills all
 * four in red. The fill colour follows the level so a glance across five lanes reads like a heat row.
 */
export function LaneMeter({ level }: { level: number }) {
  const value = Math.max(0, Math.min(3, Math.round(level)));
  const { word, color } = LEVELS[value];
  return (
    <div>
      <div aria-hidden="true" className="flex items-baseline justify-between gap-2 text-[11px] leading-none">
        <span className="text-white/60">Confusion</span>
        <span className="font-semibold transition-colors duration-300" style={{ color }}>
          {word}
        </span>
      </div>
      <span
        role="img"
        aria-label={`Confusion ${value} of 3, ${word.toLowerCase()}`}
        className="mt-1.5 flex gap-1"
      >
        {[0, 1, 2, 3].map((i) => {
          const on = i <= value;
          return (
            <span
              key={i}
              className="h-1.5 min-w-0 flex-1 rounded-full transition-[background-color,box-shadow] duration-300"
              style={{
                background: on ? color : "rgba(255,255,255,0.1)",
                boxShadow: on ? `0 0 10px -1px color-mix(in srgb, ${color} 75%, transparent)` : "none",
              }}
            />
          );
        })}
      </span>
    </div>
  );
}
