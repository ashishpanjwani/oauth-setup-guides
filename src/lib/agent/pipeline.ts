import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GateId, GuideDraft, SLOTS, STATS, slotPhase, type Claim, type Gate, type Guide } from "@/lib/schema";
import { slugify } from "@/lib/text";
import { COMPOSE_SYSTEM, EDITOR_SYSTEM, REQUOTE_SYSTEM, RESEARCH_SYSTEM, SUPPORT_SYSTEM } from "./prompts";
import { lintGuide, type Violation } from "./lint";
import { RESEARCH_MODEL, WRITER_MODEL, RUN_CAP_USD, BudgetError, addTurn, emptyUsage, type Usage } from "./cost";
import { fetchPage, probeConsole, quoteOnPage, type Page, type Probe } from "./web";


export type AgentEvent =
  | { type: "phase"; phase: "research" | "fetch" | "compose" | "check" | "edit" | "done"; message: string }
  | { type: "search"; query: string }
  | { type: "fetch"; url: string; ok: boolean; error?: string }
  | { type: "probe"; probe: Probe }
  | { type: "check"; kept: number; downgraded: number }
  | { type: "setup"; missing: string[]; retrying: boolean }
  | { type: "coverage"; missing: string[]; found: string[] }
  | { type: "support"; checked: number; downgraded: number }
  | { type: "requote"; tried: number; fixed: number }
  | { type: "edit"; before: number; after: number }
  | { type: "guide"; slug: string }
  | { type: "cost"; usd: number }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

// A call that stalls fails fast instead of hanging the request.
const client = new Anthropic({ timeout: 150_000 });

