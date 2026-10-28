import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GuideDraft, type Claim, type Guide } from "@/lib/schema";
import { slugify } from "@/lib/text";
import { COMPOSE_SYSTEM, RESEARCH_SYSTEM } from "./prompts";
import { MODEL, RUN_CAP_USD, BudgetError, addTurn, emptyUsage, type Usage } from "./cost";
import { fetchPage, probeConsole, quoteOnPage, type Page, type Probe } from "./web";

export { MODEL };

export type AgentEvent =
  | { type: "phase"; phase: "research" | "fetch" | "compose" | "check" | "done"; message: string }
  | { type: "search"; query: string }
  | { type: "fetch"; url: string; ok: boolean; error?: string }
  | { type: "probe"; probe: Probe }
  | { type: "check"; kept: number; downgraded: number }
  | { type: "guide"; slug: string }
  | { type: "cost"; usd: number }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

// A call that stalls fails fast instead of hanging the request.
const client = new Anthropic({ timeout: 150_000 });

/** One model call, resuming if a server-side tool loop pauses. Tracks spend against the run cap. */
async function call(
  params: Omit<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming, "model" | "max_tokens" | "messages"> & { messages: Anthropic.Beta.Messages.BetaMessageParam[] },
  usage: Usage,
  emit: Emit,
): Promise<string> {
  const messages = [...params.messages];
  for (let i = 0; i < 4; i++) {
    const stream = client.beta.messages.stream({ ...params, model: MODEL, max_tokens: 32000, messages });
    stream.on("contentBlock", (b) => {
      if (b.type === "server_tool_use" && b.name === "web_search") emit({ type: "search", query: (b.input as { query?: string }).query ?? "" });
    });
    const msg = await stream.finalMessage();
    addTurn(usage, MODEL, msg.usage);
    emit({ type: "cost", usd: usage.usd });
    if (usage.usd > RUN_CAP_USD) throw new BudgetError(`Stopped: this run reached its $${RUN_CAP_USD.toFixed(2)} cost cap.`);
    if (msg.stop_reason === "refusal") throw new Error("The model declined this request.");
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    return msg.content.filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n");
  }
  throw new Error("Model call did not finish");
}

// (a) Research: find the official pages worth reading and the developer console URL.
const Sources = z.object({
  developerConsoleUrl: z.string().describe("Where a developer registers the OAuth app"),
  pages: z.array(z.object({ url: z.string(), title: z.string() })).describe("Up to 5 official pages: app registration, scopes, review/verification, limits"),
  notes: z.string().describe("Anything relevant from search results, each fact followed by its URL"),
});

async function findSources(query: string, usage: Usage, emit: Emit) {
  const text = await call(
    {
      system: RESEARCH_SYSTEM,
      messages: [{ role: "user", content: `App: ${query}\nToday: ${new Date().toISOString().slice(0, 10)}` }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      output_config: { effort: "medium", format: zodOutputFormat(Sources) },
    },
    usage,
    emit,
  );
  return Sources.parse(JSON.parse(text));
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

// The guide schema is too large for constrained decoding, so it goes in the prompt and
// the output is validated here, with one repair round on failure.
const GUIDE_JSON_SCHEMA = JSON.stringify(z.toJSONSchema(GuideDraft));

// (d) Write the guide from the fetched pages and probe results.
async function writeGuide(query: string, pages: Page[], probes: Probe[], notes: string, usage: Usage, emit: Emit): Promise<GuideDraft> {
  const docs = pages
    .filter((p) => p.ok)
    .map((p) => `<page url="${p.url}" title="${p.title}">\n${p.text}\n</page>`)
    .join("\n\n");
  const unreadable = pages.filter((p) => !p.ok).map((p) => `- ${p.url} (${p.error})`).join("\n") || "(none)";
  const probeLog = probes.map((p) => `- ${p.target}: ${p.result}`).join("\n") || "(none)";
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    {
      role: "user",
      content:
        `App: ${query}\n\n<pages>\n${docs}\n</pages>\n\n<unreadable_pages>\n${unreadable}\n</unreadable_pages>\n\n` +
        `<probes>\n${probeLog}\n</probes>\n\n<search_notes>\n${notes}\n</search_notes>\n\n` +
        `Respond with only a JSON object (no prose, no code fence) matching this JSON Schema:\n${GUIDE_JSON_SCHEMA}`,
    },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await call({ system: COMPOSE_SYSTEM, messages, output_config: { effort: "low" } }, usage, emit);
    try {
      return GuideDraft.parse(extractJson(text));
    } catch (e) {
      if (attempt === 1) throw new Error(`Guide output failed validation: ${(e as Error).message.slice(0, 300)}`);
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: `That JSON failed validation:\n${(e as Error).message.slice(0, 2000)}\nReturn the corrected full JSON object only.` });
    }
  }
  throw new Error("No guide produced");
}

