import "server-only";

import { unstable_cache } from "next/cache";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import content2025 from "@/content/2025.json";
import content2026 from "@/content/2026.json";

export type Year = 2025 | 2026;

export interface Speaker {
  name: string;
  role?: string;
  photo?: string | null;
}

export interface TalkEntry {
  kind: "talk";
  time: string;
  minutes: number;
  title: string;
  sessionId: string;
  speakers: Speaker[];
  description?: string;
  /** URL segment: /2025/<slug> */
  slug: string;
  /** Bold hashid; kept for old links only */
  videoId?: string | null;
  /** Bold internal id; what the server fetches by */
  uuid?: string;
}

export interface Extra {
  slug: string;
  title: string;
  videoId: string;
  uuid: string;
}

export interface NoteEntry {
  kind: "note" | "break";
  time: string;
  minutes: number;
  title: string;
}

export type Entry = TalkEntry | NoteEntry;

export interface Day {
  id: string;
  date: string;
  title: string;
  track: string;
  entries: Entry[];
}

export interface Programme {
  year: Year;
  days: Day[];
  extras?: Extra[];
}

export const PROGRAMMES: Record<Year, Programme> = {
  2025: content2025 as Programme,
  2026: content2026 as Programme,
};

export function isYear(value: string): value is "2025" | "2026" {
  return value === "2025" || value === "2026";
}

export function talks(year: Year): TalkEntry[] {
  return PROGRAMMES[year].days.flatMap((d) =>
    d.entries.filter((e): e is TalkEntry => e.kind === "talk")
  );
}

/** A talk (or extra, like the summary) by its URL slug within an edition. */
export function findBySlug(
  year: Year,
  slug: string
): { day: Day | null; talk: TalkEntry | null; extra: Extra | null } | null {
  for (const day of PROGRAMMES[year].days) {
    for (const e of day.entries) {
      if (e.kind === "talk" && e.slug === slug) return { day, talk: e, extra: null };
    }
  }
  const extra = PROGRAMMES[year].extras?.find((x) => x.slug === slug);
  return extra ? { day: null, talk: null, extra } : null;
}

export function talkHref(year: Year, t: { slug: string }): string {
  return `/${year}/${t.slug}`;
}

/** Bold internal id → where it lives here, for routing search results. */
export function searchIndex(): Record<string, { year: Year; slug: string }> {
  const map: Record<string, { year: Year; slug: string }> = {};
  for (const year of [2025, 2026] as Year[]) {
    for (const t of talks(year)) if (t.uuid) map[t.uuid] = { year, slug: t.slug };
    for (const x of PROGRAMMES[year].extras ?? []) map[x.uuid] = { year, slug: x.slug };
  }
  return map;
}

export function speakerLine(t: TalkEntry): string {
  const names = t.speakers.map((s) => s.name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export interface VideoSummary {
  /** Bold hashid (watch progress is keyed by it) */
  id: string;
  uuid: string;
  title: string;
  duration: number;
  thumbnail: string | null;
}

/**
 * Everything Lars has published in Bold, by internal id. This is the single
 * source of truth for what plays here: unlisted or draft videos never appear,
 * so a talk goes from "Soon" to playable the moment he publishes it.
 */
export const getPublished = unstable_cache(
  async (): Promise<Record<string, VideoSummary>> => {
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return {};
    const res = await context.client.videos.list(200);
    const out: Record<string, VideoSummary> = {};
    for (const v of (res?.data ?? []) as Video[]) {
      const internalId = (v as unknown as { internalId?: string }).internalId;
      if (!internalId) continue;
      out[internalId] = {
        id: v.id,
        uuid: internalId,
        title: v.title,
        duration: v.duration ?? 0,
        thumbnail: v.thumbnail ?? null,
      };
    }
    return out;
  },
  ["goatmire-published"],
  { revalidate: 60 }
);

const getUnpublished = unstable_cache(
  async (uuid: string): Promise<VideoSummary | null> => {
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return null;
    try {
      const { data: v } = await context.client.videos.get(uuid);
      return { id: v.id, uuid, title: v.title, duration: v.duration ?? 0, thumbnail: v.thumbnail ?? null };
    } catch {
      return null;
    }
  },
  ["goatmire-unpublished"],
  { revalidate: 60 }
);

/**
 * Published talks for a year, keyed by slug. A talk the JSON has no id for yet
 * is matched by its speaker's name in the video title ("Title - Speaker").
 */
export async function getAvailable(year: Year): Promise<Record<string, VideoSummary>> {
  const published = await getPublished();
  const all = Object.values(published);
  const out: Record<string, VideoSummary> = {};
  const items: Array<{ slug: string; uuid?: string; speaker?: string }> = [
    ...talks(year).map((t) => ({ slug: t.slug, uuid: t.uuid, speaker: t.speakers[0]?.name })),
    ...(PROGRAMMES[year].extras ?? []).map((x) => ({ slug: x.slug, uuid: x.uuid })),
  ];
  // Behind deployment protection only: show unpublished talks for review.
  const preview = process.env.GOATMIRE_SHOW_UNPUBLISHED === "1";
  for (const t of items) {
    if (t.uuid) {
      if (published[t.uuid]) out[t.slug] = published[t.uuid];
      else if (preview) {
        const v = await getUnpublished(t.uuid);
        if (v) out[t.slug] = v;
      }
      continue;
    }
    const speaker = t.speaker?.toLowerCase();
    const hit = speaker ? all.find((v) => v.title.toLowerCase().endsWith(speaker)) : undefined;
    if (hit) out[t.slug] = hit;
  }
  return out;
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

/** "Wednesday 10 September" → "Wednesday" (for "Friday, in order"). */
export function weekday(day: Day): string {
  return new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long" });
}