/** One model call, resuming if a server-side tool loop pauses. Tracks spend against the run cap. */
async function call(
  model: string,
  params: Omit<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming, "model" | "max_tokens" | "messages"> & { messages: Anthropic.Beta.Messages.BetaMessageParam[] },
  usage: Usage,
  emit: Emit,
): Promise<string> {
  const messages = [...params.messages];
  // Sonnet supports a server-side fallback if a request is declined; Haiku has none.
  const fallback = model === "claude-sonnet-5-5" ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};
  for (let i = 0; i < 4; i++) {
    const stream = client.beta.messages.stream({ ...params, ...fallback, model, max_tokens: 32000, messages });
    stream.on("contentBlock", (b) => {
      if (b.type === "server_tool_use" && b.name === "web_search") emit({ type: "search", query: (b.input as { query?: string }).query ?? "" });
    });
    const msg = await stream.finalMessage();
    addTurn(usage, model, msg.usage);
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
const PageKind = z.enum(["setup", "registration", "credentials", "settings", "scopes", "review", "admin", "limits", "pricing", "other"]);
type PageKind = z.infer<typeof PageKind>;
const SourcePage = z.object({ url: z.string(), title: z.string(), kind: PageKind });

const Sources = z.object({
  developerConsoleUrl: z.string().describe("Where a developer registers the OAuth app"),
  gates: z.array(z.object({ gate: GateId, applies: z.enum(["yes", "no", "unknown"]), finding: z.string(), url: z.string() })).describe("One finding per launch gate"),
  pages: z.array(SourcePage).describe("Up to 8 official documentation pages, each labelled with what it covers"),
  notes: z.string().describe("Anything relevant from search results, each fact followed by its URL"),
});

/** Page kinds a guide can't be right without: always the setup walkthrough, registration and scopes, plus one per gate that applies. */
function requiredKinds(gates: z.infer<typeof Sources>["gates"]): PageKind[] {
  const applies = (id: string) => gates.some((g) => g.gate === id && g.applies === "yes");
  const kinds: PageKind[] = ["setup", "registration", "scopes"];
  if (applies("review")) kinds.push("review");
  if (applies("admin_approval")) kinds.push("admin");
  if (applies("test_limits")) kinds.push("limits");
  if (applies("paid_access")) kinds.push("pricing");
  return kinds;
}

/** One targeted search for page kinds the first pass didn't find. */
async function findMissing(query: string, missing: PageKind[], usage: Usage, emit: Emit): Promise<z.infer<typeof SourcePage>[]> {
  const text = await call(
    RESEARCH_MODEL,
    {
      system: RESEARCH_SYSTEM,
      messages: [
        {
          role: "user",
          content: `App: ${query}\nOnly find the official documentation page for each of these, about ${query} itself: ${missing.join(", ")}. "setup" means the provider's own guide to setting up OAuth for an app (creating it, the redirect URI, the client ID and secret, the authorize step), not a bot or feature quickstart. "scopes" means the scopes or permissions reference for this specific product's API. Return them as pages, each labelled with its kind; return empty gates and notes.`,
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
      output_config: { effort: "low", format: zodOutputFormat(Sources) },
    },
    usage,
    emit,
  );
  return Sources.parse(JSON.parse(text)).pages;
}

/** Pick up to 8 pages: one of each required kind first, then the rest in research order. */
function pickPages(pages: z.infer<typeof SourcePage>[], required: PageKind[], consoleUrl: string) {
  const norm = (u: string) => u.replace(/\/$/, "");
  const seen = new Set<string>();
  const usable = pages.filter((p) => norm(p.url) !== norm(consoleUrl) && !seen.has(norm(p.url)) && seen.add(norm(p.url)));
  const first = required.map((k) => usable.find((p) => p.kind === k)).filter((p): p is z.infer<typeof SourcePage> => Boolean(p));
  return [...new Set([...first, ...usable])].slice(0, 8);
}

async function findSources(query: string, usage: Usage, emit: Emit) {
  const text = await call(
    RESEARCH_MODEL,
    {
      system: RESEARCH_SYSTEM,
      messages: [{ role: "user", content: `App: ${query}\nToday: ${new Date().toISOString().slice(0, 10)}` }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
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

/** The skeleton decides the order: steps are sorted by slot (stable within a slot) and get their phase from it. */
function orderSteps(g: GuideDraft): GuideDraft {
  const rank = (slot: string) => SLOTS.findIndex((x) => x.id === slot);
  const steps = g.steps.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s.slot) - rank(b.s.slot) || a.i - b.i);
  return { ...g, steps: steps.map(({ s }) => ({ ...s, phase: slotPhase(s.slot) })) };
}

/** Required slots the writer left empty, checked in code. */
function setupGaps(g: GuideDraft): string[] {
  // A provider with a test mode always has a step that leaves it.
  const testMode = g.gates.some((x) => x.gate === "test_limits" && x.applies === "yes");
  return SLOTS.filter((x) => (x.required || (x.id === "publish" && testMode)) && !g.steps.some((s) => s.slot === x.id)).map((x) => `${x.id}: ${x.what}`);
}

// (d) Write the guide from the fetched pages and probe results.
async function writeGuide(query: string, pages: Page[], probes: Probe[], research: z.infer<typeof Sources>, usage: Usage, emit: Emit): Promise<GuideDraft> {
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
        `<probes>\n${probeLog}\n</probes>\n\n` +
        `<gate_findings>\n${research.gates.map((g) => `- ${g.gate}: ${g.finding} (${g.url})`).join("\n")}\n</gate_findings>\n\n` +
        `<search_notes>\n${research.notes}\n</search_notes>\n\n` +
        `Respond with only a JSON object (no prose, no code fence) matching this JSON Schema:\n${GUIDE_JSON_SCHEMA}`,
    },
  ];
  // One repair for invalid JSON and one for missing setup steps; after that, keep what we have.
  let fixedJson = false;
  let fixedSetup = false;
  for (;;) {
    const text = await call(WRITER_MODEL, { system: COMPOSE_SYSTEM, messages, output_config: { effort: "medium" } }, usage, emit);
    let draft: GuideDraft;
    try {
      draft = GuideDraft.parse(extractJson(text));
    } catch (e) {
      if (fixedJson) throw new Error(`Guide output failed validation: ${(e as Error).message.slice(0, 300)}`);
      fixedJson = true;
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: `That JSON failed validation:\n${(e as Error).message.slice(0, 2000)}\nReturn the corrected full JSON object only.` });
      continue;
    }
    draft = orderSteps(draft);
    const gaps = setupGaps(draft);
    if (!gaps.length || fixedSetup) {
      if (gaps.length) emit({ type: "setup", missing: gaps, retrying: false });
      return draft;
    }
    fixedSetup = true;
    emit({ type: "setup", missing: gaps, retrying: true });
    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content: `These required step slots are empty:\n${gaps.map((x) => `- ${x}`).join("\n")}\nAdd a step for each, citing claims from the pages (uncertain if no page states it), and drop any step that builds app features instead of setting up OAuth. Return the corrected full JSON object only.`,
    });
  }
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
      else if (passages(c.quote).length > 3) reason = "quote joins more than three passages";
      else if (!passages(c.quote).length || passages(c.quote).some(tooShort)) reason = "quote is too short to support the statement";
      else if (!passages(c.quote).every((p) => quoteOnPage(p, page.text))) reason = "quoted sentence not found on the cited page";
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

