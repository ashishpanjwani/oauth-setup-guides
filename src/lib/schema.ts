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
export const Who = z.enum(["agent", "agent_prepares", "you", "waiting"]);
export type Who = z.infer<typeof Who>;

export const Difficulty = z.enum(["easy", "moderate", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const Claim = z.object({
  id: z.string().describe("c1, c2, ..."),
  statement: z.string(),
  status: EvidenceStatus,
  sources: z.array(z.object({ url: z.string(), title: z.string() })),
  note: z.string().describe("How we know, or why it's uncertain. Empty string if nothing to add."),
});
export type Claim = z.infer<typeof Claim>;

export const GuideDraft = z.object({
  appName: z.string(),
  developerPortal: z.string(),
  summary: z.string().describe("One or two plain sentences: how hard this is and the one thing that drives it"),
  difficulty: Difficulty,
  timeToTest: z.string().describe("Until the developer can connect their own account in dev, e.g. '~1 hour'"),
  timeToProduction: z.string().describe("Until any user can connect, including approval waits, e.g. '6–10 weeks'"),
  effort: z.string().describe("Total hands-on work, excluding waiting, e.g. '1–2 days'"),
  cost: z.string().describe("What the developer pays the provider or third parties, e.g. 'Free' or '$500–4,500 security audit'"),
  summaryClaimIds: z.array(z.string()),
  requirements: z.array(z.object({ text: z.string(), claimIds: z.array(z.string()) })),
  steps: z.array(
    z.object({
      text: z.string().describe("One action, imperative"),
      detail: z.string().describe("Exact values or the one gotcha. Empty string if none."),
      who: Who,
      claimIds: z.array(z.string()),
    }),
  ),
  blockers: z.array(z.object({ problem: z.string(), fix: z.string(), claimIds: z.array(z.string()) })),
  couldNotVerify: z.array(z.string()),
  claims: z.array(Claim),
});
export type GuideDraft = z.infer<typeof GuideDraft>;

export type Probe = { name: string; target: string; ok: boolean; result: string };

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
