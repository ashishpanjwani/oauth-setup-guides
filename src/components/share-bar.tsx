"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { guideToMarkdown } from "@/lib/markdown";

/** The guide's own URL, without any #claim anchor the reader jumped to. */
const pageUrl = () => window.location.href.split("#")[0];

function CopyButton({ label, text }: { label: string; text: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/** Share a guide: its link, a Markdown copy for tickets and docs, or a PDF via the browser's print dialog. */
export function ShareBar({ guide }: { guide: Guide }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <CopyButton label="Copy link" text={pageUrl} />
      <CopyButton label="Copy as Markdown" text={() => guideToMarkdown(guide, pageUrl())} />
      <button className="btn-ghost" onClick={() => window.print()} title="Opens the print dialog; choose Save as PDF">
        Save as PDF
      </button>
    </div>
  );
}
