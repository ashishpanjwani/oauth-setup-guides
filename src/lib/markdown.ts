import { slotPhase, type Guide } from "./schema";
import { cost, difficulty, stepCounts, timeToProduction, timeToTest } from "./stats";
import { DIFFICULTY, EVIDENCE, WHO } from "./labels";

/** Plain Markdown so a guide can be pasted into a ticket, PR, or doc. Claims become footnotes. */
export function guideToMarkdown(g: Guide, url?: string): string {
  const num = new Map(g.claims.map((c, i) => [c.id, i + 1]));
  const status = new Map(g.claims.map((c) => [c.id, c.status]));
  // Same rule as the page: a line with no tested or sourced claim is marked unverified.
  const refs = (ids: string[]) => {
    const n = ids.filter((id) => num.has(id));
    const backed = n.some((id) => status.get(id) !== "uncertain");
    return n.map((id) => `[^${num.get(id)}]`).join("") + (backed ? "" : " _(unverified)_");
  };
  const notes = (ids: string[]) => ids.filter((id) => num.has(id)).map((id) => `[^${num.get(id)}]`).join("");
  // The same computed stats as the page (lib/stats), each with what it's based on.
  const diff = difficulty(g);
  const test = timeToTest(g);
  const prod = timeToProduction(g);
  const price = cost(g);
  const out: string[] = [];

  out.push(`# ${g.appName}: OAuth app setup guide`, "");
  out.push(`_${g.reviewed ? "Reviewed by a person" : "Generated, not reviewed"} · checked ${g.checkedAt.slice(0, 10)}${url ? ` · ${url}` : ""}_`, "");
  out.push(`${g.summary}${refs(g.summaryClaimIds)}`, "");
  if (g.appType) out.push(`_This guide covers: ${g.appType}_`, "");
  out.push(
    `- **Difficulty:** ${DIFFICULTY[diff.level].label} (${diff.reason})`,
    `- **Time to test:** ${test.value} (${test.basis})`,
    `- **Time to production:** ${prod.value}${prod.claimIds.length ? notes(prod.claimIds) : ` (${prod.basis})`}`,
    `- **Cost:** ${price.value}${notes(price.claimIds)}`,
    `- **Steps:** ${stepCounts(g)}`,
    ...(g.handoff ? [`- **Agent and you:** ${g.handoff}`] : []),
    "",
  );
  const gates = (g.gates ?? []).filter((x) => x.applies === "yes");
  if (gates.length) {
    out.push("## What can stop you from launching", "");
    gates.forEach((x) => {
      out.push(`**${x.title}**${refs(x.claimIds)}`, "");
      if (x.what) out.push(x.what, "");
      if (x.where) out.push(`- Where: ${x.where}`);
      if (x.todo) out.push(`- What to do: ${x.todo}`);
      out.push("");
    });
  }
  out.push("## Requirements", "", ...g.requirements.map((r) => `- ${r.text}${refs(r.claimIds)}`), "");
  // Same two parts as the page; older guides without a phase are all setup.
  for (const [phase, title, time] of [["setup", "Set up and test", test.value], ["launch", "Go live", prod.claimIds.length ? "" : prod.value]] as const) {
    const steps = g.steps.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => (s.phase ?? slotPhase(s.slot)) === phase);
    if (!steps.length) continue;
    out.push(`## ${title}${time ? ` (${time})` : ""}`, "");
    steps.forEach((s) => {
      out.push(`${s.n}. **[${WHO[s.who].label}]** ${s.text}${refs(s.claimIds)}${s.why ? `  \n   ${s.why}` : ""}${s.detail ? `  \n   _${s.detail}_` : ""}`);
    });
    out.push("");
  }
  out.push("## Blockers", "", ...g.blockers.map((b) => `- **${b.problem}**: ${b.fix}${refs(b.claimIds)}`), "");
  if (g.couldNotVerify.length) out.push("## Could not verify", "", ...g.couldNotVerify.map((x) => `- ${x}`), "");
  g.claims.forEach((c, i) => {
    out.push(`[^${i + 1}]: **${EVIDENCE[c.status].label}.** ${c.statement}${c.quote ? ` "${c.quote}"` : ""}${c.sourceUrl ? ` ${c.sourceUrl}` : ""}${c.note ? ` (${c.note})` : ""}`);
  });
  return out.join("\n");
}
