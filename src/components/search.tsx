"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeQuery, queryProblem, slugify } from "@/lib/text";
import { useSnackbar } from "./snackbar";

/** Opens an existing guide when the name matches one, otherwise starts a live generation. */
export function Search({
  existing,
}: {
  existing: { slug: string; appName: string }[];
}) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const snackbar = useSnackbar();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // The library comes first, so a short real name like "X" still opens its guide.
    const key = slugify(normalizeQuery(q));
    const match = existing.find((g) => slugify(g.appName) === key || g.slug === key);
    if (match) return router.push(`/guide/${match.slug}`);
    const problem = queryProblem(q);
    if (problem) return snackbar.show(problem);
    router.push(`/generate?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <>
      <form
        onSubmit={submit}
        noValidate
        className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] p-1.5 pl-5 transition focus-within:border-[var(--brand)]/60 focus-within:shadow-[0_0_0_4px_rgba(81,162,255,0.12)]"
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 fill-none stroke-current muted"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="App name or website, e.g. Slack or xero.com"
          aria-label="App name or website"
          maxLength={120}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-[var(--muted)]"
          autoFocus
        />
        <button className="btn-primary shrink-0">Generate guide</button>
      </form>
      {snackbar.node}
    </>
  );
}
