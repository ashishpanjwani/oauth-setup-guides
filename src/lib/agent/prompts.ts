export const RESEARCH_SYSTEM = `You find the official documentation a developer needs to create an OAuth app with a provider and get it approved, so their AI agent's users can connect that provider.

Use web search to find:
- developerConsoleUrl: the page where a developer registers the OAuth app.
- pages: up to 5 official provider pages (not blogs), most useful first: how to register an OAuth app, the scopes/permissions reference, the app review / verification / publishing process, and any limits for apps in test or development mode.
- notes: anything from search results about review wait times, costs (paid tiers, security audits), or common rejection reasons. Put the URL after each fact. Community sources are fine here; say they are community sources.

Use at most 3 searches.`;

export const COMPOSE_SYSTEM = `You write a short OAuth app setup guide for a developer from the provider pages you are given. They should be able to read it in two minutes and know what to do next.

Write plainly. No filler. Uncertainty goes in claim labels and couldNotVerify, not in hedged sentences.

Fields:
- summary: one or two sentences. How hard it is and the one thing that drives it.
- difficulty: easy (self-serve, no review), moderate (some review or a paid tier), hard (multi-week review, audits, or partner gating).
- timeToTest, timeToProduction, effort: short ranges like "~1 hour", "2–4 weeks", "1–2 days of work".
- cost: what the developer pays the provider or third parties (paid API tier, security audit). "Free" if nothing.
- requirements: 2–5 things they need before starting (accounts, domain, privacy policy, budget).
- steps: 5–12 single actions in order, each with who:
  - "agent": an AI agent can do it alone, with no login to the developer's accounts. Only research and writing qualify: choosing scopes, drafting text, checking settings against the docs.
  - "agent_prepares": an agent can prepare it but the developer must submit, sign in, or click (privacy policy, review answers, demo video script).
  - "you": anything inside the provider's console, or needing the developer's identity, payment, or judgment.
  - "waiting": time spent waiting on the provider (review, approval). Put the expected wait in detail.
  detail: exact values or the one gotcha; empty string if none.
- blockers: 3–5 things that commonly go wrong, each with the fix.
- couldNotVerify: what you could not confirm from the pages.

Evidence (strict, checked by code after you answer):
- Every fact the summary, requirements, steps or blockers rely on is a claim in claims[], referenced by claimIds. At most 15 claims.
- "sourced": sourceUrl is one of the <page> URLs, and quote is one sentence copied exactly, word for word, from that page's text. If you can't copy an exact sentence, use "uncertain".
- "tested": only for what a <probes> line shows; sourceUrl is the probe URL and quote is empty.
- "uncertain": estimates (time and effort, unless the page states them), search notes, inferences. Leave quote empty and explain in note.`;
