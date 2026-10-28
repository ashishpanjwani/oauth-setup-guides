"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { guideToMarkdown } from "@/lib/markdown";

export function CopyMarkdown({ guide }: { guide: Guide }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(guideToMarkdown(guide, window.location.href));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : "Copy as Markdown"}
    </button>
  );
}
