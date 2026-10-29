# OAuth Setup Guides

Guides for creating a provider's OAuth app and getting it approved, so an AI agent's users can connect that provider. Each guide answers four questions up front: how hard it is, how long it takes (including the approval wait), what can block launch, and which steps an agent can do versus which need the developer. For an app with no guide yet, an agent researches it live and writes one in about 2–5 minutes.

**Live:** _add link after deploy_ · **Repo:** https://github.com/ashishpanjwani/oauth-setup-guides

## The problem

Creating an OAuth app is rarely the hard part: the form takes minutes on almost every provider. What developers can't predict is the gap between "works in dev" and "any user can connect":

- Google's verification and security assessment
- Meta's App Review plus Business Verification
- Shopify's protected-data approval
- X's paid tiers
- a GitHub organization owner approving each app

The right path also depends on the app type. Shopify has three ways to get a token and Notion has three kinds of connection. Picking the wrong one wastes the whole setup.

Plain AI answers read well, but in a side-by-side check on Notion, ChatGPT used Notion's outdated names, listed a capability Notion doesn't have, and missed that the installation scope can't be changed later. **The product's bet is a followable walkthrough where every line is backed by the provider's own docs, and anything unconfirmed says so.**

## What it does

- **Library:** six guides chosen for different challenges.

  | App | What makes it different |
  |---|---|
  | GitHub | Easy, but an organization owner must approve each app |
  | Slack | Easy. Unlisted apps have tight rate limits |
  | X | Paid API tiers and PKCE |
  | Shopify | Embedded vs standalone app paths, a one-time fee and an App Store review |
  | Instagram | App Review per permission plus Business Verification |
  | Gmail | Restricted scopes, a security assessment, and a review of up to 6 weeks |
- **Live generation:** type any app name or website, e.g. Notion, Pipedrive or xero.com. Progress shows each stage, and the finished guide opens on its own.
- **Sharing:** Copy link, Copy as Markdown (a checklist with numbered sources) and Save as PDF.

**A guide reads top to bottom:**
1. A summary with computed stats.
2. "This guide covers", naming the app type and the alternatives.
3. What can stop you from launching.
4. Requirements.
5. Steps in two parts, **Set up and test** and **Go live**, each labelled **Agent**, **You** or **Waiting**.
6. Blockers with fixes.
7. Could not verify.
8. Evidence, with the exact quote behind every line.

## How it works

Models do the reading and writing. Code owns structure, ordering and every check that can be made mechanical.

| Stage | Done by | What happens |
|---|---|---|
| App check | Claude Haiku 5.5 | Rejects inputs that aren't apps (~1¢) and suggests a fix for typos |
| Research | Claude Haiku 5.5 + web search | Finds the official pages, labels each by kind (setup, scopes, review…), and answers the six launch gates |
| Coverage | Code | If a required page kind is missing, runs one targeted search |
| Read and probe | Code | Fetches the pages as English text, and checks whether the developer console loads and where it redirects |
| Write | Claude Sonnet 5.5 | Fills a fixed step skeleton and cites a quote for every fact |
| Quote check | Code | Every quote must appear word for word on the page it cites, or the claim is downgraded |
| Support check, re-quote | Claude Haiku 5.5 | Does each quote support its claim? This can only downgrade. Failed claims get one try to find the right sentence |
| Edit | Claude Sonnet 5.5 | Fixes rule problems found by a code checker, against a fixed checklist |
| Finish | Code | Orders the steps, checks gates and links, and computes the stats |

A live run costs $0.21–0.46 and takes 1.3–4.6 minutes, based on recorded runs.

## Product decisions

Each decision came from a problem seen in a real guide.

**Scope**
- **Two pages: search and guide.** The first build had a 382-app directory, four evidence tiers and a second fact-checking agent. It proved rigor but was hard to read, so it was cut back to what a developer uses.
- **Covers one path: an outside, server-side app that many users connect to.** This is the AI-agent case. Shopify's first guide followed the embedded-app path, so every guide now names its path and the alternatives.
- **OAuth setup only.** Slack's guide drifted into building a bot, and app-store listings kept appearing. A listing is a step only when users can't connect without it.

**What a guide shows**
- **Six launch gates, checked for every app:** who can register, test-mode limits, provider review, end users' admin approval, paid access, and ongoing obligations. Early summaries were vague ("no review step found") and missed GitHub's real catch, organization approval. A fixed set of questions means the one that matters can't be skipped. Only gates that apply are shown.
- **Stats computed in code, with their basis.** The writer's estimates were guesses; "Free" was once labelled an estimate. Difficulty comes from the gates. Time to production is the provider's stated review time in its own words ("up to 21 business days"). Effort became a step count. Stats never claim more than the evidence: "review not confirmed" and "Review time not published" exist because early stats said "no review" when the docs suggested one.
- **Agent / You / Waiting on every step.** This answers "what can an agent do for me". **Agent** means work an agent can actually do: pick scopes, build the authorize URL, write descriptions and review justifications. An earlier label, "agent prepares, you click", confused readers.

**Step structure: Architect and Builder**
- Steps read like facts in a list. Gmail's once started with "create a brand" before the project existed, and prompt fixes didn't stick.
- **The fix splits the work: code is the Architect and the model is the Builder.**
  - A fixed skeleton of slots sets the order: decide scopes → create app → enable API → … → redirect URI → credentials → test users → test connection → publish → review → go live.
  - Code checks that the required slots are filled, and the model writes each slot for the provider.
