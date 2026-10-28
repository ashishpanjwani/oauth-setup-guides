import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GuideDraft, type Claim, type Guide } from "@/lib/schema";
import { slugify } from "@/lib/directory";
import { CLIENT_TOOLS, runClientTool, type ProbeResult } from "./probes";
import { COMPOSE_SYSTEM, RESEARCH_SYSTEM, VERIFY_SYSTEM } from "./prompts";

export const MODEL = "claude-opus-5-5";
// Refusal fallback (routes a declined request to another model) + short progress notes between tool calls.
const BETAS = ["server-side-fallback-2026-07-01", "thinking-display-updates-2026-08-18"];

export type AgentEvent =
  | { type: "phase"; phase: "research" | "compose" | "verify" | "done"; message: string }
  | { type: "note"; text: string }
  | { type: "search"; query: string }
  | { type: "search_results"; results: { title: string; url: string }[] }
  | { type: "fetch"; url: string }
  | { type: "fetch_result"; url: string; ok: boolean }
  | { type: "probe"; probe: ProbeResult }
  | { type: "directory"; text: string }
  | { type: "claim_check"; claimId: string; verdict: string; evidence: string }
  | { type: "guide"; slug: string }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

const client = new Anthropic();

type Tools = Anthropic.Beta.Messages.BetaToolUnion[];

type LoopState = { sources: Map<string, string>; probes: ProbeResult[]; searches: number; fetches: number };

function normUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

/** Surface what the agent is doing as it happens, and remember every URL it actually saw. */
function observeBlock(block: Anthropic.Beta.Messages.BetaContentBlock, emit: Emit, st: LoopState) {
  switch (block.type) {
    case "thinking":
      if (block.thinking.trim()) emit({ type: "note", text: block.thinking.trim() });
      break;
    case "server_tool_use": {
      const input = block.input as { query?: string; url?: string };
      if (block.name === "web_search" && input.query) {
        st.searches++;
        emit({ type: "search", query: input.query });
      } else if (block.name === "web_fetch" && input.url) {
        st.fetches++;
        emit({ type: "fetch", url: input.url });
      }
      break;
    }
    case "web_search_tool_result":
      if (Array.isArray(block.content)) {
        const results = block.content.map((r) => ({ title: r.title, url: r.url }));
        results.forEach((r) => st.sources.set(normUrl(r.url), r.title));
        emit({ type: "search_results", results: results.slice(0, 4) });
      }
      break;
    case "web_fetch_tool_result": {
      const c = block.content;
      if (c.type === "web_fetch_result") {
        st.sources.set(normUrl(c.url), c.content.title ?? c.url);
        emit({ type: "fetch_result", url: c.url, ok: true });
      } else {
        emit({ type: "fetch_result", url: "", ok: false });
      }
      break;
    }
  }
}

/** Manual agent loop: streams each turn, runs our client tools, resumes paused server-tool turns. */
async function runLoop(opts: {
  system: string;
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
  tools: Tools;
  effort: "low" | "medium" | "high";
  format?: ReturnType<typeof zodOutputFormat>;
  emit: Emit;
  st: LoopState;
  maxTurns?: number;
}): Promise<Anthropic.Beta.Messages.BetaMessage> {
  const { messages, emit, st } = opts;
  for (let turn = 0; turn < (opts.maxTurns ?? 15); turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: "default",
      thinking: { type: "adaptive", display: "updates" },
      output_config: { effort: opts.effort, ...(opts.format ? { format: opts.format } : {}) },
      system: opts.system,
      tools: opts.tools,
      messages,
    });
    stream.on("contentBlock", (b) => observeBlock(b, emit, st));
    const msg = await stream.finalMessage();
    messages.push({ role: "assistant", content: msg.content });

    if (msg.stop_reason === "refusal") throw new Error(`Model declined: ${msg.stop_details?.explanation ?? "no detail"}`);
    if (msg.stop_reason === "pause_turn") continue; // server resumes from the trailing server_tool_use
    if (msg.stop_reason !== "tool_use") return msg;

    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      try {
        const out = await runClientTool(block.name, block.input as Record<string, string>);
        if (out.probe) {
          st.probes.push(out.probe);
          st.sources.set(normUrl(out.probe.target), `Probe: ${out.probe.name}`);
          emit({ type: "probe", probe: out.probe });
        } else {
          emit({ type: "directory", text: out.text });
        }
        results.push({ type: "tool_result", tool_use_id: block.id, content: out.text });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: (e as Error).message, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("Agent hit its turn limit before finishing");
}