// Reason comes before the verdict so the verdict is decided after the reasoning, not before it.
const SupportResult = z.object({
  results: z.array(z.object({ id: z.string(), reason: z.string(), supported: z.enum(["yes", "partly", "no"]) })),
});

/**
 * Does each quote fully support its statement? The code check only proves the quote is on
 * the page. This pass can only downgrade a claim to "uncertain", never upgrade one, so a
 * mistake here makes the guide more cautious, not less.
 */
export async function checkSupport(claims: Claim[], usage: Usage, emit: Emit): Promise<Claim[]> {
  // A statement that is its quote, word for word, is supported by definition; no model needed.
  const same = (c: Claim) => c.statement.replace(/\W+/g, " ").trim().toLowerCase() === c.quote.replace(/\W+/g, " ").trim().toLowerCase();
  const quoted = claims.filter((c) => c.status === "sourced" && c.quote && !same(c));
  if (!quoted.length) return claims;
  const text = await call(
    RESEARCH_MODEL,
    {
      system: SUPPORT_SYSTEM,
      messages: [{ role: "user", content: quoted.map((c) => `${c.id}\nstatement: ${c.statement}\nquote: ${c.quote}`).join("\n\n") }],
      output_config: { effort: "low", format: zodOutputFormat(SupportResult) },
    },
    usage,
    emit,
  );
  const verdicts = new Map(SupportResult.parse(JSON.parse(text)).results.map((r) => [r.id, r]));
  let downgraded = 0;
  const out = claims.map((c): Claim => {
    const v = verdicts.get(c.id);
    if (!v || v.supported === "yes" || c.status !== "sourced") return c;
    downgraded++;
    return { ...c, status: "uncertain", note: `${c.note ? c.note + " " : ""}[Check: the quote ${v.supported === "partly" ? "only partly supports" : "doesn't support"} this. ${v.reason}]` };
  });
  emit({ type: "support", checked: quoted.length, downgraded });
  return out;
}

const RequoteResult = z.object({ results: z.array(z.object({ id: z.string(), quote: z.string() })) });

/**
 * Automates the manual fix for "right fact, wrong sentence": for each claim that lost its
 * Sourced status, ask for the sentence on the cited page that states it, then accept it only
 * if code finds it on the page word for word and the support check agrees. Anything else
 * stays uncertain.
 */
/**
 * A URL or a fragment can be "on the page" without supporting anything. Six words is enough;
 * a shorter quote passes only as a complete sentence ("The redirect_uri must use HTTPS.").
 */
function tooShort(quote: string): boolean {
  const q = quote.replace(/https?:\/\/\S+/g, "").trim();
  const words = q.split(/\s+/).filter(Boolean).length;
  return words < 4 || (words < 6 && !/[.!?]$/.test(q));
}

/** A quote may join up to three passages from the same page with " … "; each is checked on its own. */
function passages(quote: string): string[] {
  return quote.split(/\s*…\s+/).filter(Boolean);
}

