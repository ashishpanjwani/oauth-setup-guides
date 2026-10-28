import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/store";
import { DIFFICULTY, EVIDENCE, WHO } from "@/lib/labels";
import { CopyMarkdown } from "@/components/share-bar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: `${g.appName} OAuth app guide`, description: g.summary } : {};
}

export default async function GuidePage({ params }: Props) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();

  // Claims render as footnote numbers in reading order.
  const num = new Map(g.claims.map((c, i) => [c.id, i + 1]));
  const Refs = ({ ids }: { ids: string[] }) => {
    const n = ids.filter((id) => num.has(id));
    if (!n.length) return null;
    return (
      <sup className="ml-0.5 space-x-0.5 text-[10px]">
        {n.map((id) => (
          <a key={id} href={`#${id}`} className="text-sky-700 hover:underline dark:text-sky-400">
            {num.get(id)}
          </a>
        ))}
      </sup>
    );
  };

  return (
    <article className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <Link href="/" className="text-sm muted hover:underline">← All guides</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{g.appName}</h1>
          <CopyMarkdown guide={g} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {g.reviewed ? (
            <span className="chip bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">Reviewed by a person</span>
          ) : (
            <span className="chip bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300">Generated, not reviewed</span>
          )}
          <span className="muted">Checked {g.checkedAt.slice(0, 10)}</span>
          <span className="muted">·</span>
          <a href={g.developerPortal} target="_blank" rel="noreferrer" className="muted underline">Developer portal ↗</a>
        </div>
      </header>

      <section className="card space-y-4 p-5">
        <p className="text-lg">{g.summary}<Refs ids={g.summaryClaimIds} /></p>
        <dl className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-5 dark:border-zinc-800">
          {[
            ["Difficulty", <span key="d" className={`font-semibold ${DIFFICULTY[g.difficulty].cls}`}>{DIFFICULTY[g.difficulty].label}</span>],
            ["Time to test", g.timeToTest],
            ["Time to production", g.timeToProduction],
            ["Effort", g.effort],
            ["Cost", g.cost],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs muted">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Requirements</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          {g.requirements.map((r, i) => (
            <li key={i}>{r.text}<Refs ids={r.claimIds} /></li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Steps</h2>
        <ol className="card divide-y divide-zinc-100 dark:divide-zinc-800">
          {g.steps.map((s, i) => (
            <li key={i} className="flex gap-3 p-3">
              <span className="w-5 shrink-0 text-right text-sm muted">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div>{s.text}<Refs ids={s.claimIds} /></div>
                {s.detail && <div className="mt-0.5 text-sm muted">{s.detail}</div>}
              </div>
              <span className={`chip h-fit ${WHO[s.who].cls}`}>{WHO[s.who].label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Blockers</h2>
        <ul className="space-y-3">
          {g.blockers.map((b, i) => (
            <li key={i}>
              <div className="font-medium">{b.problem}<Refs ids={b.claimIds} /></div>
              <div className="muted">→ {b.fix}</div>
            </li>
          ))}
        </ul>
      </section>

      {g.couldNotVerify.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Could not verify</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            {g.couldNotVerify.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Evidence</h2>
        <ol className="space-y-3 text-sm">
          {g.claims.map((c, i) => (
            <li key={c.id} id={c.id} className="flex scroll-mt-6 gap-3 rounded-md target:bg-amber-50 dark:target:bg-amber-950/40">
              <span className="w-5 shrink-0 text-right muted">{i + 1}.</span>
              <div className="min-w-0 flex-1 space-y-1">
                <div>
                  <span className={`chip mr-2 ${EVIDENCE[c.status].cls}`}>{EVIDENCE[c.status].label}</span>
                  {c.statement}
                </div>
                {c.quote && <blockquote className="border-l-2 border-zinc-300 pl-2 italic muted dark:border-zinc-700">&ldquo;{c.quote}&rdquo;</blockquote>}
                {c.sourceUrl && (
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="block truncate text-sky-700 hover:underline dark:text-sky-400">{c.sourceTitle || c.sourceUrl}</a>
                )}
                {c.note && <div className="muted">{c.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
