import type Anthropic from "@anthropic-ai/sdk";

/**
 * Cost controls. One model for every phase; change it here.
 * Haiku 5.5 is ~40x cheaper than Opus 5.5 per token, which is the difference between
 * ~$0.70 and a few cents per guide.
 */
export const MODEL = "claude-haiku-5-5";

// USD per million tokens. Haiku 5.5 bills a whole request at the higher card when its
// prompt exceeds 100K tokens, so research is sized to stay under that.
const PRICES: Record<string, { in: number; out: number; longIn?: number; longOut?: number }> = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5, longIn: 0.5, longOut: 2.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-opus-5-5": { in: 4, out: 20 },
};
const LONG_PROMPT_TOKENS = 100_000;
const WEB_SEARCH_USD = 0.01; // $10 per 1,000 searches; fetches cost only the tokens they add

/** Hard ceiling per guide run (research + compose, or verify). The loop aborts past it. */
export const RUN_CAP_USD = Number(process.env.RUN_CAP_USD ?? 0.3);
/** Ceiling on what the public demo can spend per UTC day across all visitors. */
export const DAILY_CAP_USD = Number(process.env.DAILY_CAP_USD ?? 2);

export type Usage = { input: number; cacheRead: number; cacheWrite: number; output: number; searches: number; usd: number };

export const emptyUsage = (): Usage => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0, searches: 0, usd: 0 });

/** Price one request from its usage block and add it to the running total. */
export function addTurn(total: Usage, model: string, u: Anthropic.Beta.Messages.BetaUsage): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  const read = u.cache_read_input_tokens ?? 0;
  const write = u.cache_creation_input_tokens ?? 0;
  const long = p.longIn !== undefined && u.input_tokens + read + write > LONG_PROMPT_TOKENS;
  const rin = long ? p.longIn! : p.in;
  const rout = long ? p.longOut! : p.out;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  const usd = (u.input_tokens * rin + write * rin * 1.25 + read * rin * 0.1 + u.output_tokens * rout) / 1e6 + searches * WEB_SEARCH_USD;
  total.input += u.input_tokens;
  total.cacheRead += read;
  total.cacheWrite += write;
  total.output += u.output_tokens;
  total.searches += searches;
  total.usd += usd;
  return usd;
}

export class BudgetError extends Error {}
