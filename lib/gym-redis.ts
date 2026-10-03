import "server-only";

/**
 * The game's Redis (Upstash, over REST): the Objection Dodger leaderboard
 * and the AI rate limits. Env from the Vercel integration (KV_REST_API_*).
 */

function redis(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function redisEnabled(): boolean {
  return redis() !== null;
}

export async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const r = redis();
  if (!r) throw new Error("Redis not connected");
  const res = await fetch(`${r.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${r.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Redis: ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((o) => {
    if (o.error) throw new Error(o.error);
    return o.result;
  });
}
