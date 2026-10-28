import { promises as fs } from "fs";
import path from "path";
import { get, list, put } from "@vercel/blob";
import type { Guide } from "./schema";
import { LIBRARY } from "@/data/library";

// Library guides ship in the repo. Generated guides go to Vercel Blob when a token
// is configured (deployed), otherwise to a local .data/ folder (dev).
const LOCAL_DIR = path.join(process.cwd(), ".data");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Library guides plus every guide generated so far, newest first. */
export async function allGuides(): Promise<Guide[]> {
  let slugs: string[] = [];
  if (blobEnabled()) {
    const { blobs } = await list({ prefix: "guides/", limit: 200 });
    slugs = blobs.map((b) => b.pathname.replace(/^guides\//, "").replace(/\.json$/, ""));
  } else {
    slugs = await fs
      .readdir(path.join(LOCAL_DIR, "guides"))
      .then((f) => f.filter((x) => x.endsWith(".json")).map((x) => x.replace(/\.json$/, "")))
      .catch(() => []);
  }
  const generated = (await Promise.all(slugs.map((s) => readJson<Guide>(`guides/${s}.json`)))).filter((g): g is Guide => Boolean(g));
  return [...LIBRARY, ...generated.sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
}

async function readJson<T>(key: string): Promise<T | null> {
  if (blobEnabled()) {
    const res = await get(key, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  }
  try {
    return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, key), "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2);
  if (blobEnabled()) {
    await put(key, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

export async function getGuide(slug: string): Promise<Guide | null> {
  const lib = LIBRARY.find((g) => g.slug === slug);
  if (lib) return lib;
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return readJson<Guide>(`guides/${slug}.json`);
}

export async function saveGuide(guide: Guide): Promise<void> {
  await writeJson(`guides/${guide.slug}.json`, guide);
}

/** Running API spend for the public demo, per UTC day. Best-effort: concurrent runs can race. */
type Ledger = { usd: number; runs: number };
const ledgerKey = () => `budget/${new Date().toISOString().slice(0, 10)}.json`;

export async function getDailySpend(): Promise<Ledger> {
  return (await readJson<Ledger>(ledgerKey())) ?? { usd: 0, runs: 0 };
}

export async function addDailySpend(usd: number): Promise<void> {
  const cur = await getDailySpend();
  await writeJson(ledgerKey(), { usd: cur.usd + usd, runs: cur.runs + 1 });
}
