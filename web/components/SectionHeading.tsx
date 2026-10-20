import type { ReactNode } from "react";

/**
 * Section heading in the landing style: an optional eyebrow pill, a display title, an optional
 * lede, and an optional aside (counts, notes) that sits to the right on wide screens.
 */
export function SectionHeading({
  id,
  children,
  aside,
  level = 2,
  eyebrow,
  lede,
  dark = false,
}: {
  id?: string;
  children: ReactNode;
  aside?: ReactNode;
  level?: 2 | 3;
  eyebrow?: string;
  lede?: ReactNode;
  dark?: boolean;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="max-w-[760px] min-w-0">
        {eyebrow ? (
          <p
            className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.1em] uppercase ${
              dark ? "bg-white/10 text-lime" : "bg-white text-violet shadow-soft"
            }`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-lime" : "bg-violet"}`} />
            {eyebrow}
          </p>
        ) : null}
        <Tag
          id={id}
          className={`display scroll-mt-28 font-semibold tracking-[-0.03em] text-balance ${
            level === 2 ? "text-28 sm:text-40" : "text-22 sm:text-28"
          } ${dark ? "text-white" : "text-ink"}`}
        >
          {children}
        </Tag>
        {lede ? <p className={`mt-3 max-w-[62ch] text-15 leading-relaxed sm:text-17 ${dark ? "text-white/70" : "text-ink-2"}`}>{lede}</p> : null}
      </div>
      {aside ? <div className={`shrink-0 text-13 ${dark ? "text-white/60" : "text-ink-2"}`}>{aside}</div> : null}
    </div>
  );
}