function finalText(msg: Anthropic.Beta.Messages.BetaMessage): string {
  return msg.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Enforce the evidence rules in code rather than trusting the model:
 * - "verified" can only come from the verify pass
 * - "tested" needs a source that is one of our probe targets
 * - every cited URL must have been seen during research; otherwise the claim is uncertain
 */
function enforceEvidence(claims: Claim[], st: LoopState): Claim[] {
  const probeTargets = new Set(st.probes.map((p) => normUrl(p.target)));
  const seen = (u: string) => st.sources.has(normUrl(u)) || st.sources.has(normUrl(u.split("?")[0]));
  return claims.map((c) => {
    let { status, note } = c;
    const unseen = c.sources.filter((s) => !seen(s.url));
    if (status === "verified") status = "sourced";
    if (status === "tested" && !c.sources.some((s) => probeTargets.has(normUrl(s.url)))) status = "sourced";
    if (unseen.length && unseen.length === c.sources.length && status !== "uncertain") {
      status = "uncertain";
      note = `${note ? note + " " : ""}[Auto-check: cited URL was not among pages the agent actually opened or found.]`;
    }
    if (status === "sourced" && c.sources.length === 0) status = "uncertain";
    return { ...c, status, note };
  });
}

export async function generateGuide(query: string, emit: Emit, origin: Guide["origin"] = "generated"): Promise<Guide> {
  const started = Date.now();
  const st: LoopState = { sources: new Map(), probes: [], searches: 0, fetches: 0 };

  emit({ type: "phase", phase: "research", message: `Investigating ${query}` });
  const research = await runLoop({
    system: RESEARCH_SYSTEM,
    messages: [{ role: "user", content: `App to investigate: ${query}\nToday's date: ${new Date().toISOString().slice(0, 10)}` }],
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 8 },
      { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10, max_content_tokens: 20000 },
      ...CLIENT_TOOLS,
    ],
    effort: "medium",
    emit,
    st,
  });
  const dossier = finalText(research);

  emit({ type: "phase", phase: "compose", message: "Writing the guide from what the agent found" });
  const probeLog = st.probes.map((p) => `- [PROBE] ${p.name} ${p.target}: ${p.result}`).join("\n") || "(none)";
  const sourceList = [...st.sources.entries()].map(([u, t]) => `- ${u} (${t})`).join("\n");
  const composed = await runLoop({
    system: COMPOSE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `App: ${query}\n\n<dossier>\n${dossier}\n</dossier>\n\n<probe_results>\n${probeLog}\n</probe_results>\n\n<urls_seen_during_research>\n${sourceList}\n</urls_seen_during_research>`,
      },
    ],
    tools: [],
    effort: "medium",
    format: zodOutputFormat(GuideDraft),
    emit: () => {},
    st,
  });
  const draft = GuideDraft.parse(JSON.parse(finalText(composed)));

  const slug = origin === "library" ? slugify(draft.appName) : `${slugify(draft.appName)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...draft,
    claims: enforceEvidence(draft.claims, st),
    slug,
    origin,
    createdAt: new Date().toISOString(),
    probes: st.probes,
    agentRun: { model: MODEL, searches: st.searches, fetches: st.fetches, probes: st.probes.length, durationSec: Math.round((Date.now() - started) / 1000) },
  };
}

const VerifyResult = z.object({
  results: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.enum(["supported", "partial", "not_found", "contradicted", "unreachable"]),
      evidence: z.string(),
    }),
  ),
});

/** Claims the verdict and blockers depend on are checked first. */
function pickClaimsToVerify(guide: Guide, max: number): Claim[] {
  const weight = new Map<string, number>();
  const bump = (ids: string[], w: number) => ids.forEach((id) => weight.set(id, (weight.get(id) ?? 0) + w));
  bump(guide.verdict.claimIds, 5);
  guide.blockers.forEach((b) => bump(b.claimIds, 3));
  guide.prerequisites.forEach((p) => bump(p.claimIds, 2));
  guide.stages.forEach((s) => s.steps.forEach((st) => bump(st.claimIds, 1)));
  return guide.claims
    .filter((c) => c.status === "sourced" && c.sources.length > 0)
    .sort((a, b) => (weight.get(b.id) ?? 0) - (weight.get(a.id) ?? 0))
    .slice(0, max);
}

/** Second, independent pass: re-open each cited page and check the claim against it. */
export async function verifyGuide(guide: Guide, emit: Emit, max = 10): Promise<Guide> {
  const targets = pickClaimsToVerify(guide, max);
  emit({ type: "phase", phase: "verify", message: `Re-checking ${targets.length} key claims against their sources` });
  if (!targets.length) return { ...guide, verifiedAt: new Date().toISOString() };

  const st: LoopState = { sources: new Map(), probes: [], searches: 0, fetches: 0 };
  const list = targets.map((c) => `${c.id}: ${c.statement}\n  cited: ${c.sources.map((s) => s.url).join(" , ")}`).join("\n");
  const msg = await runLoop({
    system: VERIFY_SYSTEM,
    messages: [{ role: "user", content: `Check these claims about ${guide.appName}:\n\n${list}` }],
    tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 12, max_content_tokens: 20000 }],
    effort: "low",
    format: zodOutputFormat(VerifyResult),
    emit,
    st,
  });
  const { results } = VerifyResult.parse(JSON.parse(finalText(msg)));

  const byId = new Map(results.map((r) => [r.claimId, r]));
  const claims = guide.claims.map((c): Claim => {
    const r = byId.get(c.id);
    if (!r) return c;
    emit({ type: "claim_check", claimId: c.id, verdict: r.verdict, evidence: r.evidence });
    const add = (s: string) => `${c.note ? c.note + " " : ""}[Checker: ${s}]`;
    switch (r.verdict) {
      case "supported":
        return { ...c, status: "verified", note: add(`confirmed in source. ${r.evidence}`) };
      case "partial":
        return { ...c, note: add(`only partly supported. ${r.evidence}`) };
      case "not_found":
        return { ...c, status: "uncertain", note: add(`not found in the cited source. ${r.evidence}`) };
      case "contradicted":
        return { ...c, status: "uncertain", note: add(`source says otherwise: ${r.evidence}`) };
      case "unreachable":
        return { ...c, note: add("couldn't re-open the source to check.") };
    }
  });
  return { ...guide, claims, verifiedAt: new Date().toISOString() };
}
