import type { NextRequest } from "next/server";
import { leaderboardEnabled, rateLimited, submitScore, topScores } from "@/lib/gym-dodger";

// The daily run's global top 10.
export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const INITIALS_RE = /^[A-Z0-9]{3}$/;
// Three letters is enough to be rude
const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "CUM", "DIK", "DIC", "COK", "TIT", "FAG", "NIG", "KKK", "SEX", "JEW", "NAZ", "GAY", "XXX", "WTF", "SHT", "CNT"]);

/** Today or yesterday (UTC), so a run that started before midnight still counts. */
function liveDay(day: string): boolean {
  const now = Date.now();
  const days = [0, 1].map((d) => new Date(now - d * 86400000).toISOString().slice(0, 10));
  return days.includes(day);
}

export async function GET(request: NextRequest) {
  const day = request.nextUrl.searchParams.get("day") ?? "";
  if (!DAY_RE.test(day)) return Response.json({ error: "Bad day" }, { status: 400 });
  if (!leaderboardEnabled()) return Response.json({ enabled: false, scores: [] });
  try {
    return Response.json({ enabled: true, scores: await topScores(day) });
  } catch (error) {
    console.error("[dodger] leaderboard read failed", error);
    return Response.json({ enabled: false, scores: [] });
  }
}

export async function POST(request: NextRequest) {
  if (!leaderboardEnabled()) return Response.json({ enabled: false });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const day = typeof body.day === "string" ? body.day : "";
  const initials = typeof body.initials === "string" ? body.initials.toUpperCase() : "";
  const score = Math.floor(Number(body.score));
  const time = Number(body.time);
  if (!DAY_RE.test(day) || !liveDay(day)) return Response.json({ error: "That day is over." }, { status: 400 });
  if (!INITIALS_RE.test(initials)) return Response.json({ error: "Three letters or digits." }, { status: 400 });
  // A sanity ceiling: nobody banks more than this per second survived
  if (!Number.isFinite(score) || score <= 0 || !Number.isFinite(time) || time <= 0 || time > 3600 || score > time * 3000 + 20000) {
    return Response.json({ error: "That score doesn't add up." }, { status: 400 });
  }
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  try {
    if (await rateLimited(client)) return Response.json({ error: "Easy, tiger. Try again in a minute." }, { status: 429 });
    const rank = await submitScore(day, BLOCKED.has(initials) ? "???" : initials, score);
    return Response.json({ enabled: true, rank, scores: await topScores(day) });
  } catch (error) {
    console.error("[dodger] leaderboard write failed", error);
    return Response.json({ error: "The scoreboard jammed." }, { status: 500 });
  }
}
