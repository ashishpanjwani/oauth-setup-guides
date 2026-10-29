import { slotPhase, type Guide, type Stat } from "./schema";
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
  // Same rule as the page: a time, effort or cost value without a confirmed claim is an estimate.
  const stat = (k: Stat) => {
    const ids = (g.statClaimIds?.[k] ?? []).filter((id) => num.has(id));
    return ids.some((id) => status.get(id) !== "uncertain") ? `${g[k]}${ids.map((id) => `[^${num.get(id)}]`).join("")}` : `${g[k]} _(estimate)_`;
  };
  const out: string[] = [];

  out.push(`# ${g.appName}: OAuth app setup guide`, "");
  out.push(`_${g.reviewed ? "Reviewed by a person" : "Generated, not reviewed"} · checked ${g.checkedAt.slice(0, 10)}${url ? ` · ${url}` : ""}_`, "");
  out.push(`${g.summary}${refs(g.summaryClaimIds)}`, "");
  if (g.appType) out.push(`_This guide covers: ${g.appType}_`, "");
  out.push(
    "| Difficulty | Time to test | Time to production | Effort | Cost |",
    "|---|---|---|---|---|",
    `| ${DIFFICULTY[g.difficulty].label} | ${stat("timeToTest")} | ${stat("timeToProduction")} | ${stat("effort")} | ${stat("cost")} |`,
    "",
  );
  if (g.handoff) {
    const agent = g.steps.filter((s) => s.who === "agent").length;
    out.push(`**Agent and you:** an agent can do ${agent} of ${g.steps.length} steps. ${g.handoff}`, "");
  }
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
  for (const [phase, title, time] of [["setup", "Set up and test", g.timeToTest], ["launch", "Go live", g.timeToProduction]] as const) {
    const steps = g.steps.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => (s.phase ?? slotPhase(s.slot)) === phase);
    if (!steps.length) continue;
    out.push(`## ${title} (${time})`, "");
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
