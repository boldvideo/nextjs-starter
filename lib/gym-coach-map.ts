import "server-only";

import { unstable_cache } from "next/cache";
import { getTenantContext } from "@/lib/get-tenant-context";
import { coachForVideo } from "@/components/gym/gym-coaches-data";

/**
 * Which coach leads each session, keyed by every id a citation can carry
 * (video id, internal UUID, Mux playback id). One list call, cached an hour.
 */
export const getCoachMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const context = await getTenantContext();
    const map: Record<string, string> = {};
    try {
      const res = await context?.client.videos.list({ page: 1 });
      for (const v of res?.data ?? []) {
        const coach = coachForVideo(v);
        if (!coach) continue;
        const video = v as typeof v & { internalId?: string; playbackId?: string };
        if (video.internalId) map[video.internalId] = coach.slug;
        if (video.playbackId) map[video.playbackId] = coach.slug;
        map[v.id] = coach.slug;
      }
    } catch (error) {
      console.error("[gym] coach map failed", error);
    }
    return map;
  },
  ["gym-coach-map"],
  { revalidate: 3600 }
);

/** The most-cited coach among an answer's sources, if any. */
export async function leadCoachSlug(
  sources: { videoId?: string; muxPlaybackId?: string; playbackId?: string; cited?: boolean }[] | undefined
): Promise<string | null> {
  if (!sources?.length) return null;
  const map = await getCoachMap();
  const counts = new Map<string, number>();
  for (const s of sources) {
    if (s.cited === false) continue;
    const slug = map[s.videoId ?? ""] ?? map[s.muxPlaybackId ?? s.playbackId ?? ""];
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
