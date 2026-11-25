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
  id: string;
  title: string;
  duration: number;
  thumbnail: string | null;
}

/**
 * Published talks the JSON doesn't know yet, matched to their schedule slot by
 * the speaker's name in the video title ("Title - Speaker"). Lets a 2026 talk
 * go from "Soon" to playable the moment it is published in Bold.
 */
export const getLiveMatches = unstable_cache(
  async (year: Year): Promise<Record<string, { uuid: string; videoId: string }>> => {
    const missing = talks(year).filter((t) => !t.uuid);
    if (missing.length === 0) return {};
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return {};
    let list: Video[] = [];
    try {
      const res = await context.client.videos.list(100);
      list = (res?.data ?? []) as Video[];
    } catch {
      return {};
    }
    const out: Record<string, { uuid: string; videoId: string }> = {};
    for (const t of missing) {
      const speaker = t.speakers[0]?.name.toLowerCase();
      if (!speaker) continue;
      const hit = list.find((v) => v.title?.toLowerCase().includes(speaker));
      const internal = (hit as unknown as { internalId?: string; internal_id?: string } | undefined);
      const uuid = internal?.internalId ?? internal?.internal_id;
      if (hit && uuid) out[t.slug] = { uuid, videoId: hit.id };
    }
    return out;
  },
  ["goatmire-live-matches"],
  { revalidate: 300 }
);

/** The Bold internal id for a talk: from the JSON, else from a live match. */
export async function resolveUuid(year: Year, t: { slug: string; uuid?: string }): Promise<string | null> {
  if (t.uuid) return t.uuid;
  const live = await getLiveMatches(year);
  return live[t.slug]?.uuid ?? null;
}

/**
 * Durations + thumbnails for every recorded talk in a year, keyed by slug. The
 * 2026 talks are unlisted, so they are fetched one by one by internal id.
 */
export const getVideoSummaries = unstable_cache(
  async (year: Year): Promise<Record<string, VideoSummary>> => {
    const context = await getTenantContext({ includeSettings: false });
    if (!context) return {};
    const live = await getLiveMatches(year);
    const items = [...talks(year), ...(PROGRAMMES[year].extras ?? [])]
      .map((t) => ({ slug: t.slug, uuid: t.uuid ?? live[t.slug]?.uuid }))
      .filter((t): t is { slug: string; uuid: string } => !!t.uuid);
    const results = await Promise.all(
      items.map(async ({ uuid }) => {
        try {
          const { data } = await context.client.videos.get(uuid);
          return data as Video;
        } catch {
          return null;
        }
      })
    );
    const out: Record<string, VideoSummary> = {};
    results.forEach((v, i) => {
      if (!v) return;
      out[items[i].slug] = {
        id: v.id,
        title: v.title,
        duration: v.duration ?? 0,
        thumbnail: v.thumbnail ?? null,
      };
    });
    return out;
  },
  ["goatmire-video-summaries"],
  { revalidate: 300 }
);

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
