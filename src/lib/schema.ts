import * as z from "zod/v4";

/**
 * How we know a claim:
 * - tested:    observed directly (a live probe of the provider or a hands-on attempt)
 * - sourced:   backed by a cited source
 * - uncertain: inferred, community-reported, or the source didn't hold up
 */
export const EvidenceStatus = z.enum(["tested", "sourced", "uncertain"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

/** Who does a step. "waiting" marks time spent on the provider's side (reviews, approvals). */
export const Who = z.enum(["agent", "you", "waiting"]);
export type Who = z.infer<typeof Who>;

/** Steps come in two parts: getting your own account connected, then opening the app to everyone. */
export const Phase = z.enum(["setup", "launch"]);
export type Phase = z.infer<typeof Phase>;

/**
 * The skeleton every OAuth app follows, in order. Code owns the order and the required
 * slots; the model only fills each slot for the provider (or leaves it out if it has none).
 */
export const SLOTS = [
  { id: "choose_scopes", phase: "setup", required: true, what: "Decide which scopes the app needs, and what each one triggers (review, assessment). Comes first because it decides how hard the rest is." },
  { id: "create_app", phase: "setup", required: true, what: "Create the project or app in the developer console." },
  { id: "enable_api", phase: "setup", required: false, what: "Enable the API, if the provider has a separate switch for it." },
  { id: "app_details", phase: "setup", required: false, what: "App details or consent screen: name, support email, audience or user type, logo, links." },
  { id: "add_scopes", phase: "setup", required: false, what: "Add the chosen scopes in the console, if the console asks for them." },
  { id: "oauth_settings", phase: "setup", required: false, what: "Turn on OAuth or choose the app or client type (web, native, single-page), when the console asks for it before or together with the redirect URI." },
  { id: "redirect_uri", phase: "setup", required: true, what: "Add the redirect URI (callback URL)." },
  { id: "other_settings", phase: "setup", required: false, what: "Other settings on the registration form that need a decision." },
  { id: "credentials", phase: "setup", required: true, what: "Create or copy the client ID and client secret, saying where the console shows them." },
  { id: "test_users", phase: "setup", required: false, what: "Add test users, if test mode only lets listed accounts connect." },
  { id: "test_connection", phase: "setup", required: true, what: "Connect the developer's own account through the OAuth authorize URL, the same flow users will see." },
  { id: "publish", phase: "launch", required: false, what: "Before review: leave test mode or open the app to other accounts (a Publish, Go to production, Activate distribution or Select distribution method button)." },
  { id: "prepare_review", phase: "launch", required: false, what: "Prepare what the review asks for (domain, privacy policy, scope justification, demo video)." },
  { id: "submit_review", phase: "launch", required: false, what: "Submit the app for the provider's review." },
  { id: "wait_review", phase: "launch", required: false, what: "Wait for the provider's review." },
  { id: "go_live", phase: "launch", required: false, what: "After approval: switch the app to live or production mode, if the provider has that step after its review." },
  { id: "security_assessment", phase: "launch", required: false, what: "A required security assessment or audit, and how often it repeats." },
] as const;
export const Slot = z.enum(SLOTS.map((x) => x.id) as [(typeof SLOTS)[number]["id"], ...(typeof SLOTS)[number]["id"][]]);
export type Slot = z.infer<typeof Slot>;
export const STATS = ["timeToTest", "timeToProduction", "effort", "cost"] as const;
export type Stat = (typeof STATS)[number];

export const slotPhase = (slot: Slot | undefined): Phase => SLOTS.find((x) => x.id === slot)?.phase ?? "setup";

export const Difficulty = z.enum(["easy", "moderate", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const Claim = z.object({
  id: z.string().describe("c1, c2, ..."),
  statement: z.string(),
  status: EvidenceStatus,
  sourceUrl: z.string().describe("The page this comes from. Empty string for estimates."),
  sourceTitle: z.string(),
  quote: z.string().describe("Exact sentence copied from the source page that supports the statement. Empty string if none."),
  note: z.string().describe("How we know, or why it's uncertain. Empty string if nothing to add."),
});
export type Claim = z.infer<typeof Claim>;

/**
 * The same six gates are checked for every provider, so each app's real catch surfaces
 * from the method rather than from per-app prompting.
 */
export const GateId = z.enum(["register", "test_limits", "review", "admin_approval", "paid_access", "ongoing"]);
export type GateId = z.infer<typeof GateId>;

export const Gate = z.object({
  gate: GateId,
  applies: z.enum(["yes", "no", "unknown"]),
  title: z.string().describe("Plain statement of the gate for this app, e.g. 'Organizations must approve your app before you can access their repos'"),
  what: z.string().describe("What it means for the developer, in one or two sentences. Empty if applies is 'no'."),
  where: z.string().describe("Exactly where it lives: console path or page, and who acts there. Empty if not applicable."),
  todo: z.string().describe("What the developer should do about it. Empty if not applicable."),
  claimIds: z.array(z.string()),
});
export type Gate = z.infer<typeof Gate>;

export const GuideDraft = z.object({
  appName: z.string(),
  developerPortal: z.string(),
  summary: z.string().describe("One or two plain sentences: how hard this is and the one thing that drives it"),
  difficulty: Difficulty,
  timeToTest: z.string().describe("Until the developer can connect their own account in dev, e.g. '~1 hour'"),
  timeToProduction: z.string().describe("Until any user can connect, including approval waits, e.g. '6–10 weeks'"),
  effort: z.string().describe("Total hands-on work, excluding waiting, e.g. '1–2 days'"),
  cost: z.string().describe("What the developer pays the provider or third parties, e.g. 'Free' or '$500–4,500 security audit'"),
  appType: z.string().describe("Which app type or grant this guide covers and why, and the provider's other options. Empty if there is only one way."),
  handoff: z.string().describe("One sentence: what an agent can do here and what the developer has to do themselves"),
  summaryClaimIds: z.array(z.string()),
  statClaimIds: z
    .object({ timeToTest: z.array(z.string()), timeToProduction: z.array(z.string()), effort: z.array(z.string()), cost: z.array(z.string()) })
    .describe("Claims that state each value (a price, a review time). Empty when the value is an estimate."),
  gates: z.array(Gate).describe("Exactly one entry for each of the six gates, in order"),
  requirements: z.array(z.object({ text: z.string(), claimIds: z.array(z.string()) })),
  steps: z.array(
    z.object({
      slot: Slot,
      /** Set by code from the slot; older guides store it directly. */
      phase: Phase.optional(),
      text: z.string().describe("Where it happens, then the action, e.g. 'OAuth & Permissions → Redirect URLs: add your callback URL and click Save URLs'"),
      why: z.string().describe("At most one short sentence, only when it changes what the developer does. Empty otherwise."),
      detail: z.string().describe("One short line: an exact value or the one gotcha. Empty string if none."),
      who: Who,
      claimIds: z.array(z.string()),
      /** Kept only when the URL is the developer portal or a page that was read (checked in code). */
      link: z
        .object({ label: z.string(), url: z.string() })
        .optional()
        .describe("Where the reader goes to do this step, e.g. { label: 'Developer portal', url: <the developer portal URL> }. Omit on steps that stay on the same page."),
    }),
  ),
  blockers: z.array(z.object({ problem: z.string(), fix: z.string(), claimIds: z.array(z.string()) })),
  couldNotVerify: z.array(z.string()),
  claims: z.array(Claim),
});
export type GuideDraft = z.infer<typeof GuideDraft>;

import type { Probe } from "./agent/web";
export type { Probe };

export type Guide = GuideDraft & {
  slug: string;
  /** True only after a person checked the guide against its sources. */
  reviewed: boolean;
  reviewNote?: string;
  createdAt: string;
  checkedAt: string;
  probes: Probe[];
  agentRun?: { model: string; searches: number; fetches: number; probes: number; durationSec: number; costUsd?: number };
};
