import type { ReactNode } from "react";

/** Sentence-case heading followed by a hairline that runs to the edge: "Issues ─────". */
export function SectionHeading({
  id,
  children,
  aside,
  level = 2,
}: {
  id?: string;
  children: ReactNode;
  aside?: ReactNode;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className="flex items-baseline gap-4">
      <Tag id={id} className="display shrink-0 text-22 tracking-[-0.01em] text-ink">
        {children}
      </Tag>
      <span aria-hidden="true" className="h-px flex-1 translate-y-[-0.3em] bg-line" />
      {aside ? <div className="shrink-0 text-13 text-ink-2">{aside}</div> : null}
    </div>
  );
}
