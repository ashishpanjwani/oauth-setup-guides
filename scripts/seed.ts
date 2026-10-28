/**
 * Generate seed guides with the same pipeline the live flow uses and save them to data/guides.
 *   npx tsx --env-file=.env.local scripts/seed.ts "GitHub"
 * One app at a time; stops before starting another once --max-usd (default $0.25) is spent.
 */
import { promises as fs } from "fs";
import path from "path";
import { generateGuide, type AgentEvent } from "@/lib/agent/pipeline";

function log(e: AgentEvent) {
  if (e.type === "phase") console.log(`\n== ${e.message}`);
  if (e.type === "search") console.log(`  search: ${e.query}`);
  if (e.type === "fetch") console.log(`  fetch ${e.ok ? "ok  " : "FAIL"} ${e.url}${e.error ? ` (${e.error})` : ""}`);
  if (e.type === "probe") console.log(`  probe: ${e.probe.target} -> ${e.probe.result}`);
  if (e.type === "check") console.log(`  quotes confirmed: ${e.kept}, downgraded to uncertain: ${e.downgraded}`);
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
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
