# OAuth Setup Guides

Guides for creating a provider's OAuth app and getting it approved, so an AI agent's users can connect that provider. Each guide answers four questions up front: how hard it is, how long it takes (including the approval wait), what can block launch, and which steps an agent can do versus which need the developer. For an app with no guide yet, an agent researches it live and writes one in about 2–5 minutes.

**Live:** https://oauth-setup-guides-nu.vercel.app · **Repo:** https://github.com/ashishpanjwani/oauth-setup-guides

## The problem

To let users connect an app like Gmail or Slack, a developer has to register their own OAuth app with that provider and often get it approved. The information they need exists, but it's scattered. It's spread across setup pages, scope references, review policies, help-center articles and forum threads, and it has to be pieced together by hand. Even then, the developer can't tell whether launch is an hour away or weeks away.

Building guides for real providers showed what the scattered docs hide:

- **Registration is quick; launch is not.** Verification, security assessments, app reviews (Pipedrive's can take up to 21 business days) and usage-based API pricing are what decide the timeline. They're usually on different pages from the setup steps.
- **Requirements surface late:** a privacy policy on the same domain, a demo video for reviewers, a sandbox account before the console is even visible, test-user caps.
- **Some blockers aren't the developer's to clear.** An end user's admin may have to approve the app (GitHub organizations, Google Workspace, Notion Enterprise).
- **The path depends on the app type.** Shopify has three ways to get a token. A guide for the wrong one wastes the setup.
- **The docs aren't always right.** They lag the live UI, and they don't always say how long a review takes or how to submit one.

**The product's response:** one guide per app that puts these pieces together in order. It answers difficulty, time, blockers and what an agent can do up front, then walks through the real console flow, with every line backed by the provider's docs and anything unconfirmed labelled as such.

## What it does

- **Library:** six guides chosen for different challenges.

  | App | Difficulty | Main challenge |
  |---|---|---|
  | GitHub | Easy | Organization owner approval |
  | Slack | Easy | Distribution and workspace approval |
  | X | Moderate | Pay-per-use API and use-case review |
  | Shopify | Moderate | Choosing the right app path, plus App Store review |
  | Instagram | Moderate | App Review and Business Verification |
  | Gmail | Hard | Scope verification and a security assessment |
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

### Scope

| Decision | Why |
|---|---|
| Two pages: search and guide | The first build (a 382-app directory, four evidence tiers, a second fact-checking agent) was hard to read |
| One path per guide: an outside, server-side app many users connect to | Shopify's first guide followed the embedded-app path, which is the wrong one for an AI agent |
| OAuth setup only | Guides drifted into building bots and optional app-store listings |

### What a guide shows

| Decision | Why |
|---|---|
| Six launch gates checked for every app | Early summaries were vague and missed GitHub's real catch, organization approval |
| Stats computed in code, each with its basis | The model's time and effort figures were guesses |
| Stats never claim more than the evidence | An early guide said "no review" when the docs mentioned one |
| Agent / You / Waiting on every step | Answers "what can an agent do for me", and "agent prepares, you click" confused readers |

### Step structure: Architect and Builder

Steps read like a list of facts. Gmail's once started with "create a brand" before the project existed, and prompt fixes didn't stick. So the work is split:

- **Architect (code):** a fixed order of step slots, from decide scopes → create app → … → test connection → publish → review → go live. Code also checks that the required slots are filled.
- **Builder (model):** writes each slot for the provider. Each step starts with where it happens, says which later step uses what it produces, and the create-app step links to the portal.

### Evidence and trust

| Decision | Why |
|---|---|
| Quotes checked word for word in code | Same answer every time; replaced a second agent re-reading sources |
| Unverified tag on unconfirmed lines | 10 of Gmail's 19 claims cited the wrong sentence |
| One fact per claim, auto re-quote, downgrade-only support check | Fixes the wrong-sentence problem at its source |
| Fix the guide, not the label (library guides allow at most 2–3 Unverified lines) | Fifteen orange tags made a guide more confusing, not more honest |
| Tested = observed on the live product | Docs lag the UI: GitHub's form says "Redirect URIs", its docs don't |
| Step links only to URLs the agent opened | A looser "same site" rule could link to made-up pages |

### Agents and "attempt the setup"

| Decision | Why |
|---|---|
| The agent doesn't create apps | It needs the developer's login, GitHub and X have no API for it, and secrets shouldn't pass through an agent |
| Endpoint testing on X was reverted | It produced HTTP errors that meant nothing to a reader |
| The handoff is shown through step labels; hands-on evidence comes from a person | That's what a reader can act on |

### Live search

| Decision | Why |
|---|---|
| Cheapest path first: library match → input checks → ~1¢ app check → full run | Bad input shouldn't cost a full run |
| Progress rows for every stage | A 2–5 minute wait shouldn't look stuck |
| Time guard and free replays | Runs must fit Vercel's 300-second limit; demos shouldn't cost money |

### Cost

| Decision | Why |
|---|---|
| Haiku researches and checks; Sonnet writes and edits | Haiku dropped writing rules on every run. Sonnet raised a guide from ~$0.06 to ~$0.25 with zero violations |
| $0.80 per run, $10 per day, 6 runs an hour per visitor | An early batch of parallel runs on the top model used up a $6 credit |
| Mechanical rules in code, not prompts | Prompt-only fixes kept regressing |

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

Generated guides and run recordings are saved to `.data/` locally. Optional: `RUN_CAP_USD` and `DAILY_CAP_USD` in `.env.local` override the $0.80 per-run and $10 per-day caps.

To replay a recorded run at no cost, open `/generate?q=<app>&replay=<slug>`.

**Code map:**
- `src/lib/agent/`: the pipeline, prompts and costs.
- `src/lib/stats.ts`: the computed summary.
- `src/lib/schema.ts`: the guide format and the step skeleton.
- `src/app/`: the pages.
- `data/guides/`: the library.
