import type { AgentEvent } from "@/lib/agent/pipeline";

// Best-effort per-instance throttle so a public demo link can't burn the API budget.
// The real cap is the spend limit on the Anthropic key.
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 6, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

/** Stream agent events to the browser as newline-delimited JSON. */
export function ndjsonStream(run: (emit: (e: AgentEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await run(emit);
      } catch (e) {
        emit({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
