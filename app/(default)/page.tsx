import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { getPortalConfig, PortalSettings } from "@/lib/portal-config";
import { LibraryHomepage } from "@/components/home/library-homepage";
import { AssistantHomepage } from "@/components/home/assistant-homepage";
import { EmptyHomepage } from "@/components/home/empty-homepage";

// How often this page should revalidate (in seconds)
export const revalidate = 60;

/**
 * Fetches initial data for the home page in parallel.
 * @returns An object containing settings and videos, or nulls if fetches fail.
 */
async function getHomeData(): Promise<{
  settings: PortalSettings | null;
  videos: Video[] | null;
}> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  const { client, settings } = context;

  // Debug: log full settings payload
  console.log("=== SETTINGS PAYLOAD ===");
  console.log(JSON.stringify(settings, null, 2));
  console.log("=== END SETTINGS PAYLOAD ===");

  // Get portal configuration
  const config = getPortalConfig(settings);

  // Only fetch videos if we're showing the library layout
  let videos: Video[] | null = null;
  if (config.homepage.layout === 'library') {
    const videosResponse = await client.videos.list(config.homepage.videosLimit);
    videos = videosResponse?.data ?? null;
  }

  return { settings, videos };
}

/**
 * Home page component that renders different layouts based on portal configuration
 * @returns The rendered homepage based on portal settings
 */
export default async function Home(): Promise<React.JSX.Element> {
  const { settings, videos } = await getHomeData();
  const config = getPortalConfig(settings);
  
  // Check for playlist display overrides
  const playlistShowAllVideos = process.env.PLAYLIST_SHOW_ALL_VIDEOS === 'true';
  const playlistStandaloneLinks = process.env.PLAYLIST_STANDALONE_LINKS === 'true';

  // Render appropriate homepage based on configuration
  switch (config.homepage.layout) {
    case 'assistant':
      return <AssistantHomepage settings={settings} config={config} />;
    
    case 'library':
      return (
        <LibraryHomepage 
          settings={settings} 
          videos={videos}
          playlistShowAllVideos={playlistShowAllVideos}
          playlistStandaloneLinks={playlistStandaloneLinks}
        />
      );
    
    case 'none':
      return <EmptyHomepage settings={settings} />;
    
    default:
      // Default to library layout
      return (
        <LibraryHomepage 
          settings={settings} 
          videos={videos}
          playlistShowAllVideos={playlistShowAllVideos}
          playlistStandaloneLinks={playlistStandaloneLinks}
        />
      );
  }
}
