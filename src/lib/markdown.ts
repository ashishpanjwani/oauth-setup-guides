import type { Guide } from "./schema";
import { ACTOR, EVIDENCE, TIER } from "./labels";

/** Plain Markdown so a guide can be pasted into a ticket, PR, or doc. */
export function guideToMarkdown(g: Guide, url?: string): string {
  const claim = new Map(g.claims.map((c) => [c.id, c]));
  const refs = (ids: string[]) =>
    ids.length ? " " + ids.filter((id) => claim.has(id)).map((id) => `[${id}: ${EVIDENCE[claim.get(id)!.status].label}]`).join(" ") : "";
  const lines: string[] = [];
  lines.push(`# ${g.appName}: OAuth app setup & approval guide`, "");
  if (url) lines.push(`Live guide: ${url}`, "");
  lines.push(`**${TIER[g.verdict.tier].label}** · difficulty ${g.verdict.difficulty}/5 · confidence ${g.verdict.confidence}`, "");
  lines.push(`> ${g.verdict.headline}`, "");
  lines.push(
    "| | |",
    "|---|---|",
    `| First connection (dev) | ${g.verdict.timeToFirstConnection} |`,
    `| Production (any user) | ${g.verdict.timeToProduction} |`,
    `| Hands-on effort | ${g.verdict.activeEffort} |`,
    `| Approval wait | ${g.verdict.approvalWait} |`,
    "",
  );
  lines.push(g.summary, "");
  lines.push(`**On Composio:** ${g.composio.managedAuth === "yes" ? "Managed OAuth app available." : g.composio.managedAuth === "no" ? "No managed app; bring your own." : "Managed app status unknown."} ${g.composio.guidance}`, "");
  if (g.prerequisites.length) {
    lines.push("## Before you start", "");
    g.prerequisites.forEach((p) => lines.push(`- **${p.item}**: ${p.why}${refs(p.claimIds)}`));
    lines.push("");
  }
  lines.push("## Steps", "");
  g.stages.forEach((s) => {
    lines.push(`### ${s.title} (${s.duration})`, "", `_${s.goal}_`, "");
    s.steps.forEach((st, i) => {
      lines.push(`${i + 1}. [${ACTOR[st.actor].label}] ${st.text}${refs(st.claimIds)}`);
      if (st.detail) lines.push(`   - ${st.detail}`);
    });
    lines.push("");
  });
  if (g.blockers.length) {
    lines.push("## Likely blockers", "");
    g.blockers.forEach((b) => lines.push(`- **${b.title}** (${b.likelihood}). You'll see: ${b.symptom} → ${b.workaround}${refs(b.claimIds)}`));
    lines.push("");
  }
  if (g.nuances.length) {
    lines.push("## Nuances", "");
    g.nuances.forEach((n) => lines.push(`- ${n.text}${refs(n.claimIds)}`));
    lines.push("");
  }
  lines.push("## What an agent can do vs. you", "", "**Agent:**", ...g.handoff.agentCanDo.map((x) => `- ${x}`), "", "**You:**", ...g.handoff.youMustDo.map((x) => `- ${x}`), "");
  if (g.openQuestions.length) {
    lines.push("## Open questions", "", ...g.openQuestions.map((q) => `- ${q}`), "");
  }
  lines.push("## Evidence", "");
  g.claims.forEach((c) => {
    lines.push(`- **${c.id}** [${EVIDENCE[c.status].label}] ${c.statement}${c.sources.length ? " (" + c.sources.map((s) => s.url).join(", ") + ")" : ""}${c.note ? ` _${c.note}_` : ""}`);
  });
  lines.push("", `_Generated ${g.createdAt.slice(0, 10)}${g.verifiedAt ? `, fact-checked ${g.verifiedAt.slice(0, 10)}` : ", not yet fact-checked"}. Provider policies change; check sources before relying on time estimates._`);
  return lines.join("\n");
}
