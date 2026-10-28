"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { streamEvents } from "@/lib/client/ndjson";
import type { AgentEvent } from "@/lib/agent/pipeline";

type Phase = "research" | "compose" | "verify" | "done";
const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: "research", label: "Investigate", hint: "Searches docs, reads policy pages, probes live OAuth endpoints" },
  { id: "compose", label: "Write guide", hint: "Turns findings into steps, blockers and timelines, with evidence on every claim" },
  { id: "verify", label: "Fact-check", hint: "A second pass re-opens cited sources and confirms or flags each key claim" },
];

type Row = { icon: string; text: string; sub?: string; tone?: "ok" | "bad" | "note" };

function toRow(e: AgentEvent): Row | null {
  switch (e.type) {
    case "note":
      return { icon: "·", text: e.text, tone: "note" };
    case "search":
      return { icon: "⌕", text: `Searching “${e.query}”` };
    case "search_results":
      return e.results.length ? { icon: " ", text: e.results.map((r) => r.title).slice(0, 3).join(" · "), tone: "note" } : null;
    case "fetch":
      return { icon: "↗", text: `Reading ${e.url}` };
    case "fetch_result":
      return e.ok ? null : { icon: "✗", text: "Page could not be read", tone: "bad" };
    case "probe":
      return { icon: e.probe.ok ? "✓" : "✗", text: `Probe ${e.probe.name}: ${e.probe.target}`, sub: e.probe.result.slice(0, 220), tone: e.probe.ok ? "ok" : "bad" };
    case "directory":
      return { icon: "◎", text: `Composio directory: ${e.text.slice(0, 200)}` };
    case "claim_check":
      return { icon: e.verdict === "supported" ? "✓" : "!", text: `${e.claimId}: ${e.verdict.replace("_", " ")}`, sub: e.evidence.slice(0, 200), tone: e.verdict === "supported" ? "ok" : "bad" };
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
      let finished = false;
      try {
        for await (const e of streamEvents("/api/generate", { query: q, replay })) {
          if (e.type === "phase") setPhase(e.phase);
          if (e.type === "phase" && e.phase === "done") finished = true;
          if (e.type === "guide") newSlug = e.slug;
          if (e.type === "error") throw new Error(e.message);
          push(e);
        }
        if (!newSlug) throw new Error("The agent finished without producing a guide.");
        setSlug(newSlug);
        if (finished) return router.push(`/guides/${newSlug}`); // replay already included verification
        setPhase("verify");
        for await (const e of streamEvents("/api/verify", { slug: newSlug })) {
          if (e.type === "error") throw new Error(e.message);
          push(e);
        }
        setPhase("done");
        router.push(`/guides/${newSlug}`);
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
          Usually 2–4 minutes. You can leave this page open and share the guide link when it&rsquo;s done. {elapsed > 0 && <span className="font-mono">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>}
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
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

      {slug && phase !== "done" && (
        <div className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span>The guide is written. Fact-checking now; you can open it already.</span>
          <Link href={`/guides/${slug}`} className="btn-primary">Open guide</Link>
        </div>
      )}
      {error && (
        <div className="card border-rose-300 p-4 text-sm dark:border-rose-900">
          <strong>Something went wrong:</strong> {error}
          {slug ? <> The guide was saved: <Link className="underline" href={`/guides/${slug}`}>open it</Link>.</> : <> <button className="underline" onClick={() => location.reload()}>Try again</button>.</>}
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
