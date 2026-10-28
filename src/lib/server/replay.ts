import { promises as fs } from "fs";
import path from "path";

/** Stream a recorded run (src/data/replay/<slug>.ndjson) at a watchable pace. */
export async function replayStream(slug: string): Promise<Response | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  let lines: string[];
  try {
    lines = (await fs.readFile(path.join(process.cwd(), "src/data/replay", `${slug}.ndjson`), "utf8")).split("\n").filter(Boolean);
  } catch {
    return null;
  }
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + "\n"));
        await new Promise((r) => setTimeout(r, line.includes('"phase"') ? 900 : 220));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8" } });
}
