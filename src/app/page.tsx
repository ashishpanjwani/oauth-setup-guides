import Link from "next/link";
import { Search } from "@/components/search";
import { AppMark } from "@/components/app-mark";
import { allGuides } from "@/lib/store";
import { DIFFICULTY } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Home() {
  const guides = await allGuides();

  return (
    <div className="space-y-20">
      <section className="fade-up space-y-6 pt-8 text-center sm:pt-14">
        <h1 className="mx-auto max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Get your OAuth app <em className="gradient-text not-italic sm:italic">approved</em>, without the guesswork.
        </h1>
        <p className="mx-auto max-w-lg text-[15px] leading-relaxed muted">
          Look up an app to get a guide you can share, and know what to do next.
        </p>
        <div className="pt-2">
          <Search existing={guides.map((g) => ({ slug: g.slug, appName: g.appName }))} />
        </div>
      </section>

      <section id="guides" className="scroll-mt-24 space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">Guides</h2>
          <span className="text-sm muted">{guides.length} apps</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guide/${g.slug}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="card hover-glow fade-up group flex flex-col p-5"
            >
              <div className="flex items-center gap-3.5">
                <AppMark name={g.appName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">{g.appName}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY[g.difficulty].dot}`} />
                    <span className={DIFFICULTY[g.difficulty].cls}>{DIFFICULTY[g.difficulty].label}</span>
                    <span className="muted">·</span>
                    <span className={g.reviewed ? "text-emerald-300" : "muted"}>{g.reviewed ? "Reviewed" : "Not reviewed"}</span>
                  </div>
                </div>
                <span className="muted transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
              </div>
              <dl className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-sm">
                {[
                  ["Time to test", g.timeToTest],
                  ["To production", g.timeToProduction],
                  ["Cost", g.cost],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3">
                    <dt className="eyebrow pt-0.5">{k}</dt>
                    <dd className="leading-snug text-zinc-200">{v}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
