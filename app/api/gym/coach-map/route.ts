import { getTenantContext } from "@/lib/get-tenant-context";
import { coachForVideo } from "@/components/gym/gym-coaches-data";

// Which coach leads each session, keyed by the ids citations carry (internal
// video UUID and Mux playback id). Static, refreshed hourly.
export const revalidate = 3600;

export async function GET() {
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
  return Response.json(map);
}
