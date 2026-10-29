import { getRecording } from "@/lib/store";

/** Stream a recorded run at a watchable pace. Library runs live in data/replays, live runs in the store. */
export async function replayStream(slug: string): Promise<Response | null> {
  const events = await getRecording(slug);
  if (!events?.length) return null;
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for (const e of events) {
        const line = JSON.stringify(e);
        controller.enqueue(encoder.encode(line + "\n"));
        await new Promise((r) => setTimeout(r, line.includes('"phase"') ? 900 : 220));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8" } });
}
