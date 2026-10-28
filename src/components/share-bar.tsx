"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { guideToMarkdown } from "@/lib/markdown";

export function ShareBar({ guide }: { guide: Guide }) {
  const [copied, setCopied] = useState<"" | "link" | "md">("");
  const flash = (k: "link" | "md") => {
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };
  const md = () => guideToMarkdown(guide, window.location.href);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          flash("link");
        }}
      >
        {copied === "link" ? "Copied ✓" : "Copy link"}
      </button>
      <button
        className="btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(md());
          flash("md");
        }}
      >
        {copied === "md" ? "Copied ✓" : "Copy as Markdown"}
      </button>
      <button
        className="btn-ghost"
        onClick={() => {
          const url = URL.createObjectURL(new Blob([md()], { type: "text/markdown" }));
          const a = Object.assign(document.createElement("a"), { href: url, download: `${guide.slug}-oauth-guide.md` });
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download .md
      </button>
    </div>
  );
}
