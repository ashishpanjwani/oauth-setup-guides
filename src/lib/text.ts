export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Accepts an app name or a URL ("https://www.shopify.com/partners" -> "shopify"). */
export function normalizeQuery(q: string): string {
  const t = q.trim();
  // An email address is not a website, even though it contains a domain.
  if (t.includes(".") && !t.includes(" ") && !t.includes("@")) {
    try {
      const parts = new URL(t.includes("://") ? t : `https://${t}`).hostname
        .replace(/^www\./, "")
        .split(".");
      return parts.length > 2 ? parts[parts.length - 2] : parts[0];
    } catch {
      // not a URL
    }
  }
  return t;
}

/**
 * Cheap checks on what someone typed, shared by the search box and the API so a bad input
 * is caught before any money is spent. Returns a message to show, or null if it looks like an app.
 */
export function queryProblem(raw: string): string | null {
  const q = raw.trim();
  if (!q)
    return "Type an app name or its website, for example Notion or xero.com.";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q))
    return "That looks like an email address. Type the app's name or website instead.";
  if (!/\p{L}/u.test(q))
    return "App names need letters. Try something like Discord or hubspot.com.";
  if (/[<>{}[\]|\\^`$]/.test(q))
    return "Remove the special characters and type just the app's name.";
  const name = normalizeQuery(q);
  if (name.replace(/[^\p{L}\p{N}]/gu, "").length < 2)
    return "That's too short for an app name. Try the full name, for example Asana.";
  if (q.length > 60 || q.split(/\s+/).length > 4)
    return "Type just the app's name, not a sentence. For example: Notion.";
  return null;
}
