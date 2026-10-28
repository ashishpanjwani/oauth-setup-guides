import type { GuideDraft } from "@/lib/schema";

/**
 * Mechanical checks on the reader-facing text. Each rule here came from a real
 * problem found while reviewing a generated guide.
 */
const RULES: { name: string; pattern: RegExp; why: string }[] = [
  { name: "internal-term", pattern: /\b(gates?|dossier|probes?|claim ?ids?)\b/i, why: "internal pipeline term a developer wouldn't know" },
  { name: "first-person", pattern: /\b(I|I'm|I've|we|we're|our|us)\b/, why: "guides are written to the developer, never as 'I' or 'we'" },
  {
    name: "timing-commentary",
    pattern: /\b(does not|doesn't|do not|don't|did not)\s+(time|state|publish|give|say|specify|control|set|document|list|mention|provide)\b|not (timed|controlled|stated) by|no (published |official )?timing|response time|takes to (approve|respond|review)/i,
    why: "commentary on what the docs don't say or how long someone else takes; delete unless it is about a review the provider itself runs",
  },
  { name: "hedge", pattern: /\b(was not read|were not read|not used for any claim|I did not|not checked|was tested|were tested|not researched)\b/i, why: "notes about the research process, not the developer's task" },
  { name: "non-action", pattern: /^(launch|go live|release)\b/i, why: "a step must be a concrete action the provider has; there is no generic 'launch'" },
];

export type Violation = { field: string; text: string; rule: string; why: string };

/** Every reader-facing string with its location, so the editor knows exactly what to fix. */
function fields(g: GuideDraft): [string, string][] {
  const out: [string, string][] = [
    ["summary", g.summary],
    ["timeToTest", g.timeToTest],
    ["timeToProduction", g.timeToProduction],
    ["effort", g.effort],
    ["cost", g.cost],
  ];
  g.gates.forEach((x, i) => ["title", "what", "where", "todo"].forEach((k) => out.push([`gates[${i}].${k}`, x[k as "title"]])));
  g.requirements.forEach((r, i) => out.push([`requirements[${i}]`, r.text]));
  g.steps.forEach((s, i) => {
    out.push([`steps[${i}].text`, s.text]);
    out.push([`steps[${i}].why`, s.why ?? ""]);
    out.push([`steps[${i}].detail`, s.detail]);
  });
  g.blockers.forEach((b, i) => {
    out.push([`blockers[${i}].problem`, b.problem]);
    out.push([`blockers[${i}].fix`, b.fix]);
  });
  g.couldNotVerify.forEach((x, i) => out.push([`couldNotVerify[${i}]`, x]));
  return out;
}

export function lintGuide(g: GuideDraft): Violation[] {
  const v: Violation[] = [];
  for (const [field, text] of fields(g)) {
    for (const r of RULES) if (text && r.pattern.test(text)) v.push({ field, text, rule: r.name, why: r.why });
  }
  if (g.couldNotVerify.length > 4) v.push({ field: "couldNotVerify", text: `${g.couldNotVerify.length} items`, rule: "too-many", why: "keep at most 4 open questions" });
  return v;
}
