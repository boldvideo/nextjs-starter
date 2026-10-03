import "server-only";

import { getPlayer } from "@/lib/gym-player";
import { getSessionUser } from "@/lib/gym-viewer";
import { pipeline, redisEnabled } from "@/lib/gym-redis";

/**
 * Every AI call costs money, so the server enforces what the arcade only
 * shows: a few free questions per anonymous visitor, then a coin (email) or
 * sign-in, and a ceiling for everyone so one person (or bot) can't run up
 * the bill. Counted in Redis, fixed windows. If Redis is down, let it
 * through: a cost risk for minutes beats a broken game.
 *
 * Call at the top of a route that triggers an AI call; a Response means stop
 * and return it.
 *   401 { code: "NEEDS_COIN" }  anonymous, out of free questions
 *   429 { code: "SLOW_DOWN" }   too many, too fast (or too many today)
 */

// Anonymous: the arcade gives 3 free levels; the server allows a little
// slack per IP (shared offices, refreshes, a roast) before asking for a coin.
const ANON_PER_DAY = 6;
// A known player (coin or signed in): generous, but a ceiling.
const PLAYER_PER_HOUR = 40;
const PLAYER_PER_DAY = 150;
// Anyone, per IP: no machine-gunning.
const IP_PER_MINUTE = 10;

export type AiAction = "ask" | "chat" | "roast" | "objections";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function deny(status: 401 | 429, code: "NEEDS_COIN" | "SLOW_DOWN", message: string): Response {
  return Response.json({ code, message, error: message, content: message }, { status });
}

/**
 * A plain per-IP limit for non-AI writes that still cost something (a coin
 * creates a Bold viewer and a HubSpot lead). True when over the limit.
 */
export async function ipLimited(request: Request, bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  if (!redisEnabled()) return false;
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `gtm-game:${bucket}:${clientIp(request)}:${window}`;
  try {
    const [count] = await pipeline([["INCR", key], ["EXPIRE", key, windowSeconds * 2]]);
    return Number(count) > max;
  } catch {
    return false;
  }
}

export async function aiGuard(request: Request, action: AiAction): Promise<Response | null> {
  if (!redisEnabled()) return null;

  const ip = clientIp(request);
  const user = await getSessionUser().catch(() => null);
  const email = user?.email?.toLowerCase() ?? (await getPlayer().catch(() => null))?.email ?? null;

  const now = new Date();
  const minute = Math.floor(now.getTime() / 60000);
  const hour = Math.floor(now.getTime() / 3600000);
  const day = now.toISOString().slice(0, 10);
  const base = "gtm-game:ai";

  const commands: (string | number)[][] = [
    ["INCR", `${base}:ip:${ip}:m:${minute}`],
    ["EXPIRE", `${base}:ip:${ip}:m:${minute}`, 120],
  ];
  if (email) {
    commands.push(
      ["INCR", `${base}:who:${email}:h:${hour}`],
      ["EXPIRE", `${base}:who:${email}:h:${hour}`, 7200],
      ["INCR", `${base}:who:${email}:d:${day}`],
      ["EXPIRE", `${base}:who:${email}:d:${day}`, 172800]
    );
  } else {
    commands.push(["INCR", `${base}:anon:${ip}:d:${day}`], ["EXPIRE", `${base}:anon:${ip}:d:${day}`, 172800]);
  }

  try {
    const counts = (await pipeline(commands)).filter((_, i) => i % 2 === 0).map(Number);
    const [perMinute, a, b] = counts;
    if (perMinute > IP_PER_MINUTE) {
      return deny(429, "SLOW_DOWN", "Easy, tiger. Give it a minute and try again.");
    }
    if (!email && a > ANON_PER_DAY) {
      console.info("[gym] guard: anonymous out of free questions", { action, ip });
      return deny(401, "NEEDS_COIN", "Insert a coin to keep playing.");
    }
    if (email && (a > PLAYER_PER_HOUR || b > PLAYER_PER_DAY)) {
      console.warn("[gym] guard: player over the limit", { action, email, hour: a, day: b });
      return deny(429, "SLOW_DOWN", "You've played a lot today. The arcade needs a breather; come back in a bit.");
    }
  } catch (error) {
    console.error("[gym] guard: Redis failed, letting the call through", error);
  }
  return null;
}
