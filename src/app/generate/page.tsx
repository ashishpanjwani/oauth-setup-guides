"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { streamEvents } from "@/lib/client/ndjson";
import type { AgentEvent } from "@/lib/agent/pipeline";

type Phase = "research" | "fetch" | "compose" | "check" | "edit" | "done";
const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: "research", label: "Find docs", hint: "Searches for the provider's official pages" },
  { id: "fetch", label: "Read & probe", hint: "Reads those pages and checks the developer console" },
  { id: "compose", label: "Write", hint: "Turns them into steps, blockers and time estimates" },
  { id: "check", label: "Check quotes", hint: "Confirms every quoted sentence is on its page" },
  { id: "edit", label: "Edit", hint: "Fixes the guide against a fixed checklist" },
];

type Row = { icon: string; text: string; sub?: string; tone?: "ok" | "bad" | "note" };

function toRow(e: AgentEvent): Row | null {
  switch (e.type) {
    case "search":
      return { icon: "⌕", text: `Searching “${e.query}”` };
    case "fetch":
      return e.ok ? { icon: "✓", text: `Read ${e.url}`, tone: "ok" } : { icon: "✗", text: `Couldn't read ${e.url}`, sub: e.error, tone: "bad" };
    case "probe":
      return { icon: e.probe.ok ? "✓" : "✗", text: `Developer console: ${e.probe.target}`, sub: e.probe.result, tone: e.probe.ok ? "ok" : "bad" };
    case "check":
      return { icon: e.downgraded ? "!" : "✓", text: `${e.kept} claims confirmed on their pages, ${e.downgraded} marked uncertain`, tone: e.downgraded ? "note" : "ok" };
    case "error":
      return { icon: "✗", text: e.message, tone: "bad" };
    default:
      return null;
  }
}

function Generator() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const replay = params.get("replay");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("research");
  const [rows, setRows] = useState<Row[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !q) return;
    started.current = true;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    const push = (e: AgentEvent) => {
      const r = toRow(e);
      if (r) setRows((rs) => [...rs, r]);
    };

    (async () => {
      let newSlug: string | null = null;
      try {
        for await (const e of streamEvents("/api/generate", { query: q, replay })) {
          if (e.type === "phase") setPhase(e.phase);
          if (e.type === "guide") newSlug = e.slug;
          if (e.type === "error") throw new Error(e.message);
          push(e);
        }
        if (!newSlug) throw new Error("The agent finished without producing a guide.");
        setSlug(newSlug);
        setPhase("done");
        router.push(`/guide/${newSlug}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        clearInterval(timer);
      }
    })();
  }, [q, replay, router]);

  if (!q) return <p className="muted">Nothing to investigate. <Link href="/" className="underline">Search for an app</Link>.</p>;

  const idx = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm muted">{replay ? "Replay of a recorded investigation (no API cost)" : "Live investigation"}</p>
        <h1 className="text-2xl font-semibold">{q}</h1>
        <p className="mt-1 text-sm muted">
          Usually 2–3 minutes. {elapsed > 0 && <span className="font-mono">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>}
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-5">
        {PHASES.map((p, i) => {
          const state = phase === "done" || i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <li key={p.id} className={`card p-3 ${state === "active" ? "border-zinc-900 dark:border-white" : ""} ${state === "todo" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${state === "done" ? "bg-emerald-500" : state === "active" ? (error ? "bg-rose-500" : "animate-pulse bg-amber-500") : "bg-zinc-300"}`} />
                {p.label}
              </div>
              <p className="mt-1 text-xs muted">{p.hint}</p>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="card border-rose-300 p-4 text-sm dark:border-rose-900">
          <strong>Something went wrong:</strong> {error}
          {slug ? <> The guide was saved: <Link className="underline" href={`/guide/${slug}`}>open it</Link>.</> : <> <button className="underline" onClick={() => location.reload()}>Try again</button>.</>}
        </div>
      )}

      <div className="card max-h-[60vh] overflow-auto p-4">
        <ul className="space-y-1.5 font-mono text-xs">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1rem_1fr] gap-2">
              <span className={r.tone === "ok" ? "text-emerald-600" : r.tone === "bad" ? "text-rose-600" : "muted"}>{r.icon}</span>
              <span className={r.tone === "note" ? "muted" : ""}>
                {r.text}
                {r.sub && <span className="block muted">{r.sub}</span>}
              </span>
            </li>
          ))}
          {!error && phase !== "done" && <li className="muted animate-pulse">working…</li>}
        </ul>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <Generator />
    </Suspense>
  );
}
