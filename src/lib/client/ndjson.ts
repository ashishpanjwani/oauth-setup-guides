import type { AgentEvent } from "@/lib/agent/pipeline";

/** A non-2xx reply, with its status so callers can tell a rejected input (400) from a failure. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** POST and yield each NDJSON event as it arrives. Throws a RequestError on non-2xx with the server's message. */
export async function* streamEvents(url: string, body: unknown): AsyncGenerator<AgentEvent> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new RequestError(err.error, res.status);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as AgentEvent;
  }
}
