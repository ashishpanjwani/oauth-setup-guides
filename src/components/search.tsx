"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeQuery, slugify } from "@/lib/text";

/** Opens an existing guide when the name matches one, otherwise starts a live generation. */
export function Search({ existing }: { existing: { slug: string; appName: string }[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = slugify(normalizeQuery(q));
    if (key.length < 2) return;
    const match = existing.find((g) => slugify(g.appName) === key);
    router.push(match ? `/guide/${match.slug}` : `/generate?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="App name or website, e.g. Slack or xero.com"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-700"
        autoFocus
      />
      <button className="btn-primary shrink-0 px-5" disabled={q.trim().length < 2}>
        Generate guide
      </button>
    </form>
  );
}
