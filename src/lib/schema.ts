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
  handoff: z.string().describe("One sentence: what an agent can do here and what the developer has to do themselves"),
  summaryClaimIds: z.array(z.string()),
  gates: z.array(Gate).describe("Exactly one entry for each of the six gates, in order"),
  requirements: z.array(z.object({ text: z.string(), claimIds: z.array(z.string()) })),
  steps: z.array(
    z.object({
      phase: Phase,
      text: z.string().describe("Where it happens, then the action, e.g. 'OAuth & Permissions → Redirect URLs: add your callback URL and click Save URLs'"),
      why: z.string().describe("At most one short sentence, only when it changes what the developer does. Empty otherwise."),
      detail: z.string().describe("One short line: an exact value or the one gotcha. Empty string if none."),
      who: Who,
      claimIds: z.array(z.string()),
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
