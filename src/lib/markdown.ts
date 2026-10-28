import type { Guide } from "./schema";
import { DIFFICULTY, EVIDENCE, WHO } from "./labels";

/** Plain Markdown so a guide can be pasted into a ticket, PR, or doc. Claims become footnotes. */
export function guideToMarkdown(g: Guide, url?: string): string {
  const num = new Map(g.claims.map((c, i) => [c.id, i + 1]));
  const refs = (ids: string[]) => ids.filter((id) => num.has(id)).map((id) => `[^${num.get(id)}]`).join("");
  const out: string[] = [];

  out.push(`# ${g.appName}: OAuth app setup guide`, "");
  out.push(`_${g.reviewed ? "Reviewed by a person" : "Generated, not reviewed"} · checked ${g.checkedAt.slice(0, 10)}${url ? ` · ${url}` : ""}_`, "");
  out.push(`${g.summary}${refs(g.summaryClaimIds)}`, "");
  out.push(
    "| Difficulty | Time to test | Time to production | Effort | Cost |",
    "|---|---|---|---|---|",
    `| ${DIFFICULTY[g.difficulty].label} | ${g.timeToTest} | ${g.timeToProduction} | ${g.effort} | ${g.cost} |`,
    "",
  );
  out.push("## Requirements", "", ...g.requirements.map((r) => `- ${r.text}${refs(r.claimIds)}`), "");
  out.push("## Steps", "");
  g.steps.forEach((s, i) => {
    out.push(`${i + 1}. **[${WHO[s.who].label}]** ${s.text}${refs(s.claimIds)}${s.detail ? `  \n   ${s.detail}` : ""}`);
  });
  out.push("", "## Blockers", "", ...g.blockers.map((b) => `- **${b.problem}**: ${b.fix}${refs(b.claimIds)}`), "");
  if (g.couldNotVerify.length) out.push("## Could not verify", "", ...g.couldNotVerify.map((x) => `- ${x}`), "");
  g.claims.forEach((c, i) => {
    const links = c.sources.map((s) => s.url).join(", ");
    out.push(`[^${i + 1}]: **${EVIDENCE[c.status].label}.** ${c.statement}${links ? ` ${links}` : ""}${c.note ? ` (${c.note})` : ""}`);
  });
  return out.join("\n");
}
