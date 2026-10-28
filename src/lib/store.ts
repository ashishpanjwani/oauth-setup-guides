import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import type { Guide } from "./schema";
import { LIBRARY } from "@/data/library";

// Library guides ship in the repo. Generated guides go to Vercel Blob when a token
// is configured (deployed), otherwise to a local .data/ folder (dev).
const LOCAL_DIR = path.join(process.cwd(), ".data", "guides");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function libraryGuides(): Guide[] {
  return LIBRARY;
}

export async function getGuide(slug: string): Promise<Guide | null> {
  const lib = LIBRARY.find((g) => g.slug === slug);
  if (lib) return lib;
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (blobEnabled()) {
    const res = await get(`guides/${slug}.json`, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  }
  try {
    return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, `${slug}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function saveGuide(guide: Guide): Promise<void> {
  const body = JSON.stringify(guide, null, 2);
  if (blobEnabled()) {
    await put(`guides/${guide.slug}.json`, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, `${guide.slug}.json`), body);
}
