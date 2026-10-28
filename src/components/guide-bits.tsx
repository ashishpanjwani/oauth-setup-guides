import type { Claim } from "@/lib/schema";
import { EVIDENCE } from "@/lib/labels";

export function Difficulty({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Difficulty ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-3 rounded-full ${i <= n ? (n >= 4 ? "bg-rose-500" : n >= 3 ? "bg-amber-500" : "bg-emerald-500") : "bg-zinc-200 dark:bg-zinc-700"}`} />
      ))}
    </span>
  );
}

/** Inline evidence markers: each links to the claim in the Evidence section. */
export function ClaimRefs({ ids, claims }: { ids: string[]; claims: Map<string, Claim> }) {
  const found = ids.map((id) => claims.get(id)).filter((c): c is Claim => Boolean(c));
  if (!found.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {found.map((c) => (
        <a
          key={c.id}
          href={`#${c.id}`}
          title={`${EVIDENCE[c.status].label}: ${c.statement}`}
          className={`chip px-1.5 py-0 font-mono text-[10px] ${EVIDENCE[c.status].cls}`}
        >
          {c.id}
        </a>
      ))}
    </span>
  );
}

export function EvidenceBar({ claims }: { claims: Claim[] }) {
  const order = ["tested", "verified", "sourced", "uncertain"] as const;
  const total = claims.length || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {order.map((s) => {
          const n = claims.filter((c) => c.status === s).length;
          return n ? <div key={s} className={EVIDENCE[s].dot} style={{ width: `${(n / total) * 100}%` }} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
        {order.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${EVIDENCE[s].dot}`} />
            {claims.filter((c) => c.status === s).length} {EVIDENCE[s].label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
