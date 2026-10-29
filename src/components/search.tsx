"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeQuery, queryProblem, slugify } from "@/lib/text";

const HINT = "Opens a ready guide if there is one; otherwise an agent researches and writes it in 2–5 minutes.";

/** Opens an existing guide when the name matches one, otherwise starts a live generation. */
export function Search({ existing }: { existing: { slug: string; appName: string }[] }) {
  const [q, setQ] = useState("");
  const [shownProblem, setShownProblem] = useState<string | null>(null);
  const router = useRouter();

  // The library comes first, so a short real name like "X" is valid.
  const key = slugify(normalizeQuery(q));
  const match = existing.find((g) => slugify(g.appName) === key || g.slug === key);
  const problem = q.trim() && !match ? queryProblem(q) : null;
  const valid = q.trim().length > 0 && !problem;

  // The button reacts at once; the message waits for a pause, so it doesn't flash mid-word.
  useEffect(() => {
    if (!problem) return setShownProblem(null);
    const t = setTimeout(() => setShownProblem(problem), 600);
    return () => clearTimeout(t);
  }, [problem]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return setShownProblem(problem ?? queryProblem(q));
    router.push(match ? `/guide/${match.slug}` : `/generate?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        onSubmit={submit}
        noValidate
        className={`flex items-center gap-2 rounded-full border bg-[var(--card)] p-1.5 pl-5 transition focus-within:shadow-[0_0_0_4px_rgba(81,162,255,0.12)] ${
          shownProblem ? "border-rose-400/60 focus-within:border-rose-400/70" : "border-[var(--border)] focus-within:border-[var(--brand)]/60"
        }`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-none stroke-current muted" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="App name or website, e.g. Notion or xero.com"
          aria-label="App name or website"
          aria-invalid={Boolean(shownProblem)}
          aria-describedby="search-help"
          maxLength={120}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-[var(--muted)]"
          autoFocus
        />
        <button className="btn-primary shrink-0" disabled={!valid}>
          Generate guide
        </button>
      </form>
      <p id="search-help" role={shownProblem ? "alert" : undefined} className={`mt-2.5 px-5 text-left text-[13px] ${shownProblem ? "text-rose-300" : "muted"}`}>
        {shownProblem ?? HINT}
      </p>
    </div>
  );
}
