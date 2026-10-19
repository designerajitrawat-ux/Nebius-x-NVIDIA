"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_URL } from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  const onSamples = pathname === "/samples";

  return (
    <header className="page flex h-16 items-center justify-between sm:h-[72px]">
      <Link
        href="/"
        className="display rounded-control text-17 font-semibold tracking-[-0.01em] text-ink"
        aria-label="FiveUsers, home"
      >
        FiveUsers
      </Link>
      <nav aria-label="Main">
        <ul className="flex items-center gap-6 text-15">
          <li>
            <Link
              href="/samples"
              aria-current={onSamples ? "page" : undefined}
              className={`rounded-control transition-colors duration-150 hover:text-ink ${onSamples ? "text-ink" : "text-ink-2"}`}
            >
              Samples
            </Link>
          </li>
          <li>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-control text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              GitHub
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
