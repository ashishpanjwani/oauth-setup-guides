import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/store";
import { ACTOR, EVIDENCE, STAGE_ORDER, TIER } from "@/lib/labels";
import { ClaimRefs, Difficulty, EvidenceBar } from "@/components/guide-bits";
import { ShareBar } from "@/components/share-bar";
import { VerifyBanner } from "@/components/verify-banner";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: `${g.appName} OAuth app guide`, description: g.verdict.headline } : {};
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function GuidePage({ params }: Props) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  const claims = new Map(g.claims.map((c) => [c.id, c]));
  const stages = [...g.stages].sort((a, b) => STAGE_ORDER.indexOf(a.id) - STAGE_ORDER.indexOf(b.id));

  return (
    <article className="space-y-10">
      <header className="space-y-5">
        <Link href="/" className="text-sm muted hover:underline">← All guides</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{g.appName}</h1>
          <span className={`chip ${TIER[g.verdict.tier].cls}`} title={TIER[g.verdict.tier].blurb}>{TIER[g.verdict.tier].label}</span>
          <span className="chip ring-zinc-300 dark:ring-zinc-700">
            {g.origin === "library" ? "Library · human-reviewed" : `Generated live · ${g.createdAt.slice(0, 10)}`}
          </span>
        </div>
        <p className="max-w-3xl text-xl">{g.verdict.headline}<ClaimRefs ids={g.verdict.claimIds} claims={claims} /></p>
        <p className="max-w-3xl muted">{g.summary}</p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["First connection (dev)", g.verdict.timeToFirstConnection],
            ["Production (any user)", g.verdict.timeToProduction],
            ["Hands-on effort", g.verdict.activeEffort],
            ["Approval wait", g.verdict.approvalWait],
          ].map(([k, v]) => (
            <div key={k} className="card p-3">
              <div className="text-xs muted">{k}</div>
              <div className="mt-1 font-medium">{v}</div>
            </div>
          ))}
        </div>

        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2"><span className="muted">Difficulty</span> <Difficulty n={g.verdict.difficulty} /></span>
            <span><span className="muted">Confidence</span> {g.verdict.confidence}</span>
            <a href={g.developerPortal} className="underline" target="_blank" rel="noreferrer">Developer portal ↗</a>
          </div>
          <ShareBar guide={g} />
        </div>
        <EvidenceBar claims={g.claims} />
      </header>

      {g.origin === "generated" && !g.verifiedAt && <VerifyBanner slug={g.slug} />}

      <div className={`card p-4 ${g.composio.managedAuth === "yes" ? "border-emerald-300 dark:border-emerald-900" : ""}`}>
        <div className="text-sm font-medium">
          On Composio:{" "}
          {g.composio.managedAuth === "yes"
            ? "a managed OAuth app exists. You can build and test today."
            : g.composio.managedAuth === "no"
              ? "no managed app. You need your own before any user can connect."
              : "managed app status unknown."}
        </div>
        <p className="mt-1 text-sm muted">{g.composio.guidance}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Before you start">
          <ul className="space-y-2 text-sm">
            {g.prerequisites.map((p, i) => (
              <li key={i} className="card p-3">
                <div className="font-medium">{p.item}<ClaimRefs ids={p.claimIds} claims={claims} /></div>
                <div className="muted">{p.why}</div>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="What an agent can do vs. you">
          <div className="card divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <div className="p-3">
              <div className={`chip mb-2 ${ACTOR.agent.cls}`}>Agent</div>
              <ul className="list-disc space-y-1 pl-5">{g.handoff.agentCanDo.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="p-3">
              <div className={`chip mb-2 ${ACTOR.you.cls}`}>You</div>
              <ul className="list-disc space-y-1 pl-5">{g.handoff.youMustDo.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Steps">
        <ol className="space-y-6">
          {stages.map((s, si) => (
            <li key={s.id} className="relative pl-10">
              <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">{si + 1}</span>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{s.title}</h3>
                <span className="text-sm muted">{s.duration}</span>
              </div>
              <p className="mb-3 text-sm muted">{s.goal}</p>
              <ol className="card divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                {s.steps.map((st, i) => (
                  <li key={i} className="grid gap-1 p-3 sm:grid-cols-[1fr_auto] sm:gap-4">
                    <div>
                      <div>{st.text}<ClaimRefs ids={st.claimIds} claims={claims} /></div>
                      {st.detail && <div className="mt-1 whitespace-pre-wrap font-mono text-xs muted">{st.detail}</div>}
                    </div>
                    <span className={`chip h-fit justify-self-start ${ACTOR[st.actor].cls}`}>{ACTOR[st.actor].label}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </Section>

      {g.blockers.length > 0 && (
        <Section title="Where people get stuck">
          <div className="grid gap-3 md:grid-cols-2">
            {g.blockers.map((b, i) => (
              <div key={i} className="card space-y-2 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{b.title}<ClaimRefs ids={b.claimIds} claims={claims} /></span>
                  <span className="chip ring-zinc-300 dark:ring-zinc-700">{b.likelihood}</span>
                </div>
                <p><span className="muted">You&rsquo;ll see:</span> {b.symptom}</p>
                <p><span className="muted">Do this:</span> {b.workaround}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {g.scopes.length > 0 && (
        <Section title="Scopes and what they trigger">
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs muted">
                <tr><th className="p-3 font-medium">Scope</th><th className="p-3 font-medium">Sensitivity</th><th className="p-3 font-medium">Review?</th><th className="p-3 font-medium">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {g.scopes.map((s, i) => (
                  <tr key={i}>
                    <td className="p-3 font-mono text-xs">{s.scope}</td>
                    <td className="p-3">{s.sensitivity}</td>
                    <td className="p-3">{s.triggersReview ? "Yes" : "No"}</td>
                    <td className="p-3 muted">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {g.nuances.length > 0 && (
        <Section title="Nuances">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {g.nuances.map((n, i) => <li key={i}>{n.text}<ClaimRefs ids={n.claimIds} claims={claims} /></li>)}
          </ul>
        </Section>
      )}

      {g.openQuestions.length > 0 && (
        <Section title="What we couldn't determine">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{g.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </Section>
      )}

      <Section title="Evidence" id="evidence">
        <p className="text-sm muted">
          Every claim above links here. {g.verifiedAt ? `Key claims were re-checked against their sources on ${g.verifiedAt.slice(0, 10)}.` : "Not yet re-checked."}
        </p>
        <ul className="card divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {g.claims.map((c) => (
            <li key={c.id} id={c.id} className="grid scroll-mt-6 gap-2 p-3 target:bg-amber-50 sm:grid-cols-[3rem_1fr_auto] dark:target:bg-amber-950/40">
              <span className="font-mono text-xs muted">{c.id}</span>
              <div className="space-y-1">
                <div>{c.statement}</div>
                {c.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-sky-700 hover:underline dark:text-sky-400">{s.title || s.url}</a>
                ))}
                {c.note && <div className="text-xs muted">{c.note}</div>}
              </div>
              <span className={`chip h-fit ${EVIDENCE[c.status].cls}`} title={EVIDENCE[c.status].blurb}>{EVIDENCE[c.status].label}</span>
            </li>
          ))}
        </ul>

        {g.probes.length > 0 && (
          <details className="card p-3 text-sm">
            <summary className="cursor-pointer font-medium">Live probes the agent ran ({g.probes.length})</summary>
            <ul className="mt-2 space-y-2">
              {g.probes.map((p, i) => (
                <li key={i} className="font-mono text-xs">
                  <span className={p.ok ? "text-emerald-600" : "text-rose-600"}>{p.ok ? "✓" : "✗"}</span> {p.name} <span className="muted break-all">{p.target}</span>
                  <div className="mt-0.5 break-words muted">{p.result}</div>
                </li>
              ))}
            </ul>
          </details>
        )}

        {g.corrections && g.corrections.length > 0 && (
          <div className="card p-3 text-sm">
            <div className="font-medium">Human review: what we corrected in the agent&rsquo;s draft</div>
            <ul className="mt-2 space-y-3">
              {g.corrections.map((c, i) => (
                <li key={i}>
                  <div className="font-medium">{c.what}</div>
                  <div className="muted"><span className="line-through">{c.before}</span> → {c.after}</div>
                  <div className="text-xs muted">{c.evidence}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {g.agentRun && (
          <p className="text-xs muted">
            Agent run: {g.agentRun.model}, {g.agentRun.searches} searches, {g.agentRun.fetches} pages read, {g.agentRun.probes} live probes, {g.agentRun.durationSec}s.
          </p>
        )}
      </Section>
    </article>
  );
}
