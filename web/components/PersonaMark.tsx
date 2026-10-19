const SIZES = {
  sm: "size-7 text-13",
  md: "size-9 text-15",
  lg: "size-11 text-22",
} as const;

/** A persona's single-initial mark: ink letter in a paper circle. Personas never get colours. */
export function PersonaMark({ initial, size = "md" }: { initial: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`display inline-flex shrink-0 items-center justify-center rounded-full border border-ink bg-paper leading-none font-medium text-ink ${SIZES[size]}`}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}