export async function requoteClaims(draft: Claim[], checked: Claim[], pages: Page[], usage: Usage, emit: Emit): Promise<Claim[]> {
  const norm = (u: string) => u.replace(/\/$/, "");
  const byUrl = new Map(pages.filter((p) => p.ok).map((p) => [norm(p.url), p]));
  const wasSourced = new Set(draft.filter((c) => c.status === "sourced").map((c) => c.id));
  const failed = checked.filter((c) => c.status === "uncertain" && wasSourced.has(c.id) && byUrl.has(norm(c.sourceUrl)));
  if (!failed.length) return checked;

  // One call per page, so each page's text is sent once.
  const candidates: Claim[] = [];
  for (const [url, claims] of Map.groupBy(failed, (c) => norm(c.sourceUrl))) {
    const page = byUrl.get(url)!;
    const text = await call(
      RESEARCH_MODEL,
      {
        system: REQUOTE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `<page url="${page.url}">\n${page.text}\n</page>\n\n<statements>\n${claims.map((c) => `${c.id}: ${c.statement}\n   first quote: "${c.quote}"\n   why it failed: ${c.note.match(/\[Check: ([^\]]*)\]/)?.[1] ?? "not found"}`).join("\n")}\n</statements>`,
          },
        ],
        output_config: { effort: "medium", format: zodOutputFormat(RequoteResult) },
      },
      usage,
      emit,
    );
    for (const r of RequoteResult.parse(JSON.parse(text)).results) {
      const c = claims.find((x) => x.id === r.id);
      const parts = passages(r.quote);
      if (c && parts.length >= 1 && parts.length <= 3 && !parts.some(tooShort) && parts.every((p) => quoteOnPage(p, page.text))) candidates.push({ ...c, status: "sourced", quote: r.quote });
    }
  }
  // The new quotes go through the same support check; only claims that pass are restored.
  const verified = await checkSupport(candidates, usage, () => {});
  const restored = new Map(verified.filter((c) => c.status === "sourced").map((c) => [c.id, c]));
  emit({ type: "requote", tried: failed.length, fixed: restored.size });
  return checked.map((c) => {
    const r = restored.get(c.id);
    return r ? { ...r, note: `${c.note.replace(/\s*\[Check:[^\]]*\]/g, "").trim()} [Re-quoted automatically: the first quote didn't state this.]`.trim() } : c;
  });
}

/**
 * (f) Editor pass: fix the guide against the checklist and the code-found violations.
 * It may only delete or rephrase; claims are restored from the original afterwards, and
 * any claimId the editor invented is dropped.
 */
async function editGuide(draft: GuideDraft, violations: Violation[], usage: Usage, emit: Emit): Promise<GuideDraft> {
  const text = await call(
    WRITER_MODEL,
    {
      system: EDITOR_SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `<guide>\n${JSON.stringify(draft)}\n</guide>\n\n<violations>\n` +
            (violations.map((v) => `- ${v.field} (${v.rule}: ${v.why}): ${v.text}`).join("\n") || "(none)") +
            `\n</violations>`,
        },
      ],
      output_config: { effort: "low" },
    },
    usage,
    emit,
  );
  let edited: GuideDraft;
  try {
    edited = GuideDraft.parse(extractJson(text));
  } catch {
    return draft; // a broken edit never replaces a valid guide
  }
  const ids = new Set(draft.claims.map((c) => c.id));
  const keep = (xs: string[]) => xs.filter((id) => ids.has(id));
  return {
    ...edited,
    claims: draft.claims,
    summaryClaimIds: keep(edited.summaryClaimIds),
    statClaimIds: Object.fromEntries(STATS.map((k) => [k, keep(edited.statClaimIds[k])])) as GuideDraft["statClaimIds"],
    gates: edited.gates.map((g) => ({ ...g, claimIds: keep(g.claimIds) })),
    requirements: edited.requirements.map((r) => ({ ...r, claimIds: keep(r.claimIds) })),
    steps: edited.steps.map((s) => ({ ...s, claimIds: keep(s.claimIds) })),
    blockers: edited.blockers.map((b) => ({ ...b, claimIds: keep(b.claimIds) })),
  };
}

/**
 * A gate's yes/no answer must rest on at least one claim that passed the check;
 * otherwise it becomes "unknown" and is listed under could-not-verify.
 */
