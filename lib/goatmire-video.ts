import "server-only";

import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import type { WatchVideo } from "@/components/goatmire/watch";

/** Load a talk for a watch page, shaped for the client player. */
export async function loadWatchVideo(id: string): Promise<WatchVideo & { description?: string | null; title: string }> {
  const context = await getTenantContext({ includeSettings: false });
  if (!context) notFound();
  let video: Record<string, unknown> | null = null;
  try {
    const res = await context.client.videos.get(id);
    video = (res?.data ?? null) as Record<string, unknown> | null;
  } catch {
    video = null;
  }
  if (!video) notFound();
  const transcript = video.transcript as { json?: { url?: string } } | undefined;
  return {
    ...(video as unknown as WatchVideo),
    description: (video.description as string | null) ?? null,
    title: video.title as string,
    duration: (video.duration as number) ?? 0,
    transcriptUrl: transcript?.json?.url ?? null,
  };
}
