import { DIRECTORY, lookupToolkits } from "@/lib/directory";

/**
 * Client-side tools the research agent can call. These are the "attempt the setup"
 * part: without provider accounts we can't register an app, but we can observe how
 * the provider's OAuth endpoints actually behave and record that as tested evidence.
 */

// Composio's callback, used so the probe looks like a real Composio-bound request.
const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3.1/toolkits/auth/callback";
const PROBE_CLIENT_ID = "oauth-guide-probe-invalid-client";

export type ProbeResult = { name: string; target: string; ok: boolean; result: string };

function assertPublicHttps(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only https URLs can be probed");
  const h = url.hostname;
  // Keep the public endpoint from being used to reach internal hosts.
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
    h.includes(":")
  ) {
    throw new Error("Only public hostnames can be probed");
  }
  return url;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10000) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms), headers: { "user-agent": "oauth-guide-probe/1.0", ...init.headers } });
}

function snippet(body: string, n = 600): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

/** GET the OpenID / OAuth discovery document for an issuer. */
async function probeDiscovery(issuer: string): Promise<ProbeResult> {
  const base = assertPublicHttps(issuer);
  const candidates = [
    new URL("/.well-known/openid-configuration", base).toString(),
    new URL("/.well-known/oauth-authorization-server", base).toString(),
  ];
  for (const target of candidates) {
    try {
      const res = await fetchWithTimeout(target);
      if (!res.ok) continue;
      const doc = await res.json();
      const keys = ["authorization_endpoint", "token_endpoint", "scopes_supported", "code_challenge_methods_supported", "registration_endpoint"];
      const picked = Object.fromEntries(keys.filter((k) => k in doc).map((k) => [k, Array.isArray(doc[k]) ? doc[k].slice(0, 25) : doc[k]]));
      return { name: "discovery", target, ok: true, result: JSON.stringify(picked) };
    } catch {
      // try next
    }
  }
  return { name: "discovery", target: candidates[0], ok: false, result: "No OpenID/OAuth discovery document found (common for non-OIDC providers; not a problem by itself)." };
}

/**
 * Hit the authorize endpoint with a deliberately invalid client_id and Composio's
 * callback. How the provider rejects it tells us the endpoint is live and how it
 * validates clients and redirect URIs.
 */
async function probeAuthorize(authorizeUrl: string, scope?: string): Promise<ProbeResult> {
  const url = assertPublicHttps(authorizeUrl);
  url.searchParams.set("client_id", PROBE_CLIENT_ID);
  url.searchParams.set("redirect_uri", COMPOSIO_CALLBACK);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", "probe");
  if (scope) url.searchParams.set("scope", scope);
  const target = url.toString();
  try {
    const res = await fetchWithTimeout(target, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    const body = res.status >= 300 && res.status < 400 ? "" : snippet(await res.text());
    return {
      name: "authorize_endpoint",
      target,
      ok: res.status < 500,
      result: `HTTP ${res.status}${location ? ` -> redirect to ${location.slice(0, 300)}` : ""}${body ? ` | page text: ${body}` : ""}`,
    };
  } catch (e) {
    return { name: "authorize_endpoint", target, ok: false, result: `Request failed: ${(e as Error).message}` };
  }
}

/** Is a developer-portal page publicly reachable, or behind a login wall? */
async function probePage(pageUrl: string): Promise<ProbeResult> {
  const url = assertPublicHttps(pageUrl);
  try {
    const res = await fetchWithTimeout(url.toString(), { redirect: "follow" });
    const finalUrl = res.url;
    const text = snippet(await res.text(), 300);
    const loginWall = /log ?in|sign ?in/i.test(new URL(finalUrl).pathname + " " + text.slice(0, 120));
    return {
      name: "page",
      target: url.toString(),
      ok: res.ok,
      result: `HTTP ${res.status}, final URL ${finalUrl}${loginWall ? " (looks like a login wall)" : ""} | ${text}`,
    };
  } catch (e) {
    return { name: "page", target: url.toString(), ok: false, result: `Request failed: ${(e as Error).message}` };
  }
}

export const CLIENT_TOOLS = [
  {
    name: "probe_oauth",
    description:
      "Make a live, read-only HTTP observation of a provider. kind=discovery fetches the OpenID/OAuth discovery document for an issuer base URL. " +
      "kind=authorize calls the provider's OAuth authorize URL with a deliberately invalid client_id and Composio's redirect URI and reports how the provider responds " +
      "(confirms the endpoint is live and how it rejects unknown clients). kind=page checks whether a developer-portal URL is public or behind a login. " +
      "Results are recorded as 'tested' evidence, so use this to confirm endpoints rather than relying on docs alone.",
    input_schema: {
      type: "object" as const,
      properties: {
        kind: { type: "string", enum: ["discovery", "authorize", "page"] },
        url: { type: "string", description: "https URL: issuer base, authorize endpoint, or portal page" },
        scope: { type: "string", description: "Optional scope string to include for kind=authorize" },
      },
      required: ["kind", "url"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "lookup_composio_toolkit",
    description:
      "Look up an app in Composio's OAuth toolkit directory (snapshot of docs.composio.dev/toolkits/managed-auth). " +
      "Returns matching toolkits and whether Composio provides a managed OAuth app (managed=true) or the developer must bring their own (managed=false).",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
];

export async function runClientTool(name: string, input: Record<string, string>): Promise<{ text: string; probe?: ProbeResult }> {
  if (name === "lookup_composio_toolkit") {
    const matches = lookupToolkits(input.query);
    return { text: matches.length ? JSON.stringify({ source: DIRECTORY.source, checkedAt: DIRECTORY.checkedAt, matches }) : "No match in Composio's OAuth directory (the app may be unsupported or listed under another name)." };
  }
  if (name === "probe_oauth") {
    const probe =
      input.kind === "discovery" ? await probeDiscovery(input.url) : input.kind === "authorize" ? await probeAuthorize(input.url, input.scope) : await probePage(input.url);
    return { text: JSON.stringify(probe), probe };
  }
  throw new Error(`Unknown tool ${name}`);
}
