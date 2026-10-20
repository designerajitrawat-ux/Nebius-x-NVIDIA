/* eslint-disable @next/next/no-img-element -- API screenshots come from varying hosts; plain <img> on purpose. */
"use client";

import { useState } from "react";
import { PinMark } from "./PinMark";

export interface ShotPin {
  id: number;
  x: number; // 0..1 of screenshot width
  y: number; // 0..1 of screenshot height
  title: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Screenshot frame with numbered pins as an HTML overlay. The frame keeps the persona's
 * viewport ratio; a taller full-page screenshot is shifted so the current pin sits in view.
 * Desktop shots sit in a small browser window, phone shots in a phone bezel.
 */
export function AnnotatedShot({
  src,
  alt,
  viewport,
  pins,
  currentId,
  label,
}: {
  src: string;
  alt: string;
  viewport: [number, number];
  pins: ShotPin[];
  currentId: number;
  /** Text in the browser bar, such as the page address. */
  label?: string;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [vw, vh] = viewport[0] > 0 && viewport[1] > 0 ? viewport : [1280, 800];
  const phone = vw < vh;

  // Visible share of the image height (1 when the screenshot is viewport-sized or shorter).
  const visible = natural ? Math.min(1, (natural.w * vh) / (natural.h * vw)) : 1;
  const current = pins.find((p) => p.id === currentId);
  const offset = visible < 1 && current ? clamp(current.y - visible * 0.4, 0, 1 - visible) : 0;
  const inView = (p: ShotPin) => p.y >= offset - 0.005 && p.y <= offset + visible + 0.005;

  const screen = (
    <div className={`relative w-full overflow-hidden bg-white ${phone ? "rounded-[22px]" : ""}`} style={{ aspectRatio: `${vw} / ${vh}` }}>
      <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${-offset * 100}%)` }}>
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full"
          decoding="async"
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
        />
        {pins.filter(inView).map((pin) => {
          const isCurrent = pin.id === currentId;
          const style = {
            left: `${clamp(pin.x, 0.02, 0.98) * 100}%`,
            top: `${clamp(pin.y, 0, 1) * 100}%`,
          };
          return isCurrent ? (
            <span key={pin.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={style}>
              <PinMark n={pin.id} variant="current" />
            </span>
          ) : (
            <a
              key={pin.id}
              href={`#issue-${pin.id}`}
              aria-label={`Issue ${pin.id}: ${pin.title}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 transition-[opacity,transform] duration-150 hover:scale-110 hover:opacity-100"
              style={style}
            >
              <PinMark n={pin.id} variant="other" />
            </a>
          );
        })}
      </div>
    </div>
  );

  if (phone) {
    return (
      <div className="rounded-[30px] bg-ink p-[7px] shadow-float">{screen}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-white shadow-soft ring-1 ring-ink/5">
      <div className="flex h-8 items-center gap-1.5 border-b border-lilac-2 px-3">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink/15" />
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink/15" />
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink/15" />
        {label ? (
          <span className="ml-2 min-w-0 truncate rounded-full bg-mist px-2.5 py-0.5 text-[11px] text-ink-2">{label}</span>
        ) : null}
      </div>
      {screen}
    </div>
  );
}
