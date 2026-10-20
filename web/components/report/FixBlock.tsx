"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FIX_LABEL } from "@/lib/labels";
import type { Fix } from "@/lib/types";
import { copyText } from "./ui";

type Side = "before" | "after";

/** The concrete fix: copy edit, CSS patch or flow change, with a Before / After switch. */
export function FixBlock({ fix }: { fix: Fix }) {
  const before = fix.before.trim();
  const after = fix.after.trim();
  const sides: Side[] = [...(before ? (["before"] as const) : []), ...(after ? (["after"] as const) : [])];
  const [side, setSide] = useState<Side>(after ? "after" : "before");
  const reduce = useReducedMotion();
  const uid = useId();
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const label = (s: Side) => (fix.type === "flow" ? (s === "before" ? "Now" : "Proposed") : s === "before" ? "Before" : "After");
  const tabId = (s: Side) => `${uid}-tab-${s}`;
  const panelId = `${uid}-panel`;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = sides.indexOf(side);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? sides.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + sides.length) % sides.length;
    setSide(sides[next]);
    tabsRef.current[next]?.focus();
  }

  const shown = side === "after" ? after : before;

  return (
    <div className="mt-7 rounded-[20px] bg-white p-4 ring-1 ring-lilac-2 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-2.5 py-1 text-[11px] leading-none font-semibold tracking-wide text-violet uppercase">
          <WrenchIcon />
          {FIX_LABEL[fix.type]}
        </p>
        {after ? <CopyFixButton text={after} /> : null}
      </div>
      <p className="mt-3 text-15 leading-relaxed text-ink">{fix.summary}</p>

      {sides.length === 2 ? (
        <div role="tablist" aria-label="Before and after" className="mt-4 inline-flex rounded-full bg-lilac p-1">
          {sides.map((s, i) => {
            const active = side === s;
            return (
              <button
                key={s}
                ref={(el) => {
                  tabsRef.current[i] = el;
                }}
                id={tabId(s)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                onClick={() => setSide(s)}
                onKeyDown={onKeyDown}
                className="relative h-8 rounded-full px-4 text-13 font-medium transition-colors"
              >
                {active ? (
                  <motion.span
                    layoutId={`${uid}-pill`}
                    className={`absolute inset-0 rounded-full ${s === "after" ? "bg-lime" : "bg-white"} shadow-soft`}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className={`relative ${active ? "text-ink" : "text-ink-2"}`}>{label(s)}</span>
              </button>
            );
          })}
        </div>
      ) : sides.length === 1 ? (
        <p className="mt-4 text-13 font-medium text-ink-2">{label(sides[0])}</p>
      ) : null}

      {shown ? (
        <div
          id={panelId}
          role={sides.length === 2 ? "tabpanel" : undefined}
          aria-labelledby={sides.length === 2 ? tabId(side) : undefined}
          className="relative mt-3"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={side}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
            >
              {looksLikeCode(shown) ? (
                <CodeSample code={shown} side={side} label={label(side)} lang={langOf(fix.type, shown)} />
              ) : (
                <ChangeLine side={side}>
                  {fix.type === "copy" ? (
                    side === "before" ? (
                      <del className="decoration-[#c0392b]/60 decoration-1">{shown}</del>
                    ) : (
                      <ins className="no-underline">{shown}</ins>
                    )
                  ) : (
                    <FlowPath text={shown} />
                  )}
                </ChangeLine>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

function ChangeLine({ side, children }: { side: Side; children: ReactNode }) {
  const after = side === "after";
  return (
    <p
      className={`flex gap-2.5 rounded-[14px] px-4 py-3 text-15 leading-relaxed ${
        after ? "bg-[#f3ffd6] text-ink" : "bg-[#fff1ef] text-ink-2"
      }`}
    >
      <span aria-hidden="true" className={`font-mono font-semibold ${after ? "text-[#4d7c0f]" : "text-[#c0392b]"}`}>
        {after ? "+" : "-"}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/** CSS rules and HTML snippets get the code panel; plain sentences stay as text. */
function looksLikeCode(text: string) {
  return /[{}]|<\/?[a-z][^>]*>/i.test(text) || /^\s*[a-z-]+\s*:\s*[^;\n]+;\s*$/im.test(text);
}

function langOf(type: Fix["type"], text: string) {
  if (/<\/?[a-z][^>]*>/i.test(text)) return "html";
  return type === "css" || /[{}]/.test(text) ? "css" : "text";
}

function CodeSample({ code, side, label, lang }: { code: string; side: Side; label: string; lang: string }) {
  const after = side === "after";
  return (
    <div className="overflow-hidden rounded-[14px] bg-night">
      <div className="flex h-8 items-center justify-between border-b border-night-line px-4 text-[11px] text-white/50">
        <span className={`font-semibold ${after ? "text-lime" : "text-white/60"}`}>{label}</span>
        <span className="font-mono">{lang}</span>
      </div>
      <pre
        className={`max-h-[320px] overflow-auto px-4 py-3 font-mono text-[12.5px] leading-[1.65] break-words whitespace-pre-wrap ${
          after ? "text-lime" : "text-white/60"
        }`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyFixButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    await copyText(text);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2 ring-1 ring-lilac-2 transition-colors hover:bg-lilac hover:text-ink"
      >
        {copied ? "Copied" : "Copy fix"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Fix copied to the clipboard" : ""}
      </span>
    </>
  );
}

function WrenchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.6 1.2a4.2 4.2 0 0 0-4 5.5L1.4 11.9a1.5 1.5 0 0 0 2.1 2.1l5.2-5.2a4.2 4.2 0 0 0 5.5-4L12 7l-2.6-.4L9 4l2.2-2.2c-.2-.4-.4-.6-.6-.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** "Home → Sign up → Project" with quiet separators. */
function FlowPath({ text }: { text: string }) {
  const parts = text
    .split(/\s*(?:→|->)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return <>{text}</>;
  return (
    <span>
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 ? (
            <>
              {" "}
              <span aria-hidden="true" className="text-ink-2">
                →
              </span>
              <span className="sr-only">then</span>{" "}
            </>
          ) : null}
          {/* Break between steps, not inside them (unless a step is long). */}
          <span className={part.length <= 28 ? "whitespace-nowrap" : undefined}>{part}</span>
        </span>
      ))}
    </span>
  );
}
