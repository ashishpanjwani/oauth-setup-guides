# OAuth Setup Guides

Step-by-step guides for creating a provider's OAuth app and getting it approved. Every guide first answers how hard it is, how long it takes including the approval wait, what could block launch, and which steps an agent can do versus the developer. For an app with no guide, an agent researches it live and writes one in about 2–5 minutes.

**Live:** https://oauth-setup-guides-nu.vercel.app · **Repo:** https://github.com/ashishpanjwani/oauth-setup-guides

Start with **Gmail** (the hardest case), then search for an app that isn't in the library, such as Strava or Pipedrive.

## 1. Understanding the developer's problem

To let users connect an app like Gmail or Slack, a developer registers their own OAuth app with that provider and often has to get it approved. The registration form looks like the work. Building guides for real providers showed the hard part is elsewhere:

| What building the guides showed | Where it showed up |
|---|---|
| **Registration takes minutes; launch can take weeks.** The timeline is set by reviews, verification, security assessments and pricing, which sit on different pages from the setup steps | Gmail: up to ~6 weeks plus an annual assessment. Pipedrive: up to 21 business days. X: pay-per-use credits |
| **Requirements surface late,** often midway through setup | A privacy policy on the same domain (Google), a demo video (Google, Meta, Pipedrive), a sandbox account before the console is visible (Pipedrive), 100 test users (Google) |
| **Some blockers aren't the developer's to clear** | An end user's admin must approve: GitHub organizations, Google Workspace, Notion Enterprise. A guide can't give a time for this, only who controls it and what to tell users |
| **The right path depends on the app type** | Shopify has three ways to get a token, and Notion has three kinds of connection. The first Shopify guide followed the wrong one |
| **The docs themselves can mislead** | GitHub's docs say "Authorization callback URL" while its form says "Redirect URIs". Notion's docs mention a review but not how to submit one. Review times are often unpublished |
| **Plain AI answers read well but aren't reliable line by line** | ChatGPT's Notion answer used outdated names, listed a capability Notion doesn't have, and missed that the installation scope is permanent |

So the developer's real problem is **piecing together scattered, sometimes stale information** to answer "how long, how hard, and what will block me", before committing to a provider.

## 2. Scope, and why it addresses the problem

The focus is the **path to production**: everything between "I need an OAuth app" and "any user can connect", in the order a developer meets it.

| Decision | Why |
|---|---|
| Lead every guide with difficulty, time to production, cost and the obstacles that apply | These are what the scattered docs don't answer, and what decides whether to start |
| One path per guide: an outside, server-side app that many users connect to, named in a "This guide covers" line | It's the AI-agent case, and following the wrong path wastes the whole setup |
| OAuth setup and approval only; no bots, webhooks or optional store listings | Early guides drifted into building app features, which hid the approval path |
| Two pages, search and guide; no accounts, saved progress or editing | The first build tried to do too much: a 382-app directory, an extra explainer page, and guides built to look rigorous rather than to be followed. A developer needs to find an app and follow its guide |
| Six varied library guides plus live generation, not 100 guides | The brief asks for a few varied apps. Live generation runs the same pipeline on any app |

The six library guides each stress a different obstacle:

| Guide | Difficulty | Time to production | Main challenge |
|---|---|---|---|
| GitHub | Easy | Right after setup | Organization owner approval |
| Slack | Easy | No review wait | Distribution and workspace approval |
| X | Moderate | Right after setup | Use-case review and prepaid credits |
| Shopify | Moderate | Review time not published | Choosing the right app path, plus App Store review |
| Instagram | Moderate | Within a week, per Meta | App Review and Business Verification |
| Gmail | Hard | ~10 business days to ~6 weeks | Scope verification and a security assessment |

## 3. Product decisions, and what prompted them

Each decision came from a problem in a real guide.

