"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useEffect, useState, type CSSProperties } from "react";

/**
 * A persona as a soft, squishy character. The face is not decoration: it shows the same signal the
 * product measures on every step, how confused this person is right now. Each persona also wears one
 * small thing that says who they are (a sprout for the first-timer, glasses for Margaret, ...).
 */
export type Mood = "calm" | "curious" | "happy" | "confused" | "worried" | "frustrated" | "excited";
export type Accessory = "sprout" | "headband" | "headphones" | "glasses" | "bubble";

const INK = "#24183f";

export function Blob({
  hue,
  size = 64,
  mood = "calm",
  look = { x: 0, y: 0 },
  accessory,
  breathe = true,
  className = "",
  style,
  label,
}: {
  hue: [string, string];
  size?: number;
  mood?: Mood;
  /** Where the eyes point, -1..1 on each axis. */
  look?: { x: number; y: number };
  accessory?: Accessory;
  /** A gentle idle squish; off for tiny sizes and reduced motion. */
  breathe?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Accessible name; omit for decorative use. */
  label?: string;
}) {
  const [light, deep] = hue;
  const reduce = useReducedMotion();
  const blinking = useBlink(!reduce && mood !== "happy" && mood !== "excited");
  const lx = Math.max(-1, Math.min(1, look.x)) * 2.6;
  const ly = Math.max(-1, Math.min(1, look.y)) * 2;
  const squish = breathe && !reduce && size >= 32;

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {/* soft floor shadow */}
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: -size * 0.06,
          width: size * 0.7,
          height: size * 0.14,
          background: `radial-gradient(closest-side, color-mix(in srgb, ${deep} 40%, rgba(36,24,63,0.35)), transparent)`,
        }}
      />
      <motion.span
        className="absolute inset-0"
        style={{ transformOrigin: "50% 100%" }}
        animate={squish ? { scaleY: [1, 0.965, 1], scaleX: [1, 1.025, 1] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* mochi body: a touch wider at the bottom */}
        <span
          className="absolute inset-0"
          style={{
            borderRadius: "50% 50% 46% 46% / 56% 56% 44% 44%",
            background: [
              "radial-gradient(ellipse 34% 22% at 34% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)",
              `radial-gradient(circle at 50% 108%, color-mix(in srgb, ${light} 55%, white) 0%, transparent 42%)`,
              `radial-gradient(circle at 44% 36%, color-mix(in srgb, ${light} 85%, white) 0%, ${light} 30%, ${deep} 88%)`,
            ].join(","),
            boxShadow: `inset 0 -${size * 0.06}px ${size * 0.14}px color-mix(in srgb, ${deep} 65%, #2a1650), inset 0 ${size * 0.03}px ${size * 0.06}px rgba(255,255,255,0.55), 0 ${size * 0.14}px ${size * 0.3}px -${size * 0.14}px color-mix(in srgb, ${deep} 75%, transparent)`,
          }}
        />
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full overflow-visible">
          <Face mood={mood} lx={lx} ly={ly} blink={blinking} reduce={!!reduce} />
          {accessory ? <Accessory kind={accessory} deep={deep} /> : null}
        </svg>
      </motion.span>
    </span>
  );
}

function Face({ mood, lx, ly, blink, reduce }: { mood: Mood; lx: number; ly: number; blink: boolean; reduce: boolean }) {
  const eyeY = 19.5 + ly;
  const left = 14.6 + lx;
  const right = 25.4 + lx;
  const happy = mood === "happy" || mood === "excited";

  return (
    <g>
      {/* blush, always a little, more when happy */}
      <ellipse cx={11 + lx * 0.4} cy={25 + ly * 0.4} rx="3.2" ry="1.9" fill="#ff7d9c" opacity={happy ? 0.7 : 0.4} />
      <ellipse cx={29 + lx * 0.4} cy={25 + ly * 0.4} rx="3.2" ry="1.9" fill="#ff7d9c" opacity={happy ? 0.7 : 0.4} />

      {happy ? (
        <g stroke={INK} strokeWidth="2.1" strokeLinecap="round" fill="none">
          <path d={`M${left - 2.8} ${eyeY + 0.8} q2.8 -3.6 5.6 0`} />
          <path d={`M${right - 2.8} ${eyeY + 0.8} q2.8 -3.6 5.6 0`} />
        </g>
      ) : (
        [left, right].map((cx) => (
          <motion.g
            key={cx > 20 ? "r" : "l"}
            initial={false}
            animate={{ scaleY: blink ? 0.1 : mood === "frustrated" ? 0.62 : 1 }}
            transition={{ duration: reduce ? 0 : 0.08 }}
            style={{ originX: `${cx}px`, originY: `${eyeY}px`, transformBox: "view-box" }}
          >
            <ellipse cx={cx} cy={eyeY} rx={mood === "curious" ? 2.9 : 2.6} ry={mood === "curious" ? 3.7 : 3.3} fill={INK} />
            <circle cx={cx + 0.9} cy={eyeY - 1.3} r="1.05" fill="white" />
            <circle cx={cx - 0.9} cy={eyeY + 1.2} r="0.5" fill="white" opacity="0.85" />
          </motion.g>
        ))
      )}

      <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none">
        {mood === "excited" ? (
          <path d={`M${17.4 + lx * 0.5} ${26 + ly * 0.4} q2.6 4.2 5.2 0 z`} fill="#ff5b7f" stroke={INK} />
        ) : mood === "happy" ? (
          <path d={`M${17.6 + lx * 0.5} ${26 + ly * 0.4} q2.4 2.6 4.8 0`} />
        ) : mood === "confused" ? (
          <>
            <path d={`M${11.5 + lx} ${13.8 + ly} l5 1`} />
            <path d={`M${23 + lx} ${13 + ly} q2.6 -1.8 5.2 0`} />
            <path d={`M${17.2 + lx * 0.5} ${27.4 + ly * 0.4} q1 -1 2 0 t2 0 t2 0`} />
          </>
        ) : mood === "worried" ? (
          <>
            <path d={`M${12 + lx} ${14.2 + ly} l4.6 -1.4`} />
            <path d={`M${23.4 + lx} ${12.8 + ly} l4.6 1.4`} />
            <path d={`M${17.6 + lx * 0.5} ${28 + ly * 0.4} q2.4 -1.8 4.8 0`} />
          </>
        ) : mood === "frustrated" ? (
          <>
            <path d={`M${11.6 + lx} ${13.6 + ly} l5 2`} />
            <path d={`M${23.4 + lx} ${15.6 + ly} l5 -2`} />
            <path d={`M${17.8 + lx * 0.5} ${27.6 + ly * 0.4} h4.4`} />
          </>
        ) : mood === "curious" ? (
          <ellipse cx={20 + lx * 0.5} cy={27 + ly * 0.4} rx="1.3" ry="1.5" fill={INK} stroke="none" />
        ) : (
          <path d={`M${18 + lx * 0.5} ${26.4 + ly * 0.4} q2 1.8 4 0`} />
        )}
      </g>
    </g>
  );
}

