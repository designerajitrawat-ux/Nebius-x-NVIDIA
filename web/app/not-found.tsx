import Link from "next/link";
import { Blob } from "@/components/landing/Blob";
import { SkyBackdrop } from "@/components/report/ui";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="relative -mt-16 flex flex-1 flex-col overflow-x-clip bg-lilac sm:-mt-[72px]">
      <section className="relative isolate flex flex-1 items-center overflow-hidden pt-[120px] pb-20 sm:pt-[160px] sm:pb-28">
        <SkyBackdrop />
        <div className="page relative flex flex-col items-center text-center">
          <div className="relative">
            <span aria-hidden="true" className="hand absolute -top-8 -right-9 rotate-12 text-[56px] leading-none text-violet">
              ?
            </span>
            <span aria-hidden="true" className="hand absolute -top-1 -left-8 -rotate-12 text-[34px] leading-none text-violet/60">
              ?
            </span>
            <Blob hue={["#ffb199", "#ff6a3d"]} size={128} mood="confused" accessory="sprout" look={{ x: 0.5, y: -0.4 }} />
          </div>
          <p className="hand mt-6 -rotate-2 text-[24px] text-violet">404: even our testers got lost here</p>
          <h1 className="display mt-4 max-w-[18ch] text-40 font-semibold tracking-[-0.03em] text-balance text-ink sm:text-56">
            This page doesn&rsquo;t exist.
          </h1>
          <p className="mt-4 max-w-[48ch] text-17 text-ink-2">The link may be incomplete or out of date.</p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/" className="btn-lime">
              Back to home
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/samples"
              className="inline-flex h-[52px] items-center rounded-full bg-white/60 px-6 text-15 font-medium text-ink ring-1 ring-ink/10 transition-colors hover:bg-white"
            >
              Open the sample reports
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
