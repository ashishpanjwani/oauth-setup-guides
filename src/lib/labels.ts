import type { Difficulty, EvidenceStatus, Who } from "./schema";

export const WHO: Record<Who, { label: string; cls: string }> = {
  agent: { label: "Agent", cls: "bg-violet-500/10 text-violet-300 ring-violet-400/30" },
  you: { label: "You", cls: "bg-white/5 text-zinc-300 ring-white/15" },
  waiting: { label: "Waiting", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/30" },
};

export const EVIDENCE: Record<EvidenceStatus, { label: string; cls: string }> = {
  tested: { label: "Tested", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" },
  sourced: { label: "Sourced", cls: "bg-[#51a2ff]/10 text-[#8fc2ff] ring-[#51a2ff]/30" },
  uncertain: { label: "Uncertain", cls: "bg-orange-500/10 text-orange-300 ring-orange-400/30" },
};

export const DIFFICULTY: Record<Difficulty, { label: string; cls: string; dot: string }> = {
  easy: { label: "Easy", cls: "text-emerald-300", dot: "bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60" },
  moderate: { label: "Moderate", cls: "text-amber-300", dot: "bg-amber-400 shadow-[0_0_10px] shadow-amber-400/60" },
  hard: { label: "Hard", cls: "text-rose-300", dot: "bg-rose-400 shadow-[0_0_10px] shadow-rose-400/60" },
};
