/**
 * Generate seed guides with the same pipeline the live flow uses and save them to data/guides.
 *   npx tsx --env-file=.env.local scripts/seed.ts "GitHub"
 * One app at a time; stops before starting another once --max-usd (default $0.25) is spent.
 */
import { promises as fs } from "fs";
import path from "path";
import { generateGuide, type AgentEvent } from "@/lib/agent/pipeline";
import type { Guide } from "@/lib/schema";

/** Regression check: every fact we know must be in this guide. Returns the missing ones, or null if none recorded. */
async function checkKnownFacts(guide: Guide): Promise<string[] | null> {
  const all = JSON.parse(await fs.readFile(path.join(process.cwd(), "data/checks/known-facts.json"), "utf8"));
  const facts: { fact: string; all: string[] }[] | undefined = all[guide.slug];
  if (!facts) return null;
  const { claims, probes, agentRun, ...rest } = guide;
  void probes;
  void agentRun;
  const text = JSON.stringify(rest) + " " + claims.map((c) => c.statement).join(" ");
  return facts.filter((f) => !f.all.every((p) => new RegExp(p, "i").test(text))).map((f) => f.fact);
}

function log(e: AgentEvent) {
  if (e.type === "phase") console.log(`\n== ${e.message}`);
  if (e.type === "search") console.log(`  search: ${e.query}`);
  if (e.type === "fetch") console.log(`  fetch ${e.ok ? "ok  " : "FAIL"} ${e.url}${e.error ? ` (${e.error})` : ""}`);
  if (e.type === "probe") console.log(`  probe: ${e.probe.target} -> ${e.probe.result}`);
  if (e.type === "coverage") console.log(e.found.length || !e.missing.length ? `  coverage: found ${e.found.join(", ") || "-"}, still missing ${e.missing.join(", ") || "none"}` : `  coverage: missing ${e.missing.join(", ")}, searching`);
  if (e.type === "support") console.log(`  support check: ${e.checked} claims, ${e.downgraded} downgraded to uncertain`);
  if (e.type === "check") console.log(`  quotes confirmed: ${e.kept}, downgraded to uncertain: ${e.downgraded}`);
  if (e.type === "edit") console.log(`  rule violations before edit: ${e.before}, after: ${e.after}`);
}

async function main() {
  const args = process.argv.slice(2);
  const capIdx = args.indexOf("--max-usd");
  const maxUsd = capIdx >= 0 ? Number(args[capIdx + 1]) : 0.25;
  const apps = args.filter((_, i) => capIdx < 0 || (i !== capIdx && i !== capIdx + 1));
  let spent = 0;
  for (const app of apps) {
    if (spent >= maxUsd) {
      console.log(`\nStopping before ${app}: spent $${spent.toFixed(3)} of $${maxUsd}.`);
      break;
    }
    const guide = await generateGuide(app, log, true);
    const file = path.join(process.cwd(), "data/guides", `${guide.slug}.json`);
    await fs.writeFile(file, JSON.stringify(guide, null, 2));
    spent += guide.agentRun?.costUsd ?? 0;
    const counts = guide.claims.reduce<Record<string, number>>((m, c) => ((m[c.status] = (m[c.status] ?? 0) + 1), m), {});
    console.log(`\nSaved data/guides/${guide.slug}.json: ${guide.difficulty}, claims ${JSON.stringify(counts)}, ${guide.agentRun?.durationSec}s, $${guide.agentRun?.costUsd}`);
    const missing = await checkKnownFacts(guide);
    if (missing === null) console.log("  known facts: none recorded for this app");
    else if (missing.length) {
      process.exitCode = 1;
      console.log(`  KNOWN FACTS MISSING (${missing.length}):\n${missing.map((m) => `    ✗ ${m}`).join("\n")}`);
    } else console.log("  known facts: all present");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
