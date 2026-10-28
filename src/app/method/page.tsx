import Link from "next/link";
import { EVIDENCE, TIER, ACTOR } from "@/lib/labels";

export const metadata = { title: "How it works · OAuth App Readiness" };

export default function Method() {
  return (
    <article className="max-w-3xl space-y-10 text-[15px] leading-relaxed">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="muted">What these guides answer, how they&rsquo;re made, and how much to trust each part.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The problem these guides solve</h2>
        <p>
          When your agent&rsquo;s users connect an app, they authorize an <strong>OAuth app</strong>: a client ID and secret, a redirect URI, a set of
          scopes, and a consent screen. You register it once with the provider. On Composio, many apps have a <em>managed</em> OAuth app you can
          use immediately. You need your own when you want your brand on the consent screen, custom scopes, or your own rate limits, and when no
          managed app exists at all, which is the case for most toolkits.
        </p>
        <p>
          Filling in the registration form is the easy part. The real uncertainty is between &ldquo;it works for me in dev&rdquo; and &ldquo;any user can
          connect&rdquo;: app review, security assessments, business verification, partner programs, and paid API tiers. Every guide is built around
          that gap. It leads with how long until production, not just where to click.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reading a guide</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.values(TIER).map((t) => (
            <div key={t.label} className="card p-3 text-sm">
              <span className={`chip ${t.cls}`}>{t.label}</span>
              <p className="mt-2 muted">{t.blurb}</p>
            </div>
          ))}
        </div>
        <p>
          Every guide separates <strong>time to first connection</strong> (you connect your own account in dev) from <strong>time to
          production</strong> (anyone can connect), and <strong>hands-on effort</strong> from <strong>waiting</strong>. Steps follow four stages:
          register, configure, test, go live. Each step says who does it:
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.values(ACTOR).map((a) => <span key={a.label} className={`chip ${a.cls}`}>{a.label}</span>)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Evidence on every claim</h2>
        <p>Each factual statement a step or estimate depends on is a numbered claim with one of four labels:</p>
        <ul className="space-y-2">
          {Object.values(EVIDENCE).map((e) => (
            <li key={e.label} className="flex gap-3 text-sm">
              <span className={`chip h-fit ${e.cls}`}>{e.label}</span>
              <span className="muted">{e.blurb}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm muted">
          These rules are enforced in code, not just requested in the prompt. The writer can&rsquo;t mark anything verified. &ldquo;Tested&rdquo;
          requires a matching probe. A claim whose cited URL the agent never actually opened or found is downgraded to uncertain automatically.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How a guide is generated</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li><strong>Investigate.</strong> A Claude agent checks Composio&rsquo;s directory, searches and reads the provider&rsquo;s developer docs and review policies, and uses community reports only for real-world timelines.</li>
          <li><strong>Probe.</strong> Without provider accounts, the agent can&rsquo;t register an app. Instead it observes what is publicly testable: it fetches the OAuth discovery document, calls the authorize endpoint with a dummy client and Composio&rsquo;s redirect URI to see how the provider rejects it, and checks whether the app-registration portal sits behind a login.</li>
          <li><strong>Write.</strong> The findings become a structured guide. Every step, blocker and estimate points to claims.</li>
          <li><strong>Fact-check.</strong> A separate pass re-opens the cited source behind each key claim (verdict and blockers first). It marks the claim verified, or downgrades it and says why.</li>
          <li><strong>Human review</strong> (library guides only). A person reads the guide against the sources, and attempts setup where a free account allows. Corrections are recorded on the guide.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Limits</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Review wait times are rarely published as SLAs. Most are community-reported ranges, and they&rsquo;re labelled that way.</li>
          <li>The agent never signs in, registers apps, or submits reviews. Those steps are marked as yours.</li>
          <li>Provider policies change. Each guide shows when it was generated and checked.</li>
        </ul>
        <p><Link href="/" className="underline">Look up an app →</Link></p>
      </section>
    </article>
  );
}
