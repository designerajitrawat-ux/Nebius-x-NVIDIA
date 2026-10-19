import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <div className="page pt-10 sm:pt-20">
        <h1 className="display text-28 font-medium tracking-[-0.015em]">This page doesn&rsquo;t exist.</h1>
        <p className="mt-3 max-w-[60ch] text-17 text-ink-2">The link may be incomplete or out of date.</p>
        <p className="mt-6 text-15">
          <Link href="/" className="link font-medium">
            Start a test
          </Link>
          <span className="text-ink-2"> or </span>
          <Link href="/samples" className="link">
            open the sample reports
          </Link>
          <span className="text-ink-2">.</span>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