- **Steps form a walkthrough:**
  - Each starts with where it happens, then what to click.
  - A step that produces something says which later step uses it. Example: the Gmail demo video link goes into the review form.
  - The create-app step links straight to the developer portal.

**Evidence and trust**
- **Tested / Sourced / Uncertain on every claim.** Sourced quotes are checked in code, which replaced a second agent re-reading the sources. A code check gives the same answer every time.
- **An Unverified tag on any line with no confirmed claim.** A check found 10 of Gmail's 19 claims citing the wrong sentence, mostly for true facts. The fixes:
  - one fact per claim
  - automatic re-quoting
  - a downgrade-only support check
- **Fix the guide, not the label.** Fifteen orange tags made a guide more confusing, not more honest. A library guide isn't published with more than 2–3 Unverified lines.
- **Tested means observed on the live product,** not read in docs. So far that's only a person's check of GitHub's live form, which says "Redirect URIs" while the docs still say "Authorization callback URL". An agent that only reads docs can't see that.
- **Step links must be URLs the agent actually opened.** A looser "same site" rule was rejected. The create-app link is the address the console probe landed on.

**Agents and the "attempt the setup" requirement**
- **The agent doesn't create apps.** That needs the developer's login, providers like GitHub and X have no API for it, and the client secret should never pass through an agent.
- **A trial on X was reverted.** The agent tested endpoints with fake values and kept a per-step attempt record. The result was HTTP errors that meant nothing to a reader.
- **What remains:** automated attempts are limited to the console probe. Hands-on evidence comes from a person, and the handoff is shown through the step labels.

**Live search**
- **Cheapest path first:**
  1. A library match opens instantly.
  2. Bad input (an email, a sentence, symbols) is caught in the browser and again on the server.
  3. A ~1¢ check rejects names that aren't apps.
  4. Only then does the full run start.
- **Visible progress and safe limits:** each stage shows rows as it works, so a 2–5 minute wait never looks stuck. A time guard skips the last polishing steps near Vercel's 300-second limit. Every run is recorded for free replay.

**Cost**
- **Haiku researches and checks; Sonnet writes and edits.** Haiku alone dropped a few of about 25 writing rules on every run, and each prompt fix shifted attention elsewhere. Sonnet had zero rule violations on its first test. That raised a guide's cost from about $0.06 to about $0.25.
- **Hard limits:** $0.80 per run, $10 per day across visitors, and 6 runs an hour per visitor. These followed an early batch of six parallel runs on the top model that used up a $6 credit. Since then, every change was tested on one app before running more.
- **Mechanical rules live in code, not prompts:** a phrase checker, a page-coverage check, and a known-facts check (recorded so far for GitHub and Gmail). Prompt-only fixes kept regressing.

## What was checked

- **All 6 library guides, re-checked on 2026-10-29:** 143 of 143 quotes are on their live pages, and 0 of 128 lines are Unverified.
- **Gmail, line by line against Google's pages:** this found a missing step ("Publish app"), an unsourced recommendation and missing review timings. All were fixed, and 8 of 8 known facts are present.
- **Shopify:** corrected by hand from the embedded-app path to the authorization code grant. The manual check also added that new public apps must use expiring offline tokens.
- **Notion, three live runs, each checked against its docs (the first also against ChatGPT):**
  - Fixed the stats contradictions.
  - Added the step link.
  - Stopped the summary from naming its own difficulty level.
- **Pipedrive (live):** 23 of 23 quotes on their pages, including the sandbox-account requirement and the 21-business-day review.

Total API spend for the build was about $13, estimated from the app's own cost tracking.

## Limitations

- **6 guides, not 100.** Every guide uses the same pipeline. Growing the library takes more runs plus a human check of each.
- **Live guides aren't reviewed by a person and vary between runs.** Unclear docs, like Notion's on review, produce unclear guides. The labels show it but don't fix it.
- **The agent reads docs, not the live UI.** Pages rendered by JavaScript or protected from bots (help.shopify.com, Salesforce help) can't be read, so those facts come out Uncertain.
- **Known rough edges, left on purpose:**
  - A step can say "then create" one step before the last setting on the same form.
  - Go-live steps are thin when the docs don't say how to submit a review.
  - An Agent/You label is occasionally wrong.
  - Nothing yet checks that a claim supports the specific line citing it.
  - The app check's rejections and typo suggestions haven't been tested on real bad inputs yet.
- **Demo-grade protection.** The rate limit is per server instance, and the daily budget is best-effort under concurrent runs. The real backstop is the spend limit on the API key.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=your-key" > .env.local   # needed only for live generation
npm run dev                                      # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live generation. Library guides work without it |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for generated guides, recordings and the daily budget. Without it, they go to `.data/` |
| `RUN_CAP_USD`, `DAILY_CAP_USD` | Optional overrides of the $0.80 and $10 caps |

- **Replay a recorded run at no cost:** `/generate?q=<app>&replay=<slug>`
- **Add a library guide:** `npx tsx --env-file=.env.local scripts/seed.ts "HubSpot"`, then check it by hand before committing `data/guides/<slug>.json`.
- **Deploy:** import the repo in Vercel, add `ANTHROPIC_API_KEY`, connect a Blob store, keep Fluid Compute on (runs need up to 300 seconds), and set a spend limit on the API key.

**Code map:**
- `src/lib/agent/`: the pipeline, prompts and costs.
- `src/lib/stats.ts`: the computed summary.
- `src/lib/schema.ts`: the guide format and the step skeleton.
- `src/app/`: the pages.
- `data/guides/`: the library.
