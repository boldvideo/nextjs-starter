import React from "react";
import { bold } from "@/client";
import VideoThumbnail from "@/components/video-thumbnail";
import { FeaturedPlaylist } from "@/components/featured-playlist";
import type { Settings, Video, Playlist } from "@boldvideo/bold-js";
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
  try {
    const settingsResponse = await bold.settings(8);
    const settings = settingsResponse?.data ?? null;
    
    // Get portal configuration
    const config = getPortalConfig(settings);
    
    // Only fetch videos if we're showing the library layout
    let videos: Video[] | null = null;
    if (config.homepage.layout === 'library') {
      const videosResponse = await bold.videos.list(config.homepage.videosLimit);
      videos = videosResponse?.data ?? null;
    }

    return { settings, videos };
  } catch (error) {
    console.error("Failed to fetch home page data:", error);
    // Let the Next.js error boundary handle the UI
    throw error; // Re-throw to trigger the error boundary
  }
}

/**
 * Home page component that renders different layouts based on portal configuration
 * @returns The rendered homepage based on portal settings
 */
export default async function Home(): Promise<React.JSX.Element> {
  const { settings, videos } = await getHomeData();
  const config = getPortalConfig(settings);
  
  // Render appropriate homepage based on configuration
  switch (config.homepage.layout) {
    case 'assistant':
      return <AssistantHomepage settings={settings} config={config} />;
    
    case 'library':
      return <LibraryHomepage settings={settings} videos={videos} />;
    
    case 'none':
      return <EmptyHomepage settings={settings} />;
    
    default:
      // Default to library layout
      return <LibraryHomepage settings={settings} videos={videos} />;
  }
}
