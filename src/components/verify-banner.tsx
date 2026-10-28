"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { streamEvents } from "@/lib/client/ndjson";

/** Shown on generated guides that haven't had their second-pass fact check yet. */
export function VerifyBanner({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  async function run() {
    setState("running");
    try {
      for await (const e of streamEvents("/api/verify", { slug })) {
        if (e.type === "fetch") setLog((l) => [...l, `Re-opening ${e.url}`]);
        if (e.type === "claim_check") setLog((l) => [...l, `${e.claimId}: ${e.verdict.replace("_", " ")}`]);
        if (e.type === "error") throw new Error(e.message);
      }
      router.refresh();
      setState("idle");
    } catch (err) {
      setLog((l) => [...l, (err as Error).message]);
      setState("error");
    }
  }

  return (
    <div className="card border-amber-300 bg-amber-50/60 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          <strong>Not fact-checked yet.</strong> Claims are as the research agent reported them. A second agent can re-open each cited source and confirm or flag it.
        </p>
        <button className="btn-primary" onClick={run} disabled={state === "running"}>
          {state === "running" ? "Checking sources…" : "Run fact-check"}
        </button>
      </div>
      {log.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-0.5 overflow-auto font-mono text-xs muted">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
