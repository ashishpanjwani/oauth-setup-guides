# OAuth Setup Guides

Look up an app and get a guide for creating its OAuth app and getting it approved. Each guide says how hard it is, how long it takes (including the approval wait), what can block you, and which steps an agent can do for you. If there's no guide yet, an agent researches the app live and writes one in about 2–5 minutes.

**Live:** _add link after deploy_ · **Repo:** https://github.com/ashishpanjwani/oauth-setup-guides

## Try it

- **Library guides:** GitHub, Gmail, Slack, X, Shopify, Instagram. They were picked for different setup challenges (table below).
- **Live generation:** type any app name or website on the home page, e.g. Notion, Pipedrive, Strava or xero.com. Inputs that aren't an app (an email, a sentence, gibberish) are rejected before any real work starts.
- **Share:** every guide has Copy link, Copy as Markdown (a checklist with numbered sources) and Save as PDF.

## The problem, as we came to understand it

- **The registration form is rarely the hard part.** Creating the app takes minutes almost everywhere. What developers can't predict is the gap between "works for me in dev" and "any user can connect". Examples: Google's verification and security assessment, Meta's App Review plus Business Verification, Shopify's protected-data approval, X's paid tiers, a GitHub organization owner approving each app.
- **The path depends on the app type.** Shopify has three ways to get a token, Notion has three kinds of connection, and Meta has two login products. A guide that doesn't say which path it covers sends developers down the wrong one.
- **Plain AI answers read well but can't be trusted line by line.** We compared our guides with ChatGPT and Google AI Mode throughout. Theirs were followable, but they used outdated names, invented options (a "Delete content" capability Notion doesn't have) and missed nuances like Notion's permanent installation scope.

## How we got here: problems, decisions and why

The product changed a lot while we built it. Each change below started with a problem in a real guide.

1. **We started too big.** The first version had a 382-app directory, four-tier evidence, a second fact-checking agent and branding from a platform the brief never asked for. **Decision:** cut back to two pages, a search box with guide cards and a guide page, with no third-party branding. **Why:** the point is to make a developer's life simpler, and the first version was built to prove rigor, not to be read.
2. **Six parallel runs on the top model used up a $6 credit** in minutes. **Decision:** a smaller model for research, a cap per run and per day, and every change tested on one app before running more. **Why:** a live demo anyone can trigger needs a hard ceiling, and a wrong change repeated across six apps is wasted six times.
3. **A model judging another model was slow, costly and hard to trust.** **Decision:** a pipeline designed by Ashish. The model researches and writes. Code fetches the pages and checks that every quote appears on its page, word for word. **Why:** a code check can't be argued with, it cost about $0.04 per guide instead of about $0.70, and it's easy to explain.
4. **Summaries were vague** ("no review step found"), and the real catch was missing. For GitHub that catch is that organizations block new apps until an owner approves them. **Decision:** every app is checked against the same **six launch gates**: who can register, test-mode limits, provider review, end users' admin approval, paid access, ongoing obligations. The guide shows only the gates that apply. **Why:** the same questions work for any provider, so the agent can't skip the one that matters.
5. **Fixing one rule broke another.** On the small model, each prompt change shifted attention, and fixes from earlier runs kept coming back. **Decision:** mechanical rules moved into code (a phrase checker, a check that the required page types were found, a known-facts check for library guides), and the writer moved to a stronger model. **Why:** prompts alone didn't converge. Code catches slips every time.
6. **Right fact, wrong citation.** A check found that 10 of Gmail's 19 claims quoted a sentence that didn't support them. Most of the facts were true. **Decision:** any line without a confirming quote shows an **Unverified** tag. A downgrade-only check tests whether each quote supports its claim, failed claims are re-quoted automatically, and each claim holds one fact. **But** 15 orange tags made the guide worse to read ("What is the developer gonna do looking at these guides? Look more confused"). So we **fix the guide, not the label**: a library guide isn't published with more than 2–3 Unverified lines.
7. **The docs lag the live UI.** GitHub's form says "Redirect URIs", while its docs still say "Authorization callback URL". **Decision:** **Tested** means a person observed it on the live form. **Why:** an agent that only reads docs can't see what the docs haven't caught up with.
8. **Steps read like a list of facts, not a walkthrough.** Gmail's guide once started with "create a brand", before the project even existed. Prompt fixes didn't stick. **Decision:** Ashish's **Architect/Builder** idea, with code as the Architect. A fixed skeleton of step slots sets the order (decide scopes → create app → enable API → … → redirect URI → credentials → test users → test connection → publish → review → go live). Code checks that the required slots are filled, and the model only builds each slot for the provider. Steps start with where they happen, and a step that produces something says which later step uses it. **Why:** order is structure, and structure belongs in code. Content is what the model is good at.
9. **Guides drifted into building app features** (Slack bots, events) and into optional app-store listings. **Decision:** steps cover OAuth setup only, and a store listing is a step only when users can't connect without it.
10. **Shopify's guide followed the wrong path.** It covered embedded apps, while an AI agent is an outside app. **Decision:** every guide covers **an outside, server-side app that many users connect to**, and names that path and the alternatives in a "This guide covers" line.
11. **The stats were guesses.** "Free" was labelled an estimate, and effort was made up. **Decision:** the summary stats are computed in code from the checked gates and steps, and each shows what it's based on. Effort became a count of steps.
12. **The assignment asks agents to "attempt the setup".** We tried it on X, testing endpoints with fake values and keeping a per-step attempt record. It produced HTTP errors that meant nothing to a reader, so we reverted it (details below).
13. **Live search had to work for anyone.** **Decision:** a library match opens instantly and for free. Bad input (an email, a sentence) is caught in the browser, and a ~1¢ check rejects names that aren't apps. Progress shows each stage, a time guard keeps runs inside Vercel's 300-second limit, and every run is recorded for free replay.
14. **Notion's live runs exposed contradictions in our own code.** The stats said "no review" while Notion's docs mention one, and later "No review wait" sat next to "provider review". **Decision:** stats never claim more than the evidence ("review not confirmed", "Review time not published"), and the summary no longer names a difficulty level. Step links were added too. A link must be a URL the agent actually opened, and the create-app step uses the address the console redirected to. That was Ashish's correction to a looser "same site" rule.

