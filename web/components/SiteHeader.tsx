"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_URL } from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onSamples = pathname === "/samples";
  // The live run is a dark "lab", so the header switches to dark glass there.
  const dark = pathname.startsWith("/run/");
  const link = dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-ink-2 hover:bg-white hover:text-ink";

  return (
    <header className="sticky top-0 z-50 h-16 sm:h-[72px]">
      <div className="page flex h-full items-center">
        <div className={`flex h-12 w-full items-center justify-between rounded-full pr-1.5 pl-4 sm:h-14 sm:pl-5 ${dark ? "border border-white/10 bg-night-2/70 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl" : "glass"}`}>
          <Link href="/" className="flex items-center gap-2.5 rounded-full" aria-label="FiveUsers, home">
            <Mark />
            <span className={`display text-17 font-semibold tracking-[-0.01em] ${dark ? "text-white" : "text-ink"}`}>FiveUsers</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <ul className="flex items-center gap-1 text-15">
              <li className="hidden sm:block">
                <Link href="/#how" className={`rounded-full px-3 py-2 transition-colors duration-150 ${link}`}>
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/samples"
                  aria-current={onSamples ? "page" : undefined}
                  className={`rounded-full px-3 py-2 transition-colors duration-150 ${link} ${onSamples ? (dark ? "text-white" : "text-ink") : ""}`}
                >
                  Samples
                </Link>
              </li>
              <li className="hidden sm:block">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full px-3 py-2 transition-colors duration-150 ${link}`}
                >
                  GitHub
                </a>
              </li>
            </ul>
            <Link href={onHome ? "#start" : "/#start"} className={`ml-1 h-9 px-4 text-13 sm:h-10 ${dark ? "btn-lime h-9 sm:h-10" : "btn-ink"}`}>
              Run a test
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

/** The brand mark: one tester peeking up from the bottom of an app tile. */
function Mark() {
  return (
    <span aria-hidden="true" className="relative block h-8 w-8 overflow-hidden rounded-[10px] bg-[linear-gradient(150deg,#8b7bff,#38b6ff)] shadow-[0_6px_14px_-6px_rgba(109,92,255,0.8)]">
      <span className="absolute -bottom-3 left-1/2 h-7 w-9 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_30%,#ffffff,#d9f1ff_60%,#a9dcff)]" />
      <span className="absolute top-[15px] left-[10px] h-2 w-1.5 rounded-full bg-ink" />
      <span className="absolute top-[15px] left-[17px] h-2 w-1.5 rounded-full bg-ink" />
    </span>
  );
}
