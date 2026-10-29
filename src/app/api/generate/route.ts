import { generateGuide, RejectedError, type AgentEvent } from "@/lib/agent/pipeline";
import { getGuide, saveGuide, saveRecording } from "@/lib/store";
import { normalizeQuery, queryProblem, slugify } from "@/lib/text";
import { ndjsonStream, rateLimited } from "@/lib/server/ndjson";
import { overDailyBudget, trackCost } from "@/lib/server/budget";
import { replayStream } from "@/lib/server/replay";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { query, replay } = (await req.json().catch(() => ({}))) as { query?: string; replay?: string };
  // Replays a recorded run: exercises the live UI with zero API cost.
  if (replay) return (await replayStream(replay)) ?? Response.json({ error: "No recording for that guide" }, { status: 404 });
  const q = query?.trim() ?? "";
  // An app already in the library opens at no cost, even a short name like "X".
  const existing = q ? await getGuide(slugify(normalizeQuery(q))) : null;
  if (existing) return ndjsonStream(async (emit) => emit({ type: "guide", slug: existing.slug }));
  // Same checks as the search box, so a direct request can't skip them.
  const problem = queryProblem(q);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  if (rateLimited(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return Response.json({ error: "Too many guides generated from this address. Try again in an hour." }, { status: 429 });
  }
  if (await overDailyBudget()) {
    return Response.json({ error: "Today's live-generation budget for this demo is used up. Library guides still work; try again tomorrow." }, { status: 429 });
  }
  return ndjsonStream(async (emit) => {
    const cost = trackCost(emit);
    const recording: AgentEvent[] = [];
    const record = (e: AgentEvent) => {
      if (e.type !== "cost") recording.push(e);
      cost.emit(e);
    };
    try {
      const guide = await generateGuide(q, record);
      await saveGuide(guide);
      emit({ type: "guide", slug: guide.slug });
      await saveRecording(guide.slug, [...recording, { type: "guide", slug: guide.slug }]).catch(() => {});
    } catch (e) {
      // A rejected input was already explained to the reader; anything else is a real error.
      if (!(e instanceof RejectedError)) throw e;
    } finally {
      await cost.settle();
    }
  });
}
