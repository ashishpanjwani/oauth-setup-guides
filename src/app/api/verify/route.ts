import { verifyGuide } from "@/lib/agent/pipeline";
import { getGuide, saveGuide } from "@/lib/store";
import { ndjsonStream } from "@/lib/server/ndjson";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  const guide = slug ? await getGuide(slug) : null;
  if (!guide) return Response.json({ error: "Guide not found" }, { status: 404 });
  if (guide.origin === "library") return Response.json({ error: "Library guides are verified at build time" }, { status: 400 });
  if (guide.verifiedAt) return Response.json({ error: "Already verified" }, { status: 409 });
  return ndjsonStream(async (emit) => {
    const verified = await verifyGuide(guide, emit);
    await saveGuide(verified);
    emit({ type: "phase", phase: "done", message: "Verification complete" });
  });
}
