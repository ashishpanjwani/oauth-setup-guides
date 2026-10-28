import Link from "next/link";
import { Search } from "@/components/search";
import { DirectoryTable } from "@/components/directory-table";
import { Difficulty } from "@/components/guide-bits";
import { libraryGuides } from "@/lib/store";
import { DIRECTORY } from "@/lib/directory";
import { EVIDENCE, TIER } from "@/lib/labels";

export default function Home() {
  const library = [...libraryGuides()].sort((a, b) => a.verdict.difficulty - b.verdict.difficulty);
  const byo = DIRECTORY.toolkits.filter((t) => !t.managed).length;

  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-4">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Know what it takes to get an OAuth app approved <span className="muted">before you start.</span>
        </h1>
        <p className="max-w-2xl text-lg muted">
          Look up an app to see how hard setup is, how long approval takes, what usually blocks it, and which steps an agent can do for you.
          If there&rsquo;s no guide yet, an agent investigates the app live and writes one you can share.
        </p>
        <Search library={library.map((g) => ({ slug: g.slug, appName: g.appName, tier: g.verdict.tier }))} />
        <p className="text-sm muted">
          {byo} of {DIRECTORY.toolkits.length} OAuth toolkits on Composio have no managed app, so developers must register their own before any user can connect.
        </p>
      </section>

      <section id="library" className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Guide library</h2>
            <p className="text-sm muted">Agent-researched, fact-checked, then reviewed by a person. Ordered from easiest to hardest.</p>
          </div>
        </div>
        {library.length === 0 ? (
          <p className="card p-6 muted">No library guides yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((g) => {
              const tested = g.claims.filter((c) => c.status === "tested" || c.status === "verified").length;
              return (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="card group flex flex-col gap-3 p-4 transition hover:border-zinc-400 dark:hover:border-zinc-600">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{g.appName}</span>
                    <span className={`chip ${TIER[g.verdict.tier].cls}`}>{TIER[g.verdict.tier].label}</span>
                  </div>
                  <p className="text-sm muted line-clamp-2">{g.verdict.headline}</p>
                  <dl className="mt-auto grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="muted">To production</dt>
                      <dd className="font-medium">{g.verdict.timeToProduction}</dd>
                    </div>
                    <div>
                      <dt className="muted">Difficulty</dt>
                      <dd><Difficulty n={g.verdict.difficulty} /></dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between text-xs muted">
                    <span>{g.composio.managedAuth === "yes" ? "Composio-managed app available" : "Bring your own app"}</span>
                    <span>{tested}/{g.claims.length} claims checked</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-4">
        {(Object.keys(EVIDENCE) as (keyof typeof EVIDENCE)[]).map((k) => (
          <div key={k} className="space-y-1">
            <span className={`chip ${EVIDENCE[k].cls}`}>{EVIDENCE[k].label}</span>
            <p className="text-xs muted">{EVIDENCE[k].blurb}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Every OAuth app on Composio</h2>
          <p className="text-sm muted">Pick any app to generate its guide live. Start with the ones where you have to bring your own app.</p>
        </div>
        <DirectoryTable librarySlugs={library.map((g) => g.slug)} />
      </section>
    </div>
  );
}
