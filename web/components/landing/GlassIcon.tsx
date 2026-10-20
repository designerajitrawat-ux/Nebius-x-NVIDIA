import type { ReactNode } from "react";

/**
 * Frosted-glass icon: a solid colour shape behind a translucent pane with a white glyph on top.
 * Each layer is plain CSS, so it stays crisp and themable.
 */
export function GlassIcon({
  from,
  to,
  glyph,
  size = 112,
  back = "square",
}: {
  from: string;
  to: string;
  glyph: ReactNode;
  size?: number;
  back?: "square" | "circle" | "tilted";
}) {
  const r = back === "circle" ? "9999px" : `${size * 0.26}px`;
  return (
    <span aria-hidden="true" className="relative inline-block" style={{ width: size * 1.25, height: size * 1.15 }}>
      <span
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: r,
          background: `linear-gradient(140deg, ${from}, ${to})`,
          transform: back === "tilted" ? "rotate(-12deg)" : undefined,
          boxShadow: `0 ${size * 0.14}px ${size * 0.3}px -${size * 0.12}px ${to}`,
        }}
      />
      <span
        className="absolute grid place-items-center border border-white/70"
        style={{
          left: size * 0.3,
          top: size * 0.24,
          width: size * 0.86,
          height: size * 0.86,
          borderRadius: r,
          background: "linear-gradient(150deg, rgba(255,255,255,0.75), rgba(255,255,255,0.28))",
          backdropFilter: "blur(14px) saturate(1.5)",
          WebkitBackdropFilter: "blur(14px) saturate(1.5)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 36px -18px rgba(40,30,90,0.45)",
        }}
      >
        <svg viewBox="0 0 48 48" width={size * 0.44} height={size * 0.44} fill="none" style={{ color: to, filter: `drop-shadow(0 2px 4px ${to}55)` }}>
          {glyph}
        </svg>
      </span>
    </span>
  );
}
