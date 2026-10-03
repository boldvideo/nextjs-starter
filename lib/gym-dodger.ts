import "server-only";

import type { AIEvent, Segment } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { resolveClip } from "@/lib/gym-clip";
import { portalClient } from "@/lib/portal-client";
import { coachForVideo } from "@/components/gym/gym-coaches-data";
import { cleanCounter, type Clip, type Objection } from "@/components/gym/dodger/objections";
import { pipeline, redisEnabled } from "@/lib/gym-redis";

/**
 * Objection Dodger's server side:
 *   scout()       the player's own objections, from the coach, each with
 *                 its counter, the coach's move and the cited clip
 *   findClip()    the best coach moment for a line, from library search
 *   leaderboard   the daily run's global top 10 (Upstash Redis over REST,
 *                 off when the store isn't connected)
 */

// ── Coaches by video ───────────────────────────────────────────────────────

let coachMap: { at: number; map: Map<string, string> } | null = null;

async function coachNames(): Promise<Map<string, string>> {
  if (coachMap && Date.now() - coachMap.at < 3600_000) return coachMap.map;
  const map = new Map<string, string>();
  try {
    const context = await getTenantContext();
    const res = await context?.client.videos.list({ page: 1 });
    for (const v of res?.data ?? []) {
      const coach = coachForVideo(v);
      if (!coach) continue;
      const video = v as typeof v & { internalId?: string; playbackId?: string };
      for (const id of [v.id, video.internalId, video.playbackId]) if (id) map.set(id, coach.name);
    }
  } catch (error) {
    console.error("[dodger] coach map failed", error);
  }
  coachMap = { at: Date.now(), map };
  return map;
}

async function toClip(s: Segment, coaches: Map<string, string>): Promise<Clip | null> {
  if (!s.playbackId) return null;
  const coach = coaches.get(s.videoId) ?? coaches.get(s.playbackId) ?? null;
  // The whole thought around the cited sentence (lib/gym-clip.ts), played as
  // an instant clip; a rough window if the transcript isn't available
  const clip = s.videoId ? await resolveClip(s.videoId, s.timestamp, s.timestampEnd) : null;
  if (clip) return { playbackId: clip.playbackId, start: clip.start, end: clip.end, title: s.title, coach };
  const start = Math.max(0, Math.floor(s.timestamp) - 4);
  return { playbackId: s.playbackId, start, end: Math.max(start + 30, Math.ceil(s.timestampEnd)), title: s.title, coach };
}

// ── Scouting ───────────────────────────────────────────────────────────────