## What a guide contains

| Section | Why it's there |
|---|---|
| Summary: Difficulty, Time to test, Time to production, Cost, Steps, Agent and you | The assignment's four questions, answered before any step |
| "This guide covers" | Names the app type or grant and the alternatives, so you know you're on the right path |
| What can stop you from launching | Only the obstacles that apply. Every app is checked against six: who can register, test-mode limits, provider review, end users' admin approval, paid access, ongoing obligations |
| Requirements | Only what you need before you start |
| Steps in two parts, **Set up and test** and **Go live** | Each step starts with where it happens, says what to click, and is labelled **Agent**, **You** or **Waiting** |
| Blockers | Common problems, each with its fix |
| Could not verify | Open questions, stated plainly |
| Evidence | Every line links to the exact quote behind it |

## Evidence

Each claim has a label:
- **Tested:** observed by a person on the live UI. Example: GitHub's live form says "Redirect URIs" while its docs still say "Authorization callback URL".
- **Sourced:** an exact quote from an official page that the agent fetched. **Code checks the quote is on the page, word for word.**
- **Uncertain:** everything else, with the reason shown.

Any guide line without a Tested or Sourced claim behind it shows an **Unverified** tag. A second model check asks whether each quote actually supports its statement. That check can only downgrade a claim, so its mistakes make a guide more cautious, never less.

**What we checked and corrected:**
- **All 6 library guides, re-checked on 2026-10-29:** 143 of 143 quotes are on their live pages, and 0 of 128 guide lines are Unverified.
- **Gmail, line by line:** the support check found 10 of 19 claims citing the wrong sentence. Most were true facts tied to the wrong quote. The manual check also found a missing step ("Publish app"), which no automated check caught.
- **Shopify:** the first run followed the embedded-app path. We corrected it to the authorization code grant, and found that new public apps must use expiring offline tokens.
- **Notion, three live runs compared with the docs:** this caught our own stats code saying "no review" while Notion's docs say the authorization URL "populates after a public connection is submitted for review". The code was fixed so stats never claim more than the evidence.
- **Pipedrive (live run):** 23 of 23 quotes on their pages, including the sandbox-account requirement and the 21-business-day review.

