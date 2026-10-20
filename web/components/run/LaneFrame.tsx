/* eslint-disable @next/next/no-img-element -- API screenshots come from varying hosts; plain <img> on purpose. */
"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { useCallback, useState, type ReactNode } from "react";
import type { Viewport } from "@/lib/types";

const PHONE_RATIO = 390 / 844;

/**
 * The lane's screen, drawn as a small monitor with a browser bar. Desktop personas fill the lane
 * width and show the page from the top; mobile personas get a phone-proportioned frame at the same
 * height. New screenshots crossfade in once they have loaded. The frame glows in the persona's hue.
 */
export function LaneFrame({
  src,
  alt,
  viewport,
  emptyLabel,
  hue,
  path,
  overlay,
  device,
}: {
  src: string | null;
  alt: string;
  viewport: Viewport;
  emptyLabel: string;
  /** Persona colour for the soft glow around the screen. */
  hue: string;
  /** Current path, shown in the browser bar. */
  path?: string | null;
  /** Rendered above the screen, such as the outcome stamp. */
  overlay?: ReactNode;
  /** Small device label on the right of the browser bar. */
  device?: ReactNode;
}) {
  const phone = viewport === "mobile";
  return (
    <div
      className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0c12]"
      style={{
        boxShadow: `0 0 0 1px color-mix(in srgb, ${hue} 18%, transparent), 0 18px 40px -22px ${hue}, 0 0 32px -14px color-mix(in srgb, ${hue} 70%, transparent)`,
      }}
    >
      <div className="flex h-6 items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.04] px-2.5">
        <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-white/25" />
        <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-white/25" />
        <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-white/25" />
        <span aria-hidden="true" className="ml-1.5 min-w-0 flex-1 truncate font-mono text-[10px] leading-none text-white/60">
          {path || "about:blank"}
        </span>
        {device}
      </div>

      <div
        className={`relative aspect-[4/3] w-full ${
          phone
            ? "bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_70%)] py-2"
            : ""
        }`}
      >
        <div className="relative h-full w-full">
          <div
            className={`absolute inset-y-0 overflow-hidden ${
              phone
                ? "left-1/2 -translate-x-1/2 rounded-[14px] bg-white shadow-[0_0_0_3px_#23263a,0_10px_24px_-8px_rgba(0,0,0,0.8)]"
                : "inset-x-0 bg-white"
            }`}
            style={phone ? { aspectRatio: String(PHONE_RATIO) } : undefined}
          >
            {src ? <Crossfade src={src} alt={alt} /> : <Empty label={emptyLabel} />}
          </div>
        </div>
      </div>

      {overlay}
    </div>
  );
}

/** Before the first screenshot: a dark screen with a soft scan line. */
function Empty({ label }: { label: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#12131c] px-2 text-center">
      {!reduce ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-white/[0.07] to-transparent"
          initial={{ top: "-20%" }}
          animate={{ top: ["-20%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <p className="relative text-[12px] text-white/65">{label}</p>
    </div>
  );
}

function Crossfade({ src, alt }: { src: string; alt: string }) {
  const [settled, setSettled] = useState<{ src: string; alt: string } | null>(null);
  const [incoming, setIncoming] = useState<{ src: string; alt: string; visible: boolean }>({
    src,
    alt,
    visible: false,
  });

  // Adjust state when the prop changes (no effect needed).
  if (incoming.src !== src) {
    setIncoming({ src, alt, visible: false });
  }

  const reveal = useCallback((loadedSrc: string, loadedAlt: string) => {
    setIncoming((s) => (s.src === loadedSrc && !s.visible ? { ...s, visible: true } : s));
    // After the fade, the new image becomes the base layer for the next change.
    window.setTimeout(() => setSettled({ src: loadedSrc, alt: loadedAlt }), 320);
  }, []);

  const incomingSrc = incoming.src;
  const incomingAlt = incoming.alt;
  const incomingRef = useCallback(
    (node: HTMLImageElement | null) => {
      // Cached images can finish before React attaches onLoad.
      if (node && node.complete && node.naturalWidth > 0) reveal(incomingSrc, incomingAlt);
    },
    [reveal, incomingSrc, incomingAlt],
  );

  const isSettled = settled?.src === incoming.src;

  return (
    <>
      {settled ? (
        <img
          src={settled.src}
          alt={isSettled ? settled.alt : ""}
          aria-hidden={isSettled ? undefined : true}
          className="absolute top-0 left-0 block h-auto w-full"
          decoding="async"
        />
      ) : null}
      {!isSettled ? (
        <img
          key={incoming.src}
          ref={incomingRef}
          src={incoming.src}
          alt={incoming.alt}
          onLoad={() => reveal(incomingSrc, incomingAlt)}
          className={`absolute top-0 left-0 block h-auto w-full transition-opacity duration-300 ease-out ${
            incoming.visible ? "opacity-100" : "opacity-0"
          }`}
          decoding="async"
        />
      ) : null}
    </>
  );
}