function checkGates(gates: Gate[], claims: Claim[], pages: Page[]): { gates: Gate[]; unconfirmed: string[] } {
  const confirmed = new Set(claims.filter((c) => c.status !== "uncertain").map((c) => c.id));
  // "No review" can't be quoted. A "no" may instead rest on an absence claim, but only if it
  // names a page we actually read, where the thing would have been mentioned.
  const read = new Set(pages.filter((p) => p.ok).map((p) => p.url.replace(/\/$/, "")));
  const absence = new Set(claims.filter((c) => c.status === "uncertain" && !c.quote && read.has(c.sourceUrl.replace(/\/$/, ""))).map((c) => c.id));
  const unconfirmed: string[] = [];
  const out = gates.map((g): Gate => {
    if (g.applies === "unknown" || g.claimIds.some((id) => confirmed.has(id))) return g;
    if (g.applies === "no" && g.claimIds.some((id) => absence.has(id))) return g;
    unconfirmed.push(`${g.title}: not confirmed on the provider's pages.`);
    return { ...g, applies: "unknown" };
  });
  return { gates: out, unconfirmed };
}

/** The whole pipeline. library=true gives a stable slug for seed guides; live guides get a unique one. */
export async function generateGuide(query: string, emit: Emit, library = false): Promise<Guide> {
  const started = Date.now();
  const usage = emptyUsage();

  emit({ type: "phase", phase: "research", message: "Finding the official docs" });
  const sources = await findSources(query, usage, emit);

  // Coverage check in code: a missing page kind gets one targeted search before anything is written.
  const required = requiredKinds(sources.gates);
  const missing = required.filter((k) => !sources.pages.some((p) => p.kind === k));
  if (missing.length) {
    emit({ type: "coverage", missing, found: [] });
    const extra = await findMissing(query, missing, usage, emit);
    sources.pages.push(...extra);
    emit({ type: "coverage", missing: missing.filter((k) => !extra.some((p) => p.kind === k)), found: extra.map((p) => p.kind) });
  }

  // (b) + (c): plain HTTP, no model involved. The console is probed, never read as a source.
  emit({ type: "phase", phase: "fetch", message: "Reading the docs and checking the developer console" });
  const [pages, consoleProbe] = await Promise.all([
    Promise.all(pickPages(sources.pages, required, sources.developerConsoleUrl).map((p) => fetchPage(p.url, p.title))),
    probeConsole(sources.developerConsoleUrl),
  ]);
  pages.forEach((p) => emit({ type: "fetch", url: p.url, ok: p.ok, error: p.error }));
  emit({ type: "probe", probe: consoleProbe });
  const probes = [consoleProbe];

  emit({ type: "phase", phase: "compose", message: "Writing the guide" });
  const draft = await writeGuide(query, pages, probes, sources, usage, emit);

  emit({ type: "phase", phase: "check", message: "Checking every quote against its page" });
  const checked = checkClaims(draft.claims, pages, probes);
  emit({ type: "check", kept: checked.kept, downgraded: checked.downgraded });
  checked.claims = await checkSupport(checked.claims, usage, emit);
  checked.claims = await requoteClaims(draft.claims, checked.claims, pages, usage, emit);

  emit({ type: "phase", phase: "edit", message: "Editing against the checklist" });
  const before = lintGuide(draft);
  const edited = orderSteps(await editGuide({ ...draft, claims: checked.claims }, before, usage, emit));
  const after = lintGuide(edited);
  emit({ type: "edit", before: before.length, after: after.length });
  // Gates are checked after editing, since the editor may change what applies.
  const gates = checkGates(edited.gates, checked.claims, pages);

  const unreadable = pages.filter((p) => !p.ok).map((p) => `Couldn't read ${p.url} (${p.error}), so nothing from it is confirmed.`);
  const now = new Date().toISOString();
  return {
    ...edited,
    claims: checked.claims,
    gates: gates.gates,
    couldNotVerify: [...edited.couldNotVerify, ...gates.unconfirmed, ...unreadable],
    slug: library ? slugify(query) : `${slugify(draft.appName)}-${Math.random().toString(36).slice(2, 7)}`,
    reviewed: false,
    createdAt: now,
    checkedAt: now,
    probes,
    agentRun: {
      model: `${RESEARCH_MODEL} + ${WRITER_MODEL}`,
      searches: usage.searches,
      fetches: pages.length,
      probes: probes.length,
      durationSec: Math.round((Date.now() - started) / 1000),
      costUsd: Math.round(usage.usd * 1000) / 1000,
    },
  };
}
