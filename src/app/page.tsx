import Link from "next/link";
import { Search } from "@/components/search";
import { allGuides } from "@/lib/store";
import { DIFFICULTY } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Home() {
  const guides = await allGuides();

  return (
    <div className="space-y-20">
      <section className="fade-up space-y-7 pt-6 text-center sm:pt-12">
        <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />
          Researched live · every quote checked against the docs
        </span>
        <h1 className="mx-auto max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Get your OAuth app <em className="gradient-text not-italic sm:italic">approved</em>, without the guesswork.
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-relaxed muted">
          How hard it is, how long approval takes, what will block you, and which steps an agent can do for you. For any app.
        </p>
        <Search existing={guides.map((g) => ({ slug: g.slug, appName: g.appName }))} />
      </section>

      <section id="guides" className="scroll-mt-24 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="mt-1 font-display text-3xl">Guides</h2>
          </div>
          <span className="text-sm muted">{guides.length} apps</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guide/${g.slug}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="card hover-glow fade-up group flex flex-col gap-4 p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand)]/25 to-[var(--cyan)]/10 font-display text-xl">
                  {g.appName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{g.appName}</div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY[g.difficulty].dot}`} />
                    <span className={DIFFICULTY[g.difficulty].cls}>{DIFFICULTY[g.difficulty].label}</span>
                  </div>
                </div>
                <span className="muted transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-sm">
                <div>
                  <dt className="eyebrow">To production</dt>
                  <dd className="mt-1 line-clamp-2">{g.timeToProduction}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Cost</dt>
                  <dd className="mt-1 line-clamp-2">{g.cost}</dd>
                </div>
              </dl>
              <span className={`mt-auto text-xs ${g.reviewed ? "text-emerald-300" : "muted"}`}>
                {g.reviewed ? "✓ Reviewed by a person" : "Generated, not reviewed"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
