import data from "@/data/composio-oauth-toolkits.json";

export type Toolkit = { name: string; slug: string; managed: boolean };

export const DIRECTORY = data as { source: string; checkedAt: string; toolkits: Toolkit[] };

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Accepts an app name or a URL ("https://www.shopify.com/partners" -> "shopify"). */
export function normalizeQuery(q: string): string {
  const t = q.trim();
  try {
    const url = new URL(t.includes("://") ? t : `https://${t}`);
    if (t.includes(".") && !t.includes(" ")) {
      const parts = url.hostname.replace(/^www\./, "").split(".");
      return parts.length > 2 ? parts[parts.length - 2] : parts[0];
    }
  } catch {
    // not a URL
  }
  return t;
}

/** Exact or prefix matches in the Composio OAuth directory, MCP variants last. */
export function lookupToolkits(query: string, limit = 5): Toolkit[] {
  const q = slugify(normalizeQuery(query));
  if (!q) return [];
  const score = (t: Toolkit) =>
    (t.slug === q ? 0 : t.slug.startsWith(q) ? 1 : t.slug.includes(q) ? 2 : 9) +
    (t.slug.endsWith("-mcp") ? 0.5 : 0);
  return DIRECTORY.toolkits
    .map((t) => ({ t, s: score(t) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.t);
}