/** One small thing each persona carries, drawn in the same 40x40 space as the face. */
function Accessory({ kind, deep }: { kind: Accessory; deep: string }) {
  if (kind === "sprout")
    return (
      <g transform="translate(20 4.5) scale(1.55) translate(-20 -4.5)">
        <path d="M20 4.5 v-4" stroke="#3a9d4a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 1.5 c-1 -3.4 -5.2 -3.6 -6.2 -1.4 c2.6 1.2 4.6 1.4 6.2 1.4z" fill="#5ccf5f" />
        <path d="M20 0.6 c1.2 -3 5.4 -3 6.2 -0.6 c-2.6 1 -4.6 0.9 -6.2 0.6z" fill="#7be06b" />
      </g>
    );
  if (kind === "headband")
    return (
      <g>
        <path d="M5.5 11 Q20 3.5 34.5 11 L33.6 14.2 Q20 7.4 6.4 14.2 Z" fill="white" />
        <path d="M5.5 11 Q20 3.5 34.5 11" stroke="#ff4d6d" strokeWidth="1.3" fill="none" />
        <path d="M6.4 14.2 Q20 7.4 33.6 14.2" stroke="#ff4d6d" strokeWidth="1.3" fill="none" />
        <path d="M34 12.6 l4 -1.8 l-0.6 3.6z" fill="#ff4d6d" />
      </g>
    );
  if (kind === "headphones")
    return (
      <g>
        <path d="M6 19 Q6 4 20 4 Q34 4 34 19" stroke="#2b2440" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <rect x="2.4" y="16.5" width="5.4" height="8.6" rx="2.6" fill="#2b2440" />
        <rect x="32.2" y="16.5" width="5.4" height="8.6" rx="2.6" fill="#2b2440" />
        <rect x="3.6" y="18" width="2.4" height="5.6" rx="1.2" fill={deep} />
        <rect x="34" y="18" width="2.4" height="5.6" rx="1.2" fill={deep} />
      </g>
    );
  if (kind === "glasses")
    return (
      <g stroke="#3b2f5c" strokeWidth="1.3" fill="rgba(255,255,255,0.22)">
        <circle cx="14.6" cy="19.5" r="5.2" />
        <circle cx="25.4" cy="19.5" r="5.2" />
        <path d="M19.8 19 q0.2 -1 0.4 0" fill="none" />
        <path d="M9.4 18.6 l-3.4 -1.2 M30.6 18.6 l3.4 -1.2" fill="none" />
      </g>
    );
  return (
    <g>
      <path d="M27 1.2 h10 a3 3 0 0 1 3 3 v4.4 a3 3 0 0 1 -3 3 h-5.6 l-2.6 2.6 v-2.6 h-1.8 a3 3 0 0 1 -3 -3 v-4.4 a3 3 0 0 1 3 -3z" fill="white" stroke="#3b2f5c" strokeWidth="0.9" />
      <text x="32" y="8.6" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#3b2f5c" fontFamily="ui-sans-serif, system-ui">
        Aa
      </text>
    </g>
  );
}

/** Blink every few seconds, at a slightly different rhythm per character. */
function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let t: number;
    let u: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setClosed(true);
        u = window.setTimeout(() => setClosed(false), 120);
        loop();
      }, 2400 + Math.random() * 3400);
    };
    loop();
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(u);
    };
  }, [enabled]);
  return closed;
}
