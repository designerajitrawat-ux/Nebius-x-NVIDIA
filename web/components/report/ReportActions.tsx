"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { reportMarkdownUrl } from "@/lib/api";
import { reportToMarkdown } from "@/lib/markdown";
import type { Report } from "@/lib/types";
import { copyText } from "./ui";

export function ReportActions({ report }: { report: Report }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <ExportMarkdownLink report={report} />
      <CopyLinkButton />
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    await copyText(window.location.href.split("#")[0]);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 min-w-[124px] items-center justify-center gap-2 rounded-full bg-white/70 px-5 text-15 font-medium whitespace-nowrap text-ink ring-1 ring-ink/10 backdrop-blur transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-white"
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
        {copied ? "Link copied" : "Copy link"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Link copied to the clipboard" : ""}
      </span>
    </>
  );
}

function saveText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Downloads the API's Markdown export; builds it in the browser if that fails. */
function ExportMarkdownLink({ report }: { report: Report }) {
  const href = reportMarkdownUrl(report.id);
  const filename = `fiveusers-report-${report.id}.md`;

  async function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (href) {
      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error(String(res.status));
        saveText(await res.text(), filename);
        return;
      } catch {
        // fall through to the client-side export
      }
    }
    saveText(reportToMarkdown(report), filename);
  }

  if (!href) {
    // No API copy of this report (fixtures, offline): build the file in the browser.
    return (
      <button type="button" onClick={() => saveText(reportToMarkdown(report), filename)} className="btn-ink">
        <DownloadIcon />
        Export as Markdown
      </button>
    );
  }
  return (
    <a href={href} download={filename} onClick={onClick} className="btn-ink">
      <DownloadIcon />
      Export as Markdown
    </a>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2v8m0 0 3.2-3.2M8 10 4.8 6.8M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.4-2.4a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="#22c997" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
