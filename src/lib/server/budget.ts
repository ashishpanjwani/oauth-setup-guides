import { DAILY_CAP_USD } from "@/lib/agent/cost";
import { addDailySpend, getDailySpend } from "@/lib/store";
import type { AgentEvent } from "@/lib/agent/pipeline";

/** Refuse new runs once today's spend reaches the cap. */
export async function overDailyBudget(): Promise<boolean> {
  return (await getDailySpend()).usd >= DAILY_CAP_USD;
}

/** Wrap an emitter so the last reported run cost can be added to the ledger when the run ends. */
export function trackCost(emit: (e: AgentEvent) => void) {
  let usd = 0;
  return {
    emit: (e: AgentEvent) => {
      if (e.type === "cost") usd = e.usd;
      emit(e);
    },
    settle: () => addDailySpend(usd),
  };
}
