import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { SrlLibrary } from "@/components/home/srl-library";

export const revalidate = 60;

/**
 * The raw index endpoint returns the whole corpus (the SDK list is
 * paginated), so the episodes page always shows every published show no
 * matter how large the library grows. Raw payloads are snake_case —
 * normalize the fields the cards read.
 */
async function getAllEpisodes(): Promise<Video[] | null> {
  try {
    const base = process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1";
    const res = await fetch(`${base}/videos`, {
      headers: { Authorization: `Bearer ${process.env.BOLD_API_KEY}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const list: Array<Record<string, unknown>> = json?.data ?? [];
    if (list.length === 0) return null;
    const videos = list.map(
      (v) =>
        ({
          ...v,
          publishedAt: v.published_at ?? v.publishedAt,
        }) as unknown as Video
    );
    // Newest first, regardless of index order
    return videos.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(String(a.publishedAt)) : 0;
      const tb = b.publishedAt ? Date.parse(String(b.publishedAt)) : 0;
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });
  } catch {
    return null;
  }
}

export default async function VideosPage(): Promise<React.JSX.Element> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  // Full corpus first; SDK page 1 as the fallback if the raw fetch fails
  let videos = await getAllEpisodes();
  if (!videos) {
    const videosResponse = await context.client.videos.list({ page: 1 });
    videos = videosResponse?.data ?? null;
  }

  return <SrlLibrary videos={videos} />;
}
