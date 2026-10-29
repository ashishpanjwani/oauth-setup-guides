import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/store";
import { DIFFICULTY, EVIDENCE, WHO } from "@/lib/labels";
import { CopyMarkdown } from "@/components/share-bar";
import { AppMark } from "@/components/app-mark";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: `${g.appName} OAuth app guide`, description: g.summary } : {};
}

/** URLs in step text render as wrapping monospace, so a long link can't stretch the card. */
function WithCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+[^\s.,;])/).map((part, i) =>
        i % 2 ? (
          <code key={i} className="break-all rounded bg-white/5 px-1 py-0.5 font-mono text-[0.85em] text-zinc-200">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-display text-[28px] leading-tight">{children}</h2>
    </div>
  );
}

export default async function GuidePage({ params }: Props) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();

  // Claims render as footnote numbers in reading order. A line with no tested or sourced
  // claim behind it is marked Unverified, so nothing unconfirmed reads as fact.
  const num = new Map(g.claims.map((c, i) => [c.id, i + 1]));
  const status = new Map(g.claims.map((c) => [c.id, c.status]));
  const Refs = ({ ids }: { ids: string[] }) => {
    const n = ids.filter((id) => num.has(id));
    const backed = n.some((id) => status.get(id) !== "uncertain");
    return (
      <>
        {n.length > 0 && (
          <sup className="ml-0.5 space-x-1 font-mono text-[10px]">
            {n.map((id) => (
              <a key={id} href={`#${id}`} className="text-[#8fc2ff] transition hover:text-[var(--cyan)]">
                {num.get(id)}
              </a>
            ))}
          </sup>
        )}
        {!backed && (
          <span className={`chip ml-1.5 px-1.5 py-0 align-middle text-[10px] ${EVIDENCE.uncertain.cls}`} title="No tested or sourced claim confirms this line">
            Unverified
          </span>
        )}
      </>
    );
  };

  const gates = (g.gates ?? []).filter((x) => x.applies === "yes");
  // Older guides have no phase; their steps all count as setup.
  const steps = g.steps.map((s, i) => ({ ...s, n: i + 1, phase: s.phase ?? "setup" }));
  const agentSteps = steps.filter((s) => s.who === "agent").length;
  const parts = [
    { title: "Set up and test", time: g.timeToTest, steps: steps.filter((s) => s.phase === "setup") },
    { title: "Go live", time: g.timeToProduction, steps: steps.filter((s) => s.phase === "launch") },
  ].filter((p) => p.steps.length > 0);
  const stats: [string, React.ReactNode][] = [
    [
      "Difficulty",
      <span key="d" className={`inline-flex items-center gap-2 font-semibold ${DIFFICULTY[g.difficulty].cls}`}>
        <span className={`h-2 w-2 rounded-full ${DIFFICULTY[g.difficulty].dot}`} />
        {DIFFICULTY[g.difficulty].label}
      </span>,
    ],
    ["Time to test", g.timeToTest],
    ["Time to production", g.timeToProduction],
    ["Effort", g.effort],
    ["Cost", g.cost],
    [
      "Agent and you",
      <span key="h">
        <span className="text-violet-300">
          An agent can do {agentSteps} of {steps.length} steps.
        </span>{" "}
        {g.handoff}
      </span>,
    ],
  ];

  return (
    <article className="mx-auto max-w-3xl space-y-14">
      <header className="fade-up">
        <Link href="/" className="-mt-4 inline-block text-sm muted transition hover:text-white sm:-mt-6">
          ← All guides
        </Link>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AppMark name={g.appName} size="lg" />
            <h1 className="font-display text-5xl leading-none tracking-tight">{g.appName}</h1>
          </div>
          <CopyMarkdown guide={g} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          {g.reviewed ? (
            <span className="chip bg-emerald-500/10 text-emerald-300 ring-emerald-400/30">✓ Reviewed by a person</span>
          ) : (
            <span className="chip bg-white/5 text-zinc-300 ring-white/15">Generated, not reviewed</span>
          )}
          <span className="muted">Checked {g.checkedAt.slice(0, 10)}</span>
          <a href={g.developerPortal} target="_blank" rel="noreferrer" className="text-[#8fc2ff] transition hover:text-[var(--cyan)]">
            Developer portal ↗
          </a>
        </div>
      </header>

      <section className="card gradient-border fade-up overflow-hidden" style={{ animationDelay: "80ms" }}>
        <p className="p-6 text-lg leading-relaxed sm:p-7">
          {g.summary}
          <Refs ids={g.summaryClaimIds} />
        </p>
        {/* Short values side by side; the two that are usually sentences get full-width rows. */}
        <dl className="grid grid-cols-3 border-t border-[var(--border)] bg-[var(--surface)]/60">
          {stats
            .filter(([k]) => ["Difficulty", "Time to test", "Effort"].includes(k))
            .map(([k, v], i) => (
              <div key={k} className={`p-4 sm:p-5 ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1.5 text-sm font-medium leading-snug">{v}</dd>
              </div>
            ))}
        </dl>
        <dl className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface)]/60">
          {stats
            .filter(([k]) => ["Time to production", "Cost", "Agent and you"].includes(k))
            .map(([k, v]) => (
              <div key={k} className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr] sm:gap-4 sm:px-5">
                <dt className="eyebrow pt-0.5">{k}</dt>
                <dd className="text-sm font-medium leading-snug">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      {gates.length > 0 && (
        <section>
          <SectionTitle eyebrow="Watch out">What can stop you from launching</SectionTitle>
          <div className="space-y-3">
            {gates.map((x) => (
              <div key={x.gate} className="card relative overflow-hidden p-5 pl-6">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_0_16px_rgba(251,191,36,0.6)]" />
                <div className="font-medium">
                  {x.title}
                  <Refs ids={x.claimIds} />
                </div>
                {x.what && <p className="mt-2 text-sm leading-relaxed text-zinc-300">{x.what}</p>}
                <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[6.5rem_1fr]">
                  {x.where && (
                    <>
                      <dt className="eyebrow pt-0.5">Where</dt>
                      <dd className="text-zinc-300">{x.where}</dd>
                    </>
                  )}
                  {x.todo && (
                    <>
                      <dt className="eyebrow pt-0.5">What to do</dt>
                      <dd className="text-zinc-300">{x.todo}</dd>
                    </>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle eyebrow="Before you start">Requirements</SectionTitle>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {g.requirements.map((r, i) => (
            <li key={i} className="card flex gap-3 p-4 text-sm leading-relaxed">
              <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand)]/15 text-[11px] text-[#8fc2ff]">
                ✓
              </span>
              <span>
                {r.text}
                <Refs ids={r.claimIds} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {parts.map((part) => (
        <section key={part.title}>
          <SectionTitle eyebrow={`Steps ${part.steps[0].n}–${part.steps[part.steps.length - 1].n} · ${part.time}`}>{part.title}</SectionTitle>
          <ol className="relative space-y-3">
            <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-[var(--brand)]/60 via-[var(--border)] to-transparent" />
            {part.steps.map((s) => (
              <li key={s.n} className="relative flex gap-4">
                <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] font-mono text-sm text-[#8fc2ff]">
                  {s.n}
                </span>
                <div className="card min-w-0 flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1 font-medium leading-snug">
                      <WithCode text={s.text} />
                      <Refs ids={s.claimIds} />
                    </div>
                    <span className={`chip ${WHO[s.who].cls}`}>{WHO[s.who].label}</span>
                  </div>
                  {s.why && <p className="mt-2 text-sm leading-relaxed text-zinc-300">{s.why}</p>}
                  {s.detail && (
                    <p className="mt-2 border-l-2 border-[var(--border-strong)] pl-3 text-sm leading-relaxed muted">
                      <WithCode text={s.detail} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section>
        <SectionTitle eyebrow="If something goes wrong">Blockers</SectionTitle>
        <div className="space-y-3">
          {g.blockers.map((b, i) => (
            <div key={i} className="card grid gap-3 p-4 text-sm sm:grid-cols-2 sm:gap-5">
              <div>
                <p className="eyebrow text-rose-300/80">Problem</p>
                <p className="mt-1 font-medium leading-snug">
                  {b.problem}
                  <Refs ids={b.claimIds} />
                </p>
              </div>
              <div className="sm:border-l sm:border-[var(--border)] sm:pl-5">
                <p className="eyebrow text-emerald-300/80">Fix</p>
                <p className="mt-1 leading-relaxed text-zinc-300">{b.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {g.couldNotVerify.length > 0 && (
        <section>
          <SectionTitle eyebrow="Open questions">Could not verify</SectionTitle>
          <ul className="card divide-y divide-[var(--border)] text-sm">
            {g.couldNotVerify.map((x, i) => (
              <li key={i} className="flex gap-3 p-4 leading-relaxed text-zinc-300">
                <span aria-hidden className="text-orange-300">?</span>
                {x}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-[var(--border)] pt-12">
        <SectionTitle eyebrow={`${g.claims.length} claims`}>Evidence</SectionTitle>
        <p className="-mt-2 mb-5 text-sm muted">
          Every numbered reference above points here. Sourced quotes were checked word for word against the page they cite.
        </p>
        <ol className="space-y-2.5 text-sm">
          {g.claims.map((c, i) => (
            <li
              key={c.id}
              id={c.id}
              className="flex scroll-mt-24 gap-3 rounded-xl border border-transparent p-3 transition target:border-[var(--brand)]/50 target:bg-[var(--brand)]/5"
            >
              <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs muted">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="leading-snug">
                  <span className={`chip mr-2 ${EVIDENCE[c.status].cls}`}>{EVIDENCE[c.status].label}</span>
                  {c.statement}
                </div>
                {c.quote && <blockquote className="border-l-2 border-[var(--brand)]/40 pl-3 italic leading-relaxed muted">&ldquo;{c.quote}&rdquo;</blockquote>}
                {c.sourceUrl && (
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-[#8fc2ff] transition hover:text-[var(--cyan)]">
                    {c.sourceTitle || c.sourceUrl} ↗
                  </a>
                )}
                {c.note && <div className="text-xs muted">{c.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