| Problem seen | Decision |
|---|---|
| Summaries were vague ("no review step found") and missed GitHub's real catch, organization approval | **Six obstacles checked for every app:** who can register, test-mode limits, provider review, end users' admin approval, paid access, ongoing obligations. Only those that apply are shown, each with where and what to do |
| The model's time and effort figures were guesses, and "Free" was once labelled an estimate | **Stats computed in code** from the checked obstacles, each showing its basis. Time to production uses the provider's own words ("up to 21 business days"), or says "Review time not published". Effort became a step count |
| Steps read like a list of facts. Gmail's started with "create a brand", and prompt fixes didn't stick | **Architect and Builder.** Code is the Architect: a fixed order of step slots (decide scopes → create app → … → test connection → publish → review → go live) and a check that the required ones are filled. The model is the Builder and writes each slot for the provider |
| A mixed label, "agent prepares, you click", blurred who actually does each step | **Three plain labels on every step:** Agent, You, and Waiting (only for the provider's own review) |
| A step said "Go to Developer portal" without the link | **The create-app step links to the portal,** using the address the agent actually reached |
| Fixing one prompt rule broke another on the small model | **Mechanical rules in code** (a phrase checker, a page-coverage check, a known-facts check), and **Sonnet for writing** |
| Six parallel runs on the top model used up a $6 credit | **Haiku for research, Sonnet only for writing, hard caps** ($0.80 per run, $10 per day), and every change tested on one app first |
| Every search for a new app starts a run costing about $0.30–0.45, so a typo or an email address would waste money | **Cheap checks before any paid run:** an app with a library guide opens for free, bad input like an email or a sentence is rejected in the browser, and a ~1¢ check rejects names that aren't apps. Only then does the full run start |

## 4. Judgment about evidence

**The principle:** a developer should be able to see what's backed and what isn't, and an unconfirmed line should never read as fact.

Every claim is labelled:
- **Tested:** observed on the live product.
- **Sourced:** an exact quote from an official page, checked word for word in code.
- **Uncertain:** everything else, with the reason.

A guide line with no Tested or Sourced claim shows **Unverified**. Open questions go under **Could not verify**.

| Problem seen | Decision |
|---|---|
| A second agent re-reading sources was slow and costly, and was a model judging a model | **Quotes are checked in code,** not by a model. A quote is either on the page or it isn't |
| A quote existing doesn't mean it supports the claim: 10 of Gmail's 19 claims cited the wrong sentence | **One fact per claim, automatic re-quoting, and a support check that can only downgrade,** so its mistakes make a guide more cautious, never less |
| Fifteen orange Unverified tags made a guide more confusing, not more honest | **Fix the guide, not the label.** A library guide isn't published with more than 2–3 Unverified lines |
| The docs lag the live UI (GitHub's "Redirect URIs") | **Tested is reserved for what was observed on the live product,** never inferred from docs |
| The computed stats said "no review" when Notion's docs mentioned one | **Stats never claim more than the evidence:** "review not confirmed" or "Review time not published" |
| Proposed: accept any link on the provider's site | **Rejected.** A step link must be a URL the agent actually opened, or it could point to a made-up page |

## 5. Use of agents

Agents do the reading and writing; code does the structure and every check that can be mechanical.

| Stage | Done by | What happens |
|---|---|---|
| App check | Claude Haiku 5.5 | Rejects inputs that aren't apps |
| Research | Claude Haiku 5.5 + web search | Finds official pages, labels them by kind, and answers the six obstacle questions |
| Coverage, read, probe | Code | Runs one targeted search for any missing page kind, fetches the pages, and checks where the developer console leads |
| Write | Claude Sonnet 5.5 | Fills the step skeleton, citing a quote for every fact |
| Quote check | Code | Downgrades any quote not found word for word on its page |
| Support check, re-quote | Claude Haiku 5.5 | Downgrade-only; failed claims get one try at the right sentence |
| Edit | Claude Sonnet 5.5 | Fixes rule problems found by a code checker |
| Finish | Code | Orders steps, checks obstacles and links, computes the stats |

A live run costs $0.21–0.46 and takes 1.3–4.6 minutes.

**"Attempt the setup": what was tried, and where agents stop.**
- **The agent doesn't create apps.** It would need the developer's login, GitHub and X have no API for creating apps, and the client secret should never pass through an agent.
- **Automated attempts are limited to a console probe:** does the console load, and where does it redirect.
- **Tried and reverted on X:** an agent tested endpoints with fake values and kept a per-step attempt record. The result was HTTP errors that a reader couldn't act on.
- **What replaced it:** the handoff is shown through the Agent / You labels, and hands-on checks come from a person.
- **The next step would be a browser agent,** working with the developer signed in and stopping at sign-in, payment and submit (see section 7).

## 6. Checking the guidance

Each library guide was written by the agent, then checked against the provider's own pages and corrected by hand. Before submission, every sentence the guides quote from those pages was confirmed to still be there. Notion and Pipedrive were generated live and are reported as the agent produced them.

| Guide | Checked against | Learned or corrected | Still couldn't verify |
|---|---|---|---|
| GitHub | The live form (a person's setup attempt) and GitHub's docs | The form says "Redirect URIs" while the docs say "Authorization callback URL", recorded as **Tested**. The first summary missed organization approval | — |
| Gmail | Google's pages, line by line | A missing "Publish app" step, an unsourced recommendation and missing review timings. Most Unverified tags were true facts citing the wrong sentence | The security assessment's price (not published) |
| Shopify | Shopify's docs, a third-party guide and ChatGPT | Corrected from the embedded-app path to the authorization code grant. Added that new public apps must use expiring tokens | The registration fee amount (help.shopify.com blocks automated readers) |
| Instagram | Meta's docs | A "switch to Live" step had moved before review, so a go-live slot was added. "2–4 weeks" was citing Meta's "within a week" | Actual review time (community reports say 2–4 weeks) |
| X | X's docs | Added the missing PKCE step and fixed the order of OAuth settings. Moved an overstated sign-up rule to Could not verify | Whether the use-case review can delay access |
| Slack | Slack's docs | 6 of 8 claims marked Uncertain were true, so the quote rules were loosened. Steps drifted into building a bot, so they became OAuth-only | Whether customers need a paid Slack plan |
| Notion (live, 3 runs) | Notion's docs; the first run also against ChatGPT | The stats code said "no review" while the docs say the authorization URL appears "after a public connection is submitted for review"; fixed | What Notion's review involves and how long it takes |
| Pipedrive (live) | Pipedrive's docs | 23 of 23 quotes on their pages. The summary said "Moderate" while the box said "Hard", so the summary no longer names a level | Whether a company admin can block installs |

## 7. What's done, and what isn't

**Done:**
- Six library guides, generated by the agent and corrected by hand, with every quote still on its live page.
- Live generation for any app, with visible progress, input checks, cost caps and free replays.
- Sharing as a link, Markdown or PDF.

**Not done, and why:**
- **6 guides, not 100.** The pipeline is the same for any app. Growing the library takes more runs and a human check of each.
- **Live guides aren't reviewed by a person and vary between runs.** Unclear docs produce unclear guides. The labels show this but don't fix it.
- **No agent clicks through a provider's console.** The agent's only hands-on check is opening the developer console to see where it leads (section 5). Checks of a live form were done by hand, so far only on GitHub's.
- **The agent reads docs, not the live UI.** Pages rendered by JavaScript or protected from bots can't be read, so those facts come out Uncertain.
- **Known rough edges, seen in testing and not fixed:**
  - A step can say "then create the connection" while the next step is still on the same form (Notion).
  - When the docs mention a review but not how to submit it, the go-live steps are vague (Notion).
  - A step is occasionally given to the wrong party: Pipedrive's "record a demo video" was marked Agent.
  - A step can cite a real quote from the docs that's about something slightly different. Only the editing pass checks that match, and as a model it sometimes misses it (seen on Shopify and Instagram). There's no code check for it.
  - Bad input like an email address or a sentence is rejected and was tested. The model check that rejects names that aren't apps, or suggests a fix for a typo, hasn't been tried on real bad inputs yet.
- **Demo-grade protection.** The rate limit is per server instance, and the daily budget is best-effort under concurrent runs. The real backstop is the API key's spend limit.

**Potential enhancements:**

| Enhancement | What it adds |
|---|---|
| Regenerate button on each guide | Refresh an old guide, showing what changed since the last version |
| Reader feedback | A reader flags a wrong or outdated line, and the next run uses it |
| "Reviewed by {name}" | Shows which guides a person verified |
| Automatic freshness check | Re-checks every quote against its live page on a schedule, at no cost, and flags guides whose quotes have disappeared |
| A browser agent for setup | Fills the console forms with the developer signed in, stopping at sign-in, payment and submit. A real "attempt the setup" without handling the secret |

Total API spend for the build was about $13, estimated from the app's own cost tracking.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=your-key" > .env.local   # needed only for live generation
npm run dev                                      # http://localhost:3000
```

Generated guides and run recordings are saved to `.data/`. Optionally, set `RUN_CAP_USD` and `DAILY_CAP_USD` to override the $0.80 per-run and $10 per-day caps. To replay a recorded run at no cost, open `/generate?q=<app>&replay=<slug>`.

**Code map:**
- `src/lib/agent/`: the pipeline, prompts and costs.
- `src/lib/stats.ts`: the computed summary.
- `src/lib/schema.ts`: the guide format and step skeleton.
- `src/app/`: the pages.
- `data/guides/`: the library.
