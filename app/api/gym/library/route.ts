import { getTenantContext } from "@/lib/get-tenant-context";

// How big the library behind every answer is ("44 hours of FounderWell
// sessions"). Static, refreshed hourly.
export const revalidate = 3600;

export async function GET() {
  const context = await getTenantContext();
  const seen = new Set<string>();
  let seconds = 0;
  try {
    const res = await context?.client.videos.list({ page: 1 });
    for (const v of res?.data ?? []) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      seconds += v.duration || 0;
    }
  } catch (error) {
    console.error("[gym] library stats failed", error);
  }
  return Response.json({ sessions: seen.size, hours: Math.round(seconds / 3600) });
}
