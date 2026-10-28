"use client";

import Link from "next/link";
import { useState } from "react";
import { DIRECTORY, slugify } from "@/lib/directory";

export function DirectoryTable({ librarySlugs }: { librarySlugs: string[] }) {
  const [filter, setFilter] = useState<"all" | "managed" | "byo">("byo");
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const lib = new Set(librarySlugs);

  const rows = DIRECTORY.toolkits.filter(
    (t) =>
      (filter === "all" || (filter === "managed") === t.managed) &&
      (!text || t.slug.includes(slugify(text))),
  );
  const visible = showAll ? rows : rows.slice(0, 48);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["byo", "managed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`chip ring-zinc-300 dark:ring-zinc-700 ${filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900"}`}
          >
            {f === "byo" ? "Bring your own app" : f === "managed" ? "Composio-managed" : "All"} ·{" "}
            {f === "all" ? DIRECTORY.toolkits.length : DIRECTORY.toolkits.filter((t) => t.managed === (f === "managed")).length}
          </button>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter"
          className="ml-auto w-40 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <div key={t.slug} className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
            <span className="truncate">{t.name}</span>
            {lib.has(t.slug) ? (
              <Link href={`/guides/${t.slug}`} className="shrink-0 font-medium text-emerald-700 dark:text-emerald-400">
                Guide →
              </Link>
            ) : (
              <Link href={`/generate?q=${encodeURIComponent(t.name)}`} className="shrink-0 muted hover:text-zinc-900 dark:hover:text-white">
                Generate
              </Link>
            )}
          </div>
        ))}
      </div>
      {rows.length > visible.length && (
        <button onClick={() => setShowAll(true)} className="btn-ghost mt-3">
          Show all {rows.length}
        </button>
      )}
      <p className="mt-3 text-xs muted">
        Snapshot of <a className="underline" href={DIRECTORY.source}>{DIRECTORY.source.replace("https://", "")}</a>, checked {DIRECTORY.checkedAt}.
      </p>
    </div>
  );
}
