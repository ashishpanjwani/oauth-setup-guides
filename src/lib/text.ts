export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Accepts an app name or a URL ("https://www.shopify.com/partners" -> "shopify"). */
export function normalizeQuery(q: string): string {
  const t = q.trim();
  if (t.includes(".") && !t.includes(" ")) {
    try {
      const parts = new URL(t.includes("://") ? t : `https://${t}`).hostname.replace(/^www\./, "").split(".");
      return parts.length > 2 ? parts[parts.length - 2] : parts[0];
    } catch {
      // not a URL
    }
  }
  return t;
}