/**
 * (e) Check in code, not with a model:
 * - "sourced" needs its quote to appear on the fetched page it cites
 * - "tested" needs its source to be a URL we actually probed
 * Anything that fails is downgraded to "uncertain" with the reason.
 */
function checkClaims(claims: Claim[], pages: Page[], probes: Probe[]): { claims: Claim[]; kept: number; downgraded: number } {
  const byUrl = new Map(pages.filter((p) => p.ok).map((p) => [p.url.replace(/\/$/, ""), p]));
  const probed = new Set(probes.map((p) => p.target.replace(/\/$/, "")));
  let kept = 0;
  let downgraded = 0;
  const out = claims.map((c): Claim => {
    const url = c.sourceUrl.replace(/\/$/, "");
    let reason = "";
    if (c.status === "tested" && !probed.has(url)) reason = "marked tested, but that URL wasn't probed";
    if (c.status === "sourced") {
      const page = byUrl.get(url);
      if (!page) reason = "cited page wasn't one we could fetch and read";
      else if (!quoteOnPage(c.quote, page.text)) reason = "quoted sentence not found on the cited page";
    }
    if (!reason) {
      if (c.status !== "uncertain") kept++;
      return c;
    }
    downgraded++;
    return { ...c, status: "uncertain", note: `${c.note ? c.note + " " : ""}[Check: ${reason}.]` };
  });
  return { claims: out, kept, downgraded };
}

/** The whole pipeline. library=true gives a stable slug for seed guides; live guides get a unique one. */
export async function generateGuide(query: string, emit: Emit, library = false): Promise<Guide> {
  const started = Date.now();
  const usage = emptyUsage();

  emit({ type: "phase", phase: "research", message: "Finding the official docs" });
  const sources = await findSources(query, usage, emit);

  // (b) + (c): plain HTTP, no model involved.
  emit({ type: "phase", phase: "fetch", message: "Reading the docs and checking the developer console" });
  const [pages, consoleProbe] = await Promise.all([
    Promise.all(sources.pages.slice(0, 5).map((p) => fetchPage(p.url, p.title))),
    probeConsole(sources.developerConsoleUrl),
  ]);
  pages.forEach((p) => emit({ type: "fetch", url: p.url, ok: p.ok, error: p.error }));
  emit({ type: "probe", probe: consoleProbe });
  const probes = [consoleProbe];

  emit({ type: "phase", phase: "compose", message: "Writing the guide" });
  const draft = await writeGuide(query, pages, probes, sources.notes, usage, emit);

  emit({ type: "phase", phase: "check", message: "Checking every quote against its page" });
  const checked = checkClaims(draft.claims, pages, probes);
  emit({ type: "check", kept: checked.kept, downgraded: checked.downgraded });

  const unreadable = pages.filter((p) => !p.ok).map((p) => `Couldn't read ${p.url} (${p.error}), so nothing from it is confirmed.`);
  const now = new Date().toISOString();
  return {
    ...draft,
    claims: checked.claims,
    couldNotVerify: [...draft.couldNotVerify, ...unreadable],
    slug: library ? slugify(query) : `${slugify(draft.appName)}-${Math.random().toString(36).slice(2, 7)}`,
    reviewed: false,
    createdAt: now,
    checkedAt: now,
    probes,
    agentRun: {
      model: MODEL,
      searches: usage.searches,
      fetches: pages.length,
      probes: probes.length,
      durationSec: Math.round((Date.now() - started) / 1000),
      costUsd: Math.round(usage.usd * 1000) / 1000,
    },
  };
}
