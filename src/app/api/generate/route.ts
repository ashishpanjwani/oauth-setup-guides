import { generateGuide } from "@/lib/agent/pipeline";
import { saveGuide } from "@/lib/store";
import { ndjsonStream, rateLimited } from "@/lib/server/ndjson";
import { overDailyBudget, trackCost } from "@/lib/server/budget";
import { replayStream } from "@/lib/server/replay";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { query, replay } = (await req.json().catch(() => ({}))) as { query?: string; replay?: string };
  // Replays a recorded library run: exercises the live UI with zero API cost.
  if (replay) return (await replayStream(replay)) ?? Response.json({ error: "No recording for that guide" }, { status: 404 });
  const q = query?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return Response.json({ error: "Enter an app name or website" }, { status: 400 });
  if (rateLimited(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return Response.json({ error: "Too many guides generated from this address. Try again in an hour." }, { status: 429 });
  }
  if (await overDailyBudget()) {
    return Response.json({ error: "Today's live-generation budget for this demo is used up. Library guides still work; try again tomorrow." }, { status: 429 });
  }
  return ndjsonStream(async (emit) => {
    const cost = trackCost(emit);
    try {
      const guide = await generateGuide(q, cost.emit);
      await saveGuide(guide);
      emit({ type: "guide", slug: guide.slug });
    } finally {
      await cost.settle();
    }
  });
}
