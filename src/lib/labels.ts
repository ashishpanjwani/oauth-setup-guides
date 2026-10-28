import type { Difficulty, EvidenceStatus, Who } from "./schema";

export const WHO: Record<Who, { label: string; cls: string }> = {
  agent: { label: "Agent", cls: "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-400/30" },
  agent_prepares: { label: "Agent prepares, you click", cls: "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-400/30" },
  you: { label: "You", cls: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/30" },
  waiting: { label: "Waiting", cls: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/30" },
};

export const EVIDENCE: Record<EvidenceStatus, { label: string; cls: string }> = {
  tested: { label: "Tested", cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30" },
  sourced: { label: "Sourced", cls: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-400/30" },
  uncertain: { label: "Uncertain", cls: "bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-400/30" },
};

export const DIFFICULTY: Record<Difficulty, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "text-emerald-700 dark:text-emerald-400" },
  moderate: { label: "Moderate", cls: "text-amber-700 dark:text-amber-400" },
  hard: { label: "Hard", cls: "text-rose-700 dark:text-rose-400" },
};
