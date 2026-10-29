# OAuth Setup Guides

Step-by-step guides for creating a provider's OAuth app and getting it approved, so a developer's users can connect that provider. Every guide answers four questions before the first step:
- How hard is it?
- How long will it take, including the approval wait?
- What could block launch?
- What can an agent do, and what must the developer do?

For an app that has no guide yet, an agent researches it live and writes one in about 2–5 minutes.

**Live:** https://oauth-setup-guides-nu.vercel.app · **Repo:** https://github.com/ashishpanjwani/oauth-setup-guides

**Try it:**
1. Open **Gmail**, the hardest case: verification, a security assessment and a review of up to 6 weeks.
2. Then search for an app that isn't in the library, such as Strava or Pipedrive, and watch the agent work.
3. Every guide can be shared as a link, as Markdown or as a PDF.

## The problem

To let users connect an app like Gmail or Slack, a developer has to register their own OAuth app with that provider and often get it approved. The information they need exists, but it's scattered across setup pages, scope references, review policies, help-center articles and forum threads, and has to be pieced together by hand. Even then, the developer can't tell whether launch is an hour away or weeks away.

Building guides for real providers showed what the scattered docs hide:

- **Registration is quick; launch is not.** Verification, security assessments, app reviews (Pipedrive's can take up to 21 business days) and usage-based pricing decide the timeline. They're rarely on the same page as the setup steps.
- **Requirements surface late:** a privacy policy on the same domain, a demo video for reviewers, a sandbox account before the console is even visible, test-user caps.
- **Some blockers aren't the developer's to clear.** An end user's admin may have to approve the app (GitHub organizations, Google Workspace, Notion Enterprise).
- **The path depends on the app type.** Shopify has three ways to get a token. Following the wrong one wastes the setup.
- **The docs aren't always right.** They lag the live UI, and they often don't say how long a review takes or how to submit one.

## Scope, and why

The focus is the **path to production**: everything between "I need an OAuth app" and "any user can connect", in the order a developer meets it.

| In scope | Out of scope | Why |
|---|---|---|
| The path to production, with the obstacles that apply | A full OAuth tutorial or integration code | The setup clicks are easy to find. What developers can't predict is the review, verification and admin approval |
| One path per guide: an outside, server-side app that many users connect to | Embedded apps, single-workspace tokens, personal tokens | This is the AI-agent case. The first Shopify guide followed the embedded-app path and was useless for it. Each guide names its path and the alternatives |
| OAuth setup and approval | Building app features (bots, webhooks) or optional app-store listings | Early guides drifted into both. A listing is a step only when users can't connect without it |
| Six library guides plus live generation for any app | All 100 guides | The brief asks for a few varied apps. Live generation uses the same pipeline as the library |
| Two pages: search and guide | Accounts, saved progress, editing guides | The first build (a 382-app directory, four evidence tiers, a second fact-checking agent) was hard to read. It was cut back to what a developer actually uses |

The six library apps were chosen to cover different obstacles:

| App | Difficulty | Time to production | Cost | Main challenge |
|---|---|---|---|---|
| GitHub | Easy | Right after setup | Free | Organization owner approval |
| Slack | Easy | No review wait | Free | Distribution and workspace approval |
| X | Moderate | Right after setup | Pay-per-use | Use-case review and prepaid credits |
| Shopify | Moderate | Review time not published | One-time registration fee | Choosing the right app path, plus App Store review |
| Instagram | Moderate | Within a week, per Meta | Free | App Review and Business Verification |
| Gmail | Hard | ~10 business days to ~6 weeks | Free, plus a paid security assessment for restricted scopes | Scope verification and a security assessment |

## What every guide answers

| The developer's question | Where the guide answers it | How the answer is worked out |
|---|---|---|
| **How hard is it?** | Difficulty, with its reason | Computed in code from the checked obstacles. **Easy:** self-serve with no review or payment. **Moderate:** a provider review, a registration or verification step, or a paid API. **Hard:** a multi-week review or a security assessment |
| **How long, including the wait?** | Time to test, Time to production, and a step count | Time to production is the provider's stated review time in its own words, with its source. When the docs don't state one, the guide says "Review time not published" rather than guessing. Effort is shown as a step count, not invented hours |
| **What could affect my setup?** | This guide covers · What can stop you from launching · Requirements · Blockers · Could not verify | Six obstacles are checked for every app: who can register, test-mode limits, provider review, end users' admin approval, paid access, ongoing obligations. Only the ones that apply are shown, each with where it happens and what to do |
| **What can an agent do?** | An **Agent / You / Waiting** label on every step, plus an "Agent and you" summary line | **Agent:** work an agent can do, like picking the narrowest scopes, building the authorize URL, and writing descriptions and review justifications. **You:** signing in, clicking submit, paying, recording, committing to choices. **Waiting:** the provider's own review |

**A developer can follow a guide without help:**
- Steps come in two parts, **Set up and test** and **Go live**.
- Each step starts with where it happens ("APIs & Services → Library:") and then says what to click.
- The create-app step links straight to the developer portal.
- A step that produces something, like a demo video link, says which later step uses it.
- Every line links to its evidence: the exact sentence in the provider's docs, or a clear Unverified tag.

## How a guide is built

Models do the reading and writing. Code owns structure, ordering and every check that can be made mechanical.

| Stage | Done by | What happens |
|---|---|---|
| App check | Claude Haiku 5.5 | Rejects inputs that aren't apps (~1¢) and suggests a fix for typos |
| Research | Claude Haiku 5.5 + web search | Finds the official pages, labels each by kind (setup, scopes, review…), and answers the six obstacle questions |
| Coverage | Code | If a required kind of page is missing, runs one targeted search |
| Read and probe | Code | Fetches the pages as English text, and checks whether the developer console loads and where it redirects |
| Write | Claude Sonnet 5.5 | Fills a fixed step skeleton and cites a quote for every fact |
| Quote check | Code | Every quote must appear word for word on the page it cites, or its claim is downgraded |
| Support check, re-quote | Claude Haiku 5.5 | Asks whether each quote supports its claim (it can only downgrade), and gives failed claims one try at the right sentence |
| Edit | Claude Sonnet 5.5 | Fixes rule problems that a code checker found, against a fixed checklist |
| Finish | Code | Orders the steps, checks obstacles and links, and computes the stats |

A live run costs $0.21–0.46 and takes 1.3–4.6 minutes, based on recorded runs.

### Where agents help, and where they stop

| Decision | Why |
|---|---|
| Agents research, write and check their own quotes | That's where models are strong: reading many pages and turning them into steps |
| Structure and checks live in code | Prompt-only fixes kept regressing. Code gives the same answer every time |
| The agent doesn't create apps for the developer | It would need the developer's login, GitHub and X have no API for it, and the client secret should never pass through an agent |
| Endpoint testing on X was tried and reverted | Testing endpoints with fake values produced HTTP errors that meant nothing to a reader |
| The handoff is shown through step labels; hands-on checks come from a person | A reader can act on "the agent builds this link, you click Allow". They can't act on an error log |

## Evidence

Every claim carries a label:
- **Tested:** observed on the live product, not read in docs.
- **Sourced:** an exact quote from an official page the agent fetched. Code checks that it's on the page, word for word.
- **Uncertain:** everything else, with the reason shown.

Any line in a guide without a Tested or Sourced claim behind it shows an **Unverified** tag. Open questions go under **Could not verify** instead of being guessed.

| Decision | Why |
|---|---|
| Quotes checked in code, not by a second model | It replaced a fact-checking agent. A code check is cheaper and gives the same answer every time |
| One fact per claim, automatic re-quoting, a downgrade-only support check | 10 of Gmail's 19 claims cited the wrong sentence, mostly for facts that were true |
| Fix the guide, not the label: library guides allow at most 2–3 Unverified lines | Fifteen orange tags made a guide more confusing, not more honest |
| Stats never claim more than the evidence ("review not confirmed") | An early Notion guide said "no review" when the docs mentioned one |
| Step links only go to URLs the agent actually opened | A looser "same site" rule could have linked to made-up pages |

## Checking the guidance

All 6 library guides were re-checked against their live pages on 2026-10-29: **143 of 143 quotes are still on their pages, and 0 of 128 lines are Unverified.** Earlier, each guide was checked by hand:

| Guide | Checked against | Learned or corrected | Still couldn't verify |
|---|---|---|---|
| GitHub | The live form, by a person, plus GitHub's docs | The form says "Redirect URIs" while the docs still say "Authorization callback URL", so this is recorded as **Tested**. The first summary missed organization approval, which led to the six obstacle questions | — |
| Gmail | Google's pages, line by line | Found a missing "Publish app" step, an unsourced recommendation and missing review timings. Most Unverified tags were true facts citing the wrong sentence. All fixed | The security assessment's price (not published; set by the assessor) |
| Shopify | Shopify's docs, a third-party guide and ChatGPT's answer | The first run followed the embedded-app path; corrected to the authorization code grant. Added that new public apps must use expiring tokens. help.shopify.com blocks automated readers | The registration fee amount |
| Instagram | Meta's docs | A "switch to Live" step had moved before review; fixed with a go-live slot. A "2–4 weeks" estimate was citing Meta's "within a week"; corrected | Actual review time (community reports say 2–4 weeks) |
| X | X's docs | Added the missing PKCE step and fixed the order of OAuth settings. Moved an overstated sign-up requirement to Could not verify | Whether X's use-case review can delay access |
| Slack | Slack's docs | 6 of 8 claims marked Uncertain were actually true, so short complete sentences and multi-sentence quotes were allowed. The guide drifted into building a bot; steps became OAuth-only | Whether customers need a paid Slack plan |
| Notion (live, 3 runs) | Notion's docs; the first run also against ChatGPT | The stats code said "no review" while the docs say the authorization URL appears "after a public connection is submitted for review"; fixed. ChatGPT used outdated names and a capability Notion doesn't have | What Notion's review involves and how long it takes |
| Pipedrive (live) | Pipedrive's docs | 23 of 23 quotes on their pages. The summary said "Moderate" while the Difficulty box said "Hard"; the summary no longer names a level | Whether a company admin can block installs |

## Other product decisions

### Step structure: Architect and Builder

Steps once read like a list of facts. Gmail's started with "create a brand" before the project existed, and prompt fixes didn't stick. So the work is split:

- **Architect (code):** a fixed order of step slots (decide scopes → create app → … → test connection → publish → review → go live), plus a check that the required slots are filled.
- **Builder (model):** writes each slot for the provider.

### Live search

| Decision | Why |
|---|---|
| Cheapest path first: library match → input checks → ~1¢ app check → full run | An email address or a sentence shouldn't cost a full run |
| Progress rows for every stage | A 2–5 minute wait shouldn't look stuck |
| A time guard and free replays | Runs must fit Vercel's 300-second limit, and demos shouldn't cost money |

### Cost

| Decision | Why |
|---|---|
| Haiku researches and checks; Sonnet writes and edits | Haiku dropped some of about 25 writing rules on every run. Sonnet had zero violations, raising a guide's cost from ~$0.06 to ~$0.25 |
| $0.80 per run, $10 per day, 6 runs an hour per visitor | An early batch of six parallel runs on the top model used up a $6 credit. After that, every change was tested on one app first |

Total API spend for the build was about $13, estimated from the app's own cost tracking.

## Potential enhancements

| Enhancement | What it adds |
|---|---|
| Regenerate button on each guide | A reader can refresh a guide that looks old. Showing what changed since the last version makes the update trustworthy |
| Reader feedback | A reader flags a wrong or outdated line, and the next run uses that feedback to fix the guide |
| "Reviewed by {name}" | A person who checked the guide signs it, so readers know which guides a human verified |
| Automatic freshness check | Re-checks every quote against its live page on a schedule, at no cost. A guide whose quotes have disappeared gets flagged for regeneration |
| A browser agent for setup | With the developer signed in, an agent fills the console forms and stops for the developer at sign-in, payment and submit. This would be a real "attempt the setup" without ever handling the secret |

## Limitations

- **6 guides, not 100.** Every guide uses the same pipeline. Growing the library takes more runs plus a human check of each.
- **Live guides aren't reviewed by a person and vary between runs.** Unclear docs, like Notion's on review, produce unclear guides. The labels show this but don't fix it.
- **The agent reads docs, not the live UI.** Pages rendered by JavaScript or protected from bots can't be read, so those facts come out Uncertain.
- **Known rough edges, left on purpose:**
  - A step can say "then create" one step before the last setting on the same form.
  - Go-live steps are thin when the docs don't say how to submit a review.
  - An Agent/You label is occasionally wrong.
  - Nothing yet checks that a claim supports the specific line citing it.
  - The app check hasn't been tested on real bad inputs yet.
- **Demo-grade protection.** The rate limit is per server instance, and the daily budget is best-effort under concurrent runs. The real backstop is the spend limit on the API key.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=your-key" > .env.local   # needed only for live generation
npm run dev                                      # http://localhost:3000
```

Generated guides and run recordings are saved to `.data/` locally. Optionally, set `RUN_CAP_USD` and `DAILY_CAP_USD` in `.env.local` to override the $0.80 per-run and $10 per-day caps.

To replay a recorded run at no cost, open `/generate?q=<app>&replay=<slug>`.

**Code map:**
- `src/lib/agent/`: the pipeline, prompts and costs.
- `src/lib/stats.ts`: the computed summary.
- `src/lib/schema.ts`: the guide format and the step skeleton.
- `src/app/`: the pages.
- `data/guides/`: the library.
