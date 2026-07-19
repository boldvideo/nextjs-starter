import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { getPortalConfig } from "@/lib/portal-config";
import { LibraryHomepage } from "@/components/home/library-homepage";

export const revalidate = 60;

/**
 * The full library, one level below the chat-first homepage. Renders the
 * same browsing experience the library homepage layout provides.
 */
export default async function VideosPage(): Promise<React.JSX.Element> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  const { client, settings } = context;
  const config = getPortalConfig(settings);

  const videosResponse = await client.videos.list({ page: 1 });
  const videos: Video[] | null = videosResponse?.data ?? null;

  return (
    <LibraryHomepage
      settings={settings}
      videos={videos}
      config={config}
      playlistShowAllVideos={process.env.PLAYLIST_SHOW_ALL_VIDEOS === "true"}
      playlistStandaloneLinks={process.env.PLAYLIST_STANDALONE_LINKS === "true"}
    />
  );
}
