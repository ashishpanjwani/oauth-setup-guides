import { slotPhase, type Difficulty, type GuideDraft } from "./schema";

/**
 * The summary stats are computed from what the guide already checks (which launch
 * obstacles apply, the steps, the provider's stated wait), not guessed by the writer,
 * so the same guide always shows the same numbers and each says what it is based on.
 */

type G = Pick<GuideDraft, "gates" | "steps" | "claims" | "cost" | "statClaimIds" | "appName">;

const applies = (g: G, gate: string) => g.gates.some((x) => x.gate === gate && x.applies === "yes");
/** The docs didn't settle whether users can connect before a review, so no stat may claim there is none. */
const reviewUnknown = (g: G) => g.gates.some((x) => x.gate === "review" && x.applies === "unknown");
const waitStep = (g: G) => g.steps.find((s) => s.slot === "wait_review");
const backed = (g: G, ids: string[]) =>
  ids.some((id) => {
    const c = g.claims.find((x) => x.id === id);
    return !!c && c.status !== "uncertain";
  });

/** Longest wait the provider states, in weeks, from the wait step's detail and its sourced claims. */
function statedWaitWeeks(g: G): number | null {
  const s = waitStep(g);
  if (!s) return null;
  const text = [s.detail, ...s.claimIds.map((id) => g.claims.find((c) => c.id === id && c.status !== "uncertain")?.statement ?? "")].join(" ");
  const weeks = [...text.matchAll(/(\d+)\s*(business\s+)?(day|week)s?/gi)].map((m) => (m[3].toLowerCase() === "week" ? Number(m[1]) : Number(m[1]) / 5));
  if (/within a week/i.test(text)) weeks.push(1);
  return weeks.length ? Math.max(...weeks) : null;
}

/** Hours, days or weeks in the wait step's own words, if it states any. */
function statesDuration(text: string): boolean {
  return /\d+\s*(business\s+)?(hour|day|week|month)s?|within a (day|week|month)/i.test(text);
}

export function difficulty(g: G): { level: Difficulty; reason: string } {
  const why: string[] = [];
  const assessment = g.steps.some((s) => s.slot === "security_assessment");
  const weeks = statedWaitWeeks(g);
  if (assessment) why.push("security assessment");
  if (applies(g, "review")) why.push(weeks && weeks >= 2 ? `review of up to ${weeks} weeks` : "provider review");
  if (applies(g, "register")) why.push("registration or verification");
  if (applies(g, "paid_access")) why.push("paid API");
  const level: Difficulty = assessment || (weeks !== null && weeks >= 2) ? "hard" : why.length ? "moderate" : "easy";
  const none = reviewUnknown(g) ? "self-serve, no payment; review not confirmed" : "self-serve, no review or payment";
  return { level, reason: why.length ? why.join(", ") : none };
}

export function timeToTest(g: G): { value: string; basis: string } {
  const waits = g.steps.filter((s) => slotPhase(s.slot) === "setup" && s.who === "waiting").length;
  return waits ? { value: "Includes a wait", basis: "setup has a step that waits on the provider" } : { value: "Same day", basis: "no provider wait during setup" };
}

export function timeToProduction(g: G): { value: string; basis: string; claimIds: string[] } {
  const launch = g.steps.filter((s) => (s.phase ?? slotPhase(s.slot)) === "launch");
  if (!launch.length && reviewUnknown(g))
    return { value: "Review not confirmed", basis: `${g.appName}'s docs don't say whether users can connect before a review`, claimIds: [] };
  if (!launch.length) return { value: "Right after setup", basis: "no review or publish step", claimIds: [] };
  const w = waitStep(g);
  // A review that applies but states no wait is still a review, not "no wait".
  if (!w && applies(g, "review")) return { value: "Review time not published", basis: `${g.appName} doesn't state how long its review takes`, claimIds: [] };
  if (!w) return { value: "No review wait", basis: `${launch.length} go-live ${launch.length === 1 ? "step" : "steps"}, none waiting on the provider`, claimIds: [] };
  if (statesDuration(w.detail) && backed(g, w.claimIds)) return { value: w.detail, basis: "the provider's stated review time", claimIds: w.claimIds };
  return { value: "Review time not published", basis: `${g.appName} doesn't state how long its review takes`, claimIds: [] };
}

export function stepCounts(g: G): string {
  const phase = (s: G["steps"][number]) => s.phase ?? slotPhase(s.slot);
  const setup = g.steps.filter((s) => phase(s) === "setup").length;
  const launch = g.steps.filter((s) => phase(s) === "launch").length;
  const waits = g.steps.filter((s) => s.who === "waiting").length;
  const agent = g.steps.filter((s) => s.who === "agent").length;
  const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
  return [n(setup, "setup step"), launch ? n(launch, "go-live step") : "", waits ? n(waits, "review wait") : "", `an agent can do ${agent}`].filter(Boolean).join(" · ");
}

export function cost(g: G): { value: string; claimIds: string[] } {
  const ids = g.statClaimIds?.cost ?? [];
  return { value: g.cost, claimIds: backed(g, ids) ? ids : [] };
}

