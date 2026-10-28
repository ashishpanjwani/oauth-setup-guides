import { generateGuide } from "@/lib/agent/pipeline";
import { saveGuide } from "@/lib/store";
import { ndjsonStream, rateLimited } from "@/lib/server/ndjson";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  const q = query?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return Response.json({ error: "Enter an app name or website" }, { status: 400 });
  if (rateLimited(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return Response.json({ error: "Too many guides generated from this address. Try again in an hour." }, { status: 429 });
  }
  return ndjsonStream(async (emit) => {
    const guide = await generateGuide(q, emit);
    await saveGuide(guide);
    emit({ type: "guide", slug: guide.slug });
  });
}
