/** Plain HTTP done in code: fetching source pages and probing the developer console. */

export type Page = { url: string; title: string; text: string; ok: boolean; error?: string };
export type Probe = { name: string; target: string; ok: boolean; result: string };

const PAGE_CHARS = 30_000; // ~7.5K tokens per page

function assertPublicHttps(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only https URLs");
  const h = url.hostname;
  // Keep a public endpoint from being used to reach internal hosts.
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) {
    throw new Error("Only public hostnames");
  }
  return url;
}

async function get(url: string) {
  return fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    // Without a language header some providers (Google) serve a localized page.
    headers: { "user-agent": "Mozilla/5.0 (compatible; oauth-guide-bot/1.0)", accept: "text/html,*/*", "accept-language": "en-US,en;q=0.9" },
  });
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export async function fetchPage(url: string, title = ""): Promise<Page> {
  try {
    const res = await get(assertPublicHttps(url).toString());
    const html = await res.text();
    const text = htmlToText(html).slice(0, PAGE_CHARS);
    const t = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    // Pages rendered by JavaScript come back nearly empty; treat them as unreadable.
    if (!res.ok || text.length < 400) {
      return { url, title: t || title, text, ok: false, error: res.ok ? "page has almost no text (likely rendered by JavaScript)" : `HTTP ${res.status}` };
    }
    return { url, title: t || title, text, ok: true };
  } catch (e) {
    return { url, title, text: "", ok: false, error: (e as Error).message };
  }
}

/** Does the developer console respond, or send you to a login page? */
export async function probeConsole(url: string): Promise<Probe> {
  try {
    const res = await get(assertPublicHttps(url).toString());
    const final = res.url;
    const text = htmlToText(await res.text()).slice(0, 200);
    const login = /log ?in|sign ?in|signin|auth/i.test(new URL(final).pathname + new URL(final).hostname) || /^(log ?in|sign ?in)/i.test(text);
    return {
      name: "console",
      target: url,
      ok: res.ok,
      result: `HTTP ${res.status}${final !== url ? `, redirected to ${final}` : ""}${login ? " (login required)" : ""}`,
    };
  } catch (e) {
    return { name: "console", target: url, ok: false, result: `Request failed: ${(e as Error).message}` };
  }
}

/** Loose match so a quote survives whitespace, curly quotes, dashes and case differences. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9'"%$.\-]+/g, " ")
    .trim();
}

export function quoteOnPage(quote: string, page: string): boolean {
  const q = norm(quote);
  return q.length >= 12 && norm(page).includes(q);
}
