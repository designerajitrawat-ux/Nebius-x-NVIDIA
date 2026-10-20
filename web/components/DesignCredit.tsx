import { DESIGNER_URL } from "@/lib/constants";

/** "Design by Ajit Singh Rawat", linking to his portfolio. Used in the light and the dark footer. */
export function DesignCredit({ dark = false }: { dark?: boolean }) {
  return (
    <p className={dark ? "text-white/60" : "text-ink-2"}>
      Design by{" "}
      <a
        href={DESIGNER_URL}
        target="_blank"
        rel="noreferrer"
        className={`group inline-flex items-center gap-1 font-semibold underline decoration-1 underline-offset-4 transition-colors ${
          dark ? "text-white decoration-white/30 hover:decoration-lime" : "text-ink decoration-ink/25 hover:decoration-violet"
        }`}
      >
        Ajit Singh Rawat
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">(opens his portfolio in a new tab)</span>
      </a>
    </p>
  );
}
