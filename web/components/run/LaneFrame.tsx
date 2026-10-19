/* eslint-disable @next/next/no-img-element -- API screenshots come from varying hosts; plain <img> on purpose. */
"use client";

import { useCallback, useState } from "react";
import type { Viewport } from "@/lib/types";

const PHONE_RATIO = 390 / 844;

/**
 * The lane's screenshot frame. Desktop personas fill the lane width and show the page from the
 * top; mobile personas get a phone-proportioned frame at the same height. New screenshots
 * crossfade in over 200 ms once they have loaded.
 */
export function LaneFrame({
  src,
  alt,
  viewport,
  emptyLabel,
}: {
  src: string | null;
  alt: string;
  viewport: Viewport;
  emptyLabel: string;
}) {
  const phone = viewport === "mobile";
  return (
    <div className="relative aspect-[4/3] w-full">
      <div
        className={`absolute inset-y-0 overflow-hidden rounded-frame bg-card shadow-frame ${
          phone ? "left-1/2 -translate-x-1/2" : "inset-x-0"
        }`}
        style={phone ? { aspectRatio: String(PHONE_RATIO) } : undefined}
      >
        {src ? (
          <Crossfade src={src} alt={alt} />
        ) : (
          <p className="flex h-full items-center justify-center px-3 text-center text-13 text-ink-2">{emptyLabel}</p>
        )}
      </div>
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
    window.setTimeout(() => setSettled({ src: loadedSrc, alt: loadedAlt }), 220);
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
          className={`absolute top-0 left-0 block h-auto w-full transition-opacity duration-200 ease-linear ${
            incoming.visible ? "opacity-100" : "opacity-0"
          }`}
          decoding="async"
        />
      ) : null}
    </>
  );
}
