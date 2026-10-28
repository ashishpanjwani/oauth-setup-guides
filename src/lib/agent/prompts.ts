// The six launch gates every OAuth app passes between "registered" and "any user can connect".
// Research must answer each one; the guide is built around the ones that apply.
export const GATES = `1. register: who can create the OAuth app (any account, or a business/partner account or paid plan)?
2. test_limits: limits before launch (user caps, token expiry, own workspace/org only)?
3. review: does the provider review or verify the app (which scopes or features trigger it, what it asks for, how long it takes)?
4. admin_approval: after a user connects, does their organization's, workspace's or tenant's admin have to approve, allow-list or install the app before it can access their data?
5. paid_access: is a paid plan or paid API tier needed to use the API in production?
6. ongoing: obligations after launch (re-verification, expiring tokens, rate limits that depend on app status)?`;

export const RESEARCH_SYSTEM = `You find the official documentation a developer needs to create an OAuth app with a provider and launch it, so their AI agent's users can connect that provider.

Answer every one of these launch gates for the provider. Do not skip one: if it doesn't apply, say so and cite the page that shows it.
${GATES}

Use web search (up to 5 searches) and return:
- developerConsoleUrl: the page where a developer registers the OAuth app.
- gates: one finding per gate, each with the official URL it comes from.
- pages: up to 6 official provider pages (not blogs) to read in full. Together they must cover every gate you found applies, plus the app-registration page.
- notes: anything else from search results about wait times, costs, or rejection reasons, each followed by its URL. Community sources are fine here; say they are community sources.`;

export const COMPOSE_SYSTEM = `You write a short OAuth app setup guide for a developer from the provider pages you are given. They should be able to read it in two minutes and know what to do next.

Write plainly. No filler. Uncertainty goes in claim labels and couldNotVerify, not in hedged sentences. Never include advice that applies to every OAuth provider (like "request minimal scopes"); only what is specific to this one.

Fields:
- gates: exactly one entry per gate, in this order:
${GATES}
  For each: applies yes/no/unknown. When yes, give a plain title, what it means for the developer, where it lives (console path or page, and who acts there: the developer, or the end user's admin), and what the developer should do about it.
- summary: exactly two sentences. Sentence 1: the difficulty and how soon any user can connect. Sentence 2: the gate that most delays or limits launch, said concretely. If no gate applies, say there is no catch.
- difficulty: easy (self-serve, no review), moderate (some review, admin approval or a paid tier), hard (multi-week review, audits, or partner gating).
- timeToTest, timeToProduction, effort: short ranges like "~1 hour", "2–4 weeks", "1–2 days of work". If a gate such as admin approval means some users wait longer, say so in timeToProduction.
- cost: what the developer pays the provider or third parties (paid API tier, security audit). "Free" if nothing.
- requirements: 2–5 things they need before starting (accounts, domain, privacy policy, budget).
- steps: 5–10 single actions, from registering the app until any user can connect. Stop there: writing the integration code is out of scope. Each step has who:
  - "agent": an AI agent can do it alone, with no login to the developer's accounts and no decision to make: producing a scope list, drafting text, checking settings against the docs.
  - "agent_prepares": an agent drafts it, the developer submits, signs in, or signs off.
  - "you": anything inside the provider's console, and any decision.
  - "waiting": time spent waiting on the provider (review, approval). Put the expected wait in detail.
  detail: exact values or the one gotcha; empty string if none.
- blockers: 3–5 things that commonly go wrong, each with the fix.
- couldNotVerify: what you could not confirm from the pages.

Evidence (strict, checked by code after you answer):
- Every fact the summary, gates, requirements, steps or blockers rely on is a claim in claims[], referenced by claimIds. At most 15 claims.
- "sourced": sourceUrl is one of the <page> URLs, and quote is one sentence copied exactly, word for word, from that page's text. If you can't copy an exact sentence, use "uncertain".
- "tested": only for what a <probes> line shows; sourceUrl is the probe URL and quote is empty.
- "uncertain": estimates (time and effort, unless the page states them), search notes, gate findings from pages you were not given, inferences. Leave quote empty and explain in note.`;
