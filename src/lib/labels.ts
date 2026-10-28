import type { Actor, EvidenceStatus, Tier } from "./schema";

export const TIER: Record<Tier, { label: string; blurb: string; cls: string }> = {
  self_serve: {
    label: "Self-serve",
    blurb: "Register and go live yourself. No provider review.",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30",
  },
  review_required: {
    label: "Review required",
    blurb: "Works in dev right away; the provider must approve it before real users can connect.",
    cls: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/30",
  },
  partner_gated: {
    label: "Partner-gated",
    blurb: "Needs a partnership, paid tier, or business relationship before you get access.",
    cls: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-400/30",
  },
};

export const EVIDENCE: Record<EvidenceStatus, { label: string; blurb: string; cls: string; dot: string }> = {
  tested: {
    label: "Tested",
    blurb: "Observed directly: a live probe of the provider or a hands-on setup attempt.",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30",
    dot: "bg-emerald-500",
  },
  verified: {
    label: "Verified",
    blurb: "A separate checker re-opened the cited source and confirmed it.",
    cls: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-400/30",
    dot: "bg-sky-500",
  },
  sourced: {
    label: "Sourced",
    blurb: "Backed by a cited source, not independently re-checked.",
    cls: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/30",
    dot: "bg-zinc-400",
  },
  uncertain: {
    label: "Uncertain",
    blurb: "Inferred, community-reported, conflicting, or the source didn't hold up. Confirm before relying on it.",
    cls: "bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-400/30",
    dot: "bg-orange-500",
  },
};

export const ACTOR: Record<Actor, { label: string; cls: string }> = {
  agent: { label: "Agent can do", cls: "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-400/30" },
  agent_assist: { label: "Agent preps, you submit", cls: "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-400/30" },
  you: { label: "You", cls: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/30" },
};

export const STAGE_ORDER = ["register", "configure", "test", "go_live"] as const;
