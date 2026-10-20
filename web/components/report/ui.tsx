"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { ReactNode } from "react";
import { hostOf } from "@/lib/format";
import { SEVERITY_LABEL } from "@/lib/labels";
import type { Reference, Severity } from "@/lib/types";

/** Severity colours shared with the landing page's issue cards. */
export const SEVERITY_CHIP: Record<Severity, string> = {
  critical: "bg-[#ff4d4d] text-white",
  major: "bg-[#ff8a3d] text-white",
  minor: "bg-[#f2b705] text-ink",
};

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-[#ff4d4d]",
  major: "bg-[#ff8a3d]",
  minor: "bg-[#f2b705]",
};

export function SeverityChip({ severity, className = "" }: { severity: Severity; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold tracking-wide uppercase ${SEVERITY_CHIP[severity]} ${className}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/** Small rounded label on a lilac tint. */
export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-lilac px-2.5 py-1 text-[11px] leading-none font-medium text-ink-2 ${className}`}>
      {children}
    </span>
  );
}

/** Outcome as a soft pill: mint when they finished, coral when they didn't. */
export function OutcomeChip({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold ${
        ok ? "bg-[#dcf7ea] text-ok-ink" : "bg-[#ffe7e1] text-signal-ink"
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-p-mint" : "bg-[#ff4d4d]"}`} />
      {children}
    </span>
  );
}

/** Soft violet sky, two glows, film grain and one white wave: the landing hero backdrop. */
export function SkyBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#cfc8ff_0%,#e6e2fb_45%,transparent_75%)]" />
      <div className="absolute -top-24 left-[4%] h-[420px] w-[420px] rounded-full bg-p-sky/25 blur-[110px]" />
      <div className="absolute top-10 right-[4%] h-[380px] w-[380px] rounded-full bg-lime/30 blur-[110px]" />
      <svg className="absolute inset-x-0 bottom-0 h-[260px] w-full" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="report-wave" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 210 C 260 90, 520 80, 760 150 S 1200 250, 1440 120 L1440 300 L0 300 Z" fill="url(#report-wave)" />
        <path d="M0 210 C 260 90, 520 80, 760 150 S 1200 250, 1440 120" fill="none" stroke="#ffffff" strokeWidth="2" />
      </svg>
      <div className="grain absolute inset-0 opacity-[0.18] mix-blend-soft-light" />
    </div>
  );
}

/** Completion ring: green when most finished, amber when some did, red when nobody did. */
export function Ring({ completed, total, size = 48 }: { completed: number; total: number; size?: number }) {
  const reduce = useReducedMotion();
  const stroke = size >= 60 ? 6 : 5;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? completed / total : 0;
  const color = frac >= 0.6 ? "#22c997" : frac > 0 ? "#ffb627" : "#ff4d4d";
  const target = c * (1 - Math.max(frac, 0.02));
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-lilac-2)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? { strokeDashoffset: target } : { strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: target }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <span aria-hidden="true" className={`absolute font-semibold text-ink tabular-nums ${size >= 60 ? "text-15" : "text-[12px]"}`}>
        {completed}/{total}
      </span>
      <span className="sr-only">
        {completed} of {total} users finished the task
      </span>
    </span>
  );
}

/** A Tavily reference as a small link card. */
export function RefCard({ reference, dark = false }: { reference: Reference; dark?: boolean }) {
  const host = hostOf(reference.url);
  return (
    <a
      href={reference.url}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-start gap-3 rounded-[14px] p-3 [overflow-wrap:anywhere] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 ${
        dark ? "bg-white/[0.04] ring-1 ring-night-line hover:bg-white/[0.08] hover:ring-white/20" : "bg-mist ring-1 ring-lilac-2/60 hover:bg-white hover:shadow-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-13 font-semibold uppercase ${
          dark ? "bg-white/10 text-lime" : "bg-white text-violet shadow-soft"
        }`}
      >
        {host.replace(/[^a-z0-9]/gi, "").slice(0, 1) || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-15 leading-snug font-medium group-hover:underline ${dark ? "text-white" : "text-ink"}`}>{reference.title}</span>
        <span className={`mt-0.5 block text-13 ${dark ? "text-white/55" : "text-ink-2"}`}>
          <span className={dark ? "text-white/75" : "text-ink"}>{host}</span>
          {reference.note ? <span className="mt-0.5 line-clamp-2">{reference.note}</span> : null}
        </span>
      </span>
      <span aria-hidden="true" className={`mt-0.5 text-15 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${dark ? "text-white/50" : "text-ink-2"}`}>
        ↗
      </span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Copy text to the clipboard, with a fallback for older browsers and insecure contexts. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

export function Spark({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={className}>
      <path d="M7 0c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" fill="currentColor" />
    </svg>
  );
}
