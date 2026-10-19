"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { reportMarkdownUrl } from "@/lib/api";
import { reportToMarkdown } from "@/lib/markdown";
import type { Report } from "@/lib/types";

export function ReportActions({ report }: { report: Report }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <CopyLinkButton />
      <ExportMarkdownLink report={report} />
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    const url = window.location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers / insecure contexts.
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button type="button" onClick={copy} className="btn-secondary min-w-[92px]">
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

  return (
    <a href={href ?? "#export"} download={filename} onClick={onClick} className="btn-secondary">
      Export as Markdown
    </a>
  );
}
