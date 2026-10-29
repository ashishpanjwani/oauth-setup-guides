import { slotPhase, type Guide } from "./schema";
import { attemptSummary, cost, difficulty, stepCounts, timeToProduction, timeToTest } from "./stats";
import { DIFFICULTY, WHO } from "./labels";

/**
 * Markdown meant to be pasted into a ticket, PR, doc or chat. Steps are a checklist, and
 * sources are numbered per page with a plain [n], which reads fine even where Markdown
 * doesn't render. Quotes stay on the web page; the export links back to it.
 */
export function guideToMarkdown(g: Guide, url?: string): string {
  const claims = new Map(g.claims.map((c) => [c.id, c]));
  // Pages get numbers in the order the guide first cites them.
  const pages: { url: string; title: string }[] = [];
  const pageNum = (id: string) => {
    const c = claims.get(id);
    if (!c?.sourceUrl || c.status === "uncertain") return null;
    let i = pages.findIndex((p) => p.url === c.sourceUrl);
    if (i < 0) i = pages.push({ url: c.sourceUrl, title: c.sourceTitle || c.sourceUrl }) - 1;
    return i + 1;
  };
  // Same rule as the page: a line with no tested or sourced claim is marked unverified.
  const refs = (ids: string[]) => {
    const backed = ids.some((id) => claims.has(id) && claims.get(id)!.status !== "uncertain");
    const nums = [...new Set(ids.map(pageNum).filter((n): n is number => n !== null))];
    return (nums.length ? ` [${nums.join(", ")}]` : "") + (backed ? "" : " _(unverified)_");
  };
  const sourced = (ids: string[]) => {
    const nums = [...new Set(ids.map(pageNum).filter((n): n is number => n !== null))];
    return nums.length ? ` [${nums.join(", ")}]` : "";
  };

  const diff = difficulty(g);
  const test = timeToTest(g);
  const prod = timeToProduction(g);
  const price = cost(g);
  const out: string[] = [];

  out.push(`# ${g.appName}: OAuth app setup`, "");
  out.push(`> ${g.summary}${refs(g.summaryClaimIds)}`, "");
  if (g.appType) out.push(`_This guide covers: ${g.appType}_`, "");
  out.push(
    `- **Difficulty:** ${DIFFICULTY[diff.level].label} (${diff.reason})`,
    `- **Time to test:** ${test.value}`,
    `- **Time to production:** ${prod.value}${prod.claimIds.length ? sourced(prod.claimIds) : ` (${prod.basis})`}`,
    `- **Cost:** ${price.value}${sourced(price.claimIds)}`,
    `- **Steps:** ${stepCounts(g)}`,
    ...(g.handoff ? [`- **Agent and you:** ${attemptSummary(g) ? `${attemptSummary(g)} ` : ""}${g.handoff}`] : []),
    "",
  );

  const gates = (g.gates ?? []).filter((x) => x.applies === "yes");
  if (gates.length) {
    out.push("## What can stop you from launching", "");
    gates.forEach((x) => {
      out.push(`### ${x.title}${refs(x.claimIds)}`, "");
      if (x.what) out.push(x.what, "");
      if (x.where) out.push(`- **Where:** ${x.where}`);
      if (x.todo) out.push(`- **What to do:** ${x.todo}`);
      out.push("");
    });
  }

  out.push("## Before you start", "", ...g.requirements.map((r) => `- ${r.text}${refs(r.claimIds)}`), "");

  // Same two parts as the page, as a checklist a developer can tick through.
  const parts = [
    ["setup", "Set up and test", test.value],
    ["launch", "Go live", prod.claimIds.length ? "" : prod.value],
  ] as const;
  for (const [phase, title, time] of parts) {
    const steps = g.steps.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => (s.phase ?? slotPhase(s.slot)) === phase);
    if (!steps.length) continue;
    out.push(`## ${title}${time ? ` · ${time.toLowerCase()}` : ""}`, "");
    steps.forEach((s) => {
      // Two trailing spaces are a line break, so why and detail sit under the step, not after it.
      const tried = s.attempt && `${s.attempt.outcome === "done" ? "**Agent did this:**" : "**Agent tried:**"} ${s.attempt.text}${sourced(s.attempt.claimIds)}${s.attempt.output ? ` \`${s.attempt.output}\`` : ""}`;
      const lines = [`- [ ] **${s.n}.** ${s.text} _(${WHO[s.who].label})_${refs(s.claimIds)}`, s.why, s.detail && `_${s.detail}_`, tried].filter(Boolean);
      out.push(lines.join("  \n  "));
    });
    out.push("");
  }

  if (g.blockers.length) {
    out.push("## If something goes wrong", "");
    g.blockers.forEach((b) => out.push(`- **${b.problem}**${refs(b.claimIds)}  \n  ${b.fix}`));
    out.push("");
  }
  if (g.couldNotVerify.length) out.push("## Could not verify", "", ...g.couldNotVerify.map((x) => `- ${x}`), "");

  if (pages.length) out.push("## Sources", "", ...pages.map((p, i) => `${i + 1}. ${p.title}: ${p.url}`), "");
  out.push(`_Checked ${g.checkedAt.slice(0, 10)}.${url ? ` Full evidence, with the exact quote behind every line: ${url}` : ""}_`);
  return out.join("\n");
}
