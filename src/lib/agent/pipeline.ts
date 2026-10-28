import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GuideDraft, type Claim, type Guide } from "@/lib/schema";
import { DIRECTORY, slugify } from "@/lib/directory";
import { CLIENT_TOOLS, runClientTool, type ProbeResult } from "./probes";
import { COMPOSE_SYSTEM, RESEARCH_SYSTEM, VERIFY_SYSTEM } from "./prompts";
import { BudgetError, MODEL, RUN_CAP_USD, addTurn, emptyUsage, type Usage } from "./cost";

export { MODEL };

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
  | { type: "cost"; usd: number }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

const client = new Anthropic();

type Tools = Anthropic.Beta.Messages.BetaToolUnion[];

type LoopState = { sources: Map<string, string>; probes: ProbeResult[]; searches: number; fetches: number; usage: Usage };

const newState = (): LoopState => ({ sources: new Map(), probes: [], searches: 0, fetches: 0, usage: emptyUsage() });

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
  capUsd?: number;
}): Promise<Anthropic.Beta.Messages.BetaMessage> {
  const { messages, emit, st } = opts;
  for (let turn = 0; turn < (opts.maxTurns ?? 10); turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      // Each turn resends the whole history, fetched pages included; caching bills the repeat at 10%.
      cache_control: { type: "ephemeral" },
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: opts.effort, ...(opts.format ? { format: opts.format } : {}) },
      system: opts.system,
      tools: opts.tools,
      messages,
    });
    stream.on("contentBlock", (b) => observeBlock(b, emit, st));
    const msg = await stream.finalMessage();
    addTurn(st.usage, MODEL, msg.usage);
    emit({ type: "cost", usd: st.usage.usd });
    messages.push({ role: "assistant", content: msg.content });
    if (st.usage.usd > (opts.capUsd ?? RUN_CAP_USD)) {
      throw new BudgetError(`Stopped: this run reached its $${(opts.capUsd ?? RUN_CAP_USD).toFixed(2)} cost cap.`);
    }

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

/** Everything the research phase learned; serializable so the build script can cache it. */
export type Research = {
  query: string;
  dossier: string;
  sources: [string, string][];
  probes: ProbeResult[];
  searches: number;
  fetches: number;
  durationSec: number;
  usage: Usage;
};

// Composio facts the agent gets from our tool and prompt, so claims about them can cite these.
const COMPOSIO_SOURCES: [string, string][] = [
  [DIRECTORY.source, "Composio: managed OAuth apps directory"],
  ["https://docs.composio.dev/docs/authentication/white-labeling-authentication", "Composio: white-labeling authentication (callback URL)"],
  ["https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app", "Composio: managed vs custom auth"],
];

export async function research(query: string, emit: Emit): Promise<Research> {
  const started = Date.now();
  const st = newState();
  COMPOSIO_SOURCES.forEach(([u, t]) => st.sources.set(normUrl(u), t));

  emit({ type: "phase", phase: "research", message: `Investigating ${query}` });
  const msg = await runLoop({
    system: RESEARCH_SYSTEM,
    messages: [{ role: "user", content: `App to investigate: ${query}\nToday's date: ${new Date().toISOString().slice(0, 10)}` }],
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 5 },
      { type: "web_fetch_20250910", name: "web_fetch", max_uses: 6, max_content_tokens: 8000 },
      ...CLIENT_TOOLS,
    ],
    effort: "medium",
    emit,
    st,
  });
  return {
    query,
    dossier: finalText(msg),
    sources: [...st.sources.entries()],
    probes: st.probes,
    searches: st.searches,
    fetches: st.fetches,
    durationSec: Math.round((Date.now() - started) / 1000),
    usage: st.usage,
  };
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

// The guide schema is too large for constrained decoding, so the schema goes in the
// prompt and the output is validated here, with one repair round on failure.
const GUIDE_JSON_SCHEMA = JSON.stringify(z.toJSONSchema(GuideDraft));

export async function compose(r: Research, emit: Emit, origin: Guide["origin"] = "generated"): Promise<Guide> {
  const started = Date.now();
  const st: LoopState = { sources: new Map(r.sources), probes: r.probes, searches: r.searches, fetches: r.fetches, usage: { ...(r.usage ?? emptyUsage()) } };

  emit({ type: "phase", phase: "compose", message: "Writing the guide from what the agent found" });
  const probeLog = r.probes.map((p) => `- [PROBE] ${p.name} ${p.target}: ${p.result}`).join("\n") || "(none)";
  const sourceList = r.sources.map(([u, t]) => `- ${u} (${t})`).join("\n");
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    {
      role: "user",
      content:
        `App: ${r.query}\n\n<dossier>\n${r.dossier}\n</dossier>\n\n<probe_results>\n${probeLog}\n</probe_results>\n\n` +
        `<urls_seen_during_research>\n${sourceList}\n</urls_seen_during_research>\n\n` +
        `Respond with only a JSON object (no prose, no code fence) matching this JSON Schema:\n${GUIDE_JSON_SCHEMA}`,
    },
  ];

  let draft: GuideDraft | null = null;
  for (let attempt = 0; attempt < 2 && !draft; attempt++) {
    const msg = await runLoop({ system: COMPOSE_SYSTEM, messages, tools: [], effort: "medium", emit: () => {}, st });
    try {
      draft = GuideDraft.parse(extractJson(finalText(msg)));
    } catch (e) {
      if (attempt === 1) throw new Error(`Guide output failed validation: ${(e as Error).message.slice(0, 500)}`);
      messages.push({ role: "user", content: `That JSON failed validation:\n${(e as Error).message.slice(0, 2000)}\nReturn the corrected full JSON object only.` });
    }
  }
  if (!draft) throw new Error("No guide produced");

  const slug = origin === "library" ? slugify(r.query) : `${slugify(draft.appName)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...draft,
    claims: enforceEvidence(draft.claims, st),
    slug,
    origin,
    createdAt: new Date().toISOString(),
    probes: r.probes,
    agentRun: { model: MODEL, searches: r.searches, fetches: r.fetches, probes: r.probes.length, durationSec: r.durationSec + Math.round((Date.now() - started) / 1000), costUsd: Math.round(st.usage.usd * 1000) / 1000 },
  };
}

export async function generateGuide(query: string, emit: Emit, origin: Guide["origin"] = "generated"): Promise<Guide> {
  return compose(await research(query, emit), emit, origin);
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
export async function verifyGuide(guide: Guide, emit: Emit, max = 8): Promise<Guide> {
  const targets = pickClaimsToVerify(guide, max);
  emit({ type: "phase", phase: "verify", message: `Re-checking ${targets.length} key claims against their sources` });
  if (!targets.length) return { ...guide, verifiedAt: new Date().toISOString() };

  const st = newState();
  const list = targets.map((c) => `${c.id}: ${c.statement}\n  cited: ${c.sources.map((s) => s.url).join(" , ")}`).join("\n");
  const msg = await runLoop({
    system: VERIFY_SYSTEM,
    messages: [{ role: "user", content: `Check these claims about ${guide.appName}:\n\n${list}` }],
    tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 8, max_content_tokens: 8000 }],
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
  const run = guide.agentRun && { ...guide.agentRun, costUsd: Math.round(((guide.agentRun.costUsd ?? 0) + st.usage.usd) * 1000) / 1000 };
  return { ...guide, claims, agentRun: run, verifiedAt: new Date().toISOString() };
}