const LINE_RE = /^\s*(?:[-*•]|\d+[.)])?\s*([^|]{3,40})\|\s*([A-Za-z' -]{2,14})\s*\|\s*(.+)$/;
const REF_RE = /\[(\d+|c_[^\]]+)\]/g;

export interface Scouted {
  label: string | null;
  objections: Objection[];
}

export async function scout(input: { business?: string; stage?: string; viewer?: string | null; label?: string | null }): Promise<Scouted | null> {
  const context = await getTenantContext();
  if (!context) return null;

  const about = input.business
    ? `The player's business, in their words: "${input.business.replace(/"/g, "'")}".`
    : "Use what you know about this player and their business.";
  const prompt = [
    "ARCADE MODE. Reply in the exact format below and nothing else: no intro, no outro, no headings.",
    about,
    input.stage ? `Their stage: ${input.stage}.` : "",
    "List the 10 objections their buyers actually throw at them, sharpest first, one per line:",
    "OBJECTION | COUNTER | MOVE",
    "OBJECTION: what the buyer says, in the buyer's voice, ALL CAPS, at most 18 characters.",
    "COUNTER: one word that beats it, ALL CAPS, 3 to 8 letters, A-Z only, each starting with a different letter.",
    "MOVE: one sentence, at most 16 words: how the coaches say to handle it, with a citation.",
  ]
    .filter(Boolean)
    .join("\n");

  // Streamed and collected here: the gateway cuts non-streamed answers at 30s
  const stream = await context.client.ai.chat({
    ...portalClient,
    prompt,
    stream: true,
    ...(input.viewer ? { viewer: input.viewer } : {}),
    ...(input.stage ? { viewerProfile: { stage: input.stage } } : {}),
  } as Parameters<typeof context.client.ai.chat>[0] & { stream: true });
  let content = "";
  let sources: Segment[] = [];
  for await (const event of stream as AsyncIterable<AIEvent>) {
    if (event.type === "text_delta") content += event.delta;
    else if (event.type === "sources") sources = event.sources;
    else if (event.type === "message_complete") {
      content = event.content || content;
      if (event.citations?.length) sources = event.citations;
    } else if (event.type === "error") throw new Error(event.message);
  }

  const coaches = await coachNames();
  const objections: Objection[] = [];
  const seen = new Set<string>();
  const citedFor: (Segment | null)[] = [];
  for (const line of content.split("\n")) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const text = m[1].trim().toUpperCase().replace(/\s+/g, " ").slice(0, 22);
    const counter = cleanCounter(m[2]);
    // Skip the format line when the model echoes it back
    if (text.length < 3 || counter.length < 2 || seen.has(text) || (text === "OBJECTION" && counter === "COUNTER")) continue;
    seen.add(text);
    const refs = Array.from(m[3].matchAll(REF_RE)).map((r) => r[1]);
    const cited = refs
      .map((ref) => (ref.startsWith("c_") ? sources.find((s) => s.id === ref) : sources[parseInt(ref, 10) - 1]))
      .find(Boolean);
    objections.push({
      text,
      counter,
      move: m[3].replace(REF_RE, "").replace(/\s+/g, " ").trim().slice(0, 160),
      clip: null,
    });
    citedFor.push(cited ?? null);
  }
  await Promise.all(
    objections.map(async (o, i) => {
      const cited = citedFor[i];
      if (cited) o.clip = await toClip(cited, coaches);
    })
  );
  if (objections.length < 4) {
    console.warn("[dodger] scout returned too few lines", content.slice(0, 300));
    return null;
  }
  return { label: input.label ?? null, objections: objections.slice(0, 10) };
}

// ── Clips ──────────────────────────────────────────────────────────────────

export async function findClip(query: string): Promise<Clip | null> {
  const context = await getTenantContext();
  if (!context) return null;
  const res = await context.client.ai.search({
    prompt: query,
    stream: false,
    limit: 3,
  } as Parameters<typeof context.client.ai.search>[0] & { stream: false });
  const coaches = await coachNames();
  for (const s of res.sources ?? []) {
    const clip = await toClip(s, coaches);
    if (clip) return clip;
  }
  return null;
}

// ── Leaderboard ────────────────────────────────────────────────────────────

export interface BoardEntry {
  initials: string;
  score: number;
}

export function leaderboardEnabled(): boolean {
  return redisEnabled();
}

const boardKey = (day: string) => `gtm-game:daily:${day}`;

export async function topScores(day: string): Promise<BoardEntry[]> {
  const [raw] = await pipeline([["ZREVRANGE", boardKey(day), 0, 9, "WITHSCORES"]]);
  const flat = (raw as string[]) ?? [];
  const entries: BoardEntry[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    entries.push({ initials: flat[i].split(":")[0], score: Number(flat[i + 1]) });
  }
  return entries;
}

/** Counts submissions per client per minute; true when over the limit. */
export async function rateLimited(client: string): Promise<boolean> {
  const key = `gtm-game:rl:${client}`;
  const [count] = await pipeline([["INCR", key], ["EXPIRE", key, 60]]);
  return Number(count) > 6;
}

export async function submitScore(day: string, initials: string, score: number): Promise<number> {
  const member = `${initials}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const [, , rank] = await pipeline([
    ["ZADD", boardKey(day), score, member],
    ["EXPIRE", boardKey(day), 60 * 60 * 24 * 14],
    ["ZREVRANK", boardKey(day), member],
  ]);
  return Number(rank) + 1;
}
