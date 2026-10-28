import Link from "next/link";
import { Search } from "@/components/search";
import { allGuides } from "@/lib/store";
import { DIFFICULTY } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function Home() {
  const guides = await allGuides();

  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-4">
        <h1 className="text-3xl font-semibold tracking-tight">OAuth app setup guides</h1>
        <p className="max-w-2xl muted">
          How hard it is to get an app&rsquo;s OAuth app working and approved, how long it takes, and which steps an agent can do for you.
        </p>
        <Search existing={guides.map((g) => ({ slug: g.slug, appName: g.appName }))} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium muted">Guides</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="card flex flex-col gap-3 p-4 transition hover:border-zinc-400 dark:hover:border-zinc-600">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{g.appName}</span>
                <span className={`text-sm font-medium ${DIFFICULTY[g.difficulty].cls}`}>{DIFFICULTY[g.difficulty].label}</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs muted">To production</dt>
                  <dd>{g.timeToProduction}</dd>
                </div>
                <div>
                  <dt className="text-xs muted">Cost</dt>
                  <dd className="line-clamp-2">{g.cost}</dd>
                </div>
              </dl>
              <span className="mt-auto text-xs muted">{g.reviewed ? "Reviewed by a person" : "Generated, not reviewed"}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
