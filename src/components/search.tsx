"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { lookupToolkits, normalizeQuery, slugify } from "@/lib/directory";
import { TIER } from "@/lib/labels";
import type { Tier } from "@/lib/schema";

type LibItem = { slug: string; appName: string; tier: Tier };

export function Search({ library }: { library: LibItem[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const norm = slugify(normalizeQuery(q));

  const libMatches = useMemo(
    () => (norm ? library.filter((g) => slugify(g.appName).includes(norm) || g.slug.includes(norm)) : []),
    [norm, library],
  );
  const dirMatches = useMemo(() => (norm.length > 1 ? lookupToolkits(q, 4) : []), [q, norm]);

  const generate = (query: string) => router.push(`/generate?q=${encodeURIComponent(query.trim())}`);

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (libMatches.length === 1 && slugify(libMatches[0].appName) === norm) router.push(`/guides/${libMatches[0].slug}`);
          else if (q.trim().length > 1) generate(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="App name or website, e.g. Shopify, notion.so, Xero"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-700"
          autoFocus
        />
        <button className="btn-primary shrink-0 px-5" disabled={q.trim().length < 2}>
          Get guide
        </button>
      </form>

      {q.trim().length > 1 && (
        <div className="card mt-2 divide-y divide-zinc-100 overflow-hidden text-sm dark:divide-zinc-800">
          {libMatches.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <span className="font-medium">{g.appName}</span>
              <span className="flex items-center gap-2">
                <span className={`chip ${TIER[g.tier].cls}`}>{TIER[g.tier].label}</span>
                <span className="muted">Guide ready →</span>
              </span>
            </Link>
          ))}
          {dirMatches
            .filter((t) => !libMatches.some((g) => slugify(g.appName) === t.slug))
            .map((t) => (
              <button key={t.slug} onClick={() => generate(t.name)} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span>
                  <span className="font-medium">{t.name}</span>{" "}
                  <span className="muted">· {t.managed ? "Composio-managed app available" : "Bring your own OAuth app"}</span>
                </span>
                <span className="muted">Generate live →</span>
              </button>
            ))}
          <button onClick={() => generate(q)} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <span>
              Investigate <span className="font-medium">&ldquo;{q.trim()}&rdquo;</span> with the agent
            </span>
            <span className="muted">~2–4 min →</span>
          </button>
        </div>
      )}
    </div>
  );
}