## Using agents, and the "attempt the setup" line

- **What the agent does:** researches the official docs, reads the pages in code, checks that the developer console loads, writes the guide, then checks its own quotes.
- **What it doesn't do:** create apps. That needs your login, most providers have no API for creating OAuth apps (GitHub has none), and the client secret should never pass through an agent.
- **How the handoff is shown instead:** every step is labelled. **Agent** steps are work an agent can actually do for you: pick the narrowest scopes, build the authorize URL, write the app description and review justifications. **You** steps need your account or judgment. The summary's "Agent and you" line says the split in one sentence.
- **Tried and reverted:** on X, an agent tested endpoints with fake values and kept a per-step "attempt record". It produced HTTP error messages that didn't help a reader, so we removed it. Automated attempts are limited to the console check. Hands-on evidence comes from a person (the GitHub screenshots).

## Cost decisions

- **Models:** Claude Haiku 5.5 for research and checks, Claude Sonnet 5.5 for writing and editing. Haiku alone dropped a few of about 25 writing rules on every run, and Sonnet had zero violations on its first test. The writer costs about 4× more, which is worth it for the main output.
- **A live run costs $0.21–0.46** and takes 1.3–4.6 minutes, based on recorded runs.
- **Guards:** $0.80 per run, $10 per day across all visitors, and 6 runs an hour per visitor. A time guard skips the last polishing steps near Vercel's 300-second limit. A library match costs nothing, and gibberish costs about 1¢ to reject.
- **Lesson from the build:** an early batch of six parallel Opus runs used up a $6 credit. After that, every change was tested on one app before running more. Total API spend for the whole build is about $13.

## Limitations, and what we left on purpose

- **6 guides, not 100.** The pipeline is the same for every app; the library just needs runs plus a human check.
- **Live guides aren't reviewed by a person,** and they vary between runs. Notion's three runs differed in steps and wording. Unclear docs produce unclear guides; the evidence labels show it, but don't fix it.
- **The agent reads docs, not the live UI.** It can't see interface changes the docs haven't caught up with. Pages rendered by JavaScript or protected from bots (help.shopify.com, Salesforce help) can't be read, so those facts come out Uncertain.
- **Known rough edges we chose not to chase:**
  - A step can say "then create" one step before the last setting on the same form.
  - Go-live steps can be thin when the docs mention a review but not how to submit one.
  - An Agent/You label is occasionally wrong (e.g. recording a demo video).
  - There's no check yet that a cited claim supports the *line* it's attached to, only its own statement.
- **Demo-grade protection:** the rate limit is per server instance, and the daily budget is best-effort under concurrent runs. The real backstop is the spend limit on the API key.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=your-key" > .env.local   # needed only for live generation
npm run dev                                      # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live generation. Library guides work without it. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage for generated guides, run recordings and the daily budget. Without it, they go to `.data/` locally. |
| `RUN_CAP_USD`, `DAILY_CAP_USD` | Optional overrides of the $0.80 per-run and $10 per-day caps |

- **Replay a recorded run for free:** `/generate?q=<app>&replay=<slug>`
- **Add a library guide:** `npx tsx --env-file=.env.local scripts/seed.ts "HubSpot"`, then check it by hand before committing `data/guides/<slug>.json`.
- **Deploy:**
  1. Import the repo in Vercel.
  2. Add `ANTHROPIC_API_KEY`.
  3. Connect a Blob store.
  4. Keep Fluid Compute on (live runs need up to 300 seconds).
  5. Set a spend limit on the API key.

**Code map:**
- `src/lib/agent/`: the pipeline, prompts and cost tracking.
- `src/lib/stats.ts`: the computed summary.
- `src/lib/schema.ts`: the guide format and step skeleton.
- `src/app/`: the home, generate and guide pages.
- `data/guides/`: the library.
