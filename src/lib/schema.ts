import * as z from "zod/v4";

/**
 * Evidence levels, strongest first. Every claim in a guide carries one.
 * - tested:    observed directly (an agent probe or a human setup attempt)
 * - verified:  a second agent pass re-read the cited source and confirmed it
 * - sourced:   backed by a cited source that has not been re-checked
 * - uncertain: inferred, community-reported, conflicting, or the source didn't hold up
 */
export const EvidenceStatus = z.enum(["tested", "verified", "sourced", "uncertain"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

/** Who does a step: the agent can do it unattended, can prep it for you, or only you can. */
export const Actor = z.enum(["agent", "agent_assist", "you"]);
export type Actor = z.infer<typeof Actor>;

/**
 * self_serve:      register and go live yourself, no provider review
 * review_required: provider reviews/verifies the app before real users can connect
 * partner_gated:   needs a partnership, paid tier, or business relationship before access
 */
export const Tier = z.enum(["self_serve", "review_required", "partner_gated"]);
export type Tier = z.infer<typeof Tier>;

export const Source = z.object({
  url: z.string(),
  title: z.string(),
});

export const Claim = z.object({
  id: z.string().describe("Short stable id like c1, c2"),
  statement: z.string().describe("One factual statement a developer could check"),
  status: EvidenceStatus,
  sources: z.array(Source),
  note: z.string().describe("How we know, or why it's uncertain. Empty string if nothing to add."),
});
export type Claim = z.infer<typeof Claim>;

export const Step = z.object({
  text: z.string().describe("Imperative instruction, one action"),
  actor: Actor,
  detail: z.string().describe("Exact values, field names, gotchas. Empty string if none."),
  claimIds: z.array(z.string()),
});

export const Stage = z.object({
  id: z.enum(["register", "configure", "test", "go_live"]),
  title: z.string(),
  goal: z.string().describe("What 'done' looks like for this stage"),
  duration: z.string().describe("Hands-on time plus any waiting, e.g. '15 min' or '30 min + 3-6 weeks review'"),
  steps: z.array(Step),
});

export const Blocker = z.object({
  title: z.string(),
  likelihood: z.enum(["common", "possible", "rare"]),
  symptom: z.string().describe("What the developer sees when they hit it"),
  workaround: z.string().describe("What to do next"),
  claimIds: z.array(z.string()),
});

export const ScopeNote = z.object({
  scope: z.string(),
  sensitivity: z.enum(["basic", "sensitive", "restricted", "unknown"]),
  triggersReview: z.boolean(),
  note: z.string(),
});

export const Probe = z.object({
  name: z.string(),
  target: z.string(),
  ok: z.boolean(),
  result: z.string(),
});

/** What the model produces. Server-side fields (slug, timestamps, origin) are added after. */
export const GuideDraft = z.object({
  appName: z.string(),
  website: z.string(),
  developerPortal: z.string(),
  summary: z.string().describe("Two sentences: what the OAuth app is for and the single biggest thing that determines effort"),
  verdict: z.object({
    tier: Tier,
    difficulty: z.number().describe("1 (trivial) to 5 (multi-week, gated)"),
    headline: z.string().describe("One line a developer would repeat to their PM"),
    timeToFirstConnection: z.string().describe("Time until the developer can connect their own account in dev"),
    timeToProduction: z.string().describe("Time until arbitrary end users can connect, including approval waits"),
    activeEffort: z.string().describe("Total hands-on hours, excluding waiting"),
    approvalWait: z.string().describe("Provider review/verification wait, or 'None'"),
    confidence: z.enum(["high", "medium", "low"]),
    claimIds: z.array(z.string()),
  }),
  composio: z.object({
    managedAuth: z.enum(["yes", "no", "unknown"]),
    guidance: z.string().describe("Whether the developer can start on Composio-managed auth and when they must switch to their own app"),
  }),
  prerequisites: z.array(
    z.object({ item: z.string(), why: z.string(), claimIds: z.array(z.string()) }),
  ),
  stages: z.array(Stage),
  scopes: z.array(ScopeNote),
  blockers: z.array(Blocker),
  nuances: z.array(z.object({ text: z.string(), claimIds: z.array(z.string()) })),
  handoff: z.object({
    agentCanDo: z.array(z.string()),
    youMustDo: z.array(z.string()),
  }),
  claims: z.array(Claim),
  openQuestions: z.array(z.string()).describe("Things we could not determine and the developer should confirm"),
});
export type GuideDraft = z.infer<typeof GuideDraft>;

export const Correction = z.object({
  what: z.string(),
  before: z.string(),
  after: z.string(),
  evidence: z.string(),
});

export type Guide = GuideDraft & {
  slug: string;
  origin: "library" | "generated";
  createdAt: string;
  verifiedAt?: string;
  probes: z.infer<typeof Probe>[];
  /** Human review notes on library guides: what the agent got wrong and how we fixed it. */
  corrections?: z.infer<typeof Correction>[];
  agentRun?: { model: string; searches: number; fetches: number; probes: number; durationSec: number; costUsd?: number };
};
