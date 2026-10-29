import { promises as fs } from "fs";
import path from "path";
import { get, list, put } from "@vercel/blob";
import type { Guide } from "./schema";

// Seed guides ship in the repo under data/guides. Generated guides go to Vercel Blob when a
// token is configured (deployed), otherwise to a local .data/ folder (dev).
const SEED_DIR = path.join(process.cwd(), "data", "guides");
const LOCAL_DIR = path.join(process.cwd(), ".data");

async function seedGuides(): Promise<Guide[]> {
  const files = await fs.readdir(SEED_DIR).catch(() => [] as string[]);
  return Promise.all(files.filter((f) => f.endsWith(".json")).sort().map(async (f) => JSON.parse(await fs.readFile(path.join(SEED_DIR, f), "utf8"))));
}
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Seed guides plus every guide generated so far, newest first. */
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
  return [...(await seedGuides()), ...generated.sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
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
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const seed = await fs.readFile(path.join(SEED_DIR, `${slug}.json`), "utf8").catch(() => null);
  if (seed) return JSON.parse(seed);
  return readJson<Guide>(`guides/${slug}.json`);
}

export async function saveGuide(guide: Guide): Promise<void> {
  await writeJson(`guides/${guide.slug}.json`, guide);
}

/** The events of the run that produced a guide, so the progress page can replay it at no cost. */
export async function saveRecording(slug: string, events: unknown[]): Promise<void> {
  await writeJson(`replays/${slug}.json`, events);
}

export async function getRecording(slug: string): Promise<unknown[] | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const seed = await fs.readFile(path.join(process.cwd(), "data", "replays", `${slug}.json`), "utf8").catch(() => null);
  if (seed) return JSON.parse(seed);
  return readJson<unknown[]>(`replays/${slug}.json`);
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
