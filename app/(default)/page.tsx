import React from "react";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { getPortalConfig, PortalSettings } from "@/lib/portal-config";
import { LibraryHomepage } from "@/components/home/library-homepage";
import { TakiHomepage, LibraryStats } from "@/components/home/taki-homepage";
import { EmptyHomepage } from "@/components/home/empty-homepage";

// How often this page should revalidate (in seconds)
export const revalidate = 60;

/**
 * Real corpus numbers for the hero ("121 videos · 34 hours"). Uses the
 * raw index endpoint so the count covers the whole library, not just the
 * first page the SDK returns.
 */
async function getLibraryStats(): Promise<LibraryStats | null> {
  try {
    const base = process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1";
    const res = await fetch(`${base}/videos`, {
      headers: { Authorization: `Bearer ${process.env.BOLD_API_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const list: Array<{ duration?: number }> = json?.data ?? [];
    if (list.length === 0) return null;
    const seconds = list.reduce((s, v) => s + (Number(v.duration) || 0), 0);
    return { count: list.length, hours: Math.round(seconds / 3600) };
  } catch {
    return null;
  }
}

/**
 * Fetches initial data for the home page in parallel.
 * @returns An object containing settings, videos, and library stats.
 */
async function getHomeData(): Promise<{
  settings: PortalSettings | null;
  videos: Video[] | null;
  stats: LibraryStats | null;
}> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant not found");
  }

  const { client, settings } = context;

  // Get portal configuration
  const config = getPortalConfig(settings);

  // Both layouts need videos: the library renders page 1 of the paginated
  // index, the assistant homepage teases the latest few.
  let videos: Video[] | null = null;
  let stats: LibraryStats | null = null;
  if (config.homepage.layout === 'library') {
    const videosResponse = await client.videos.list({ page: 1 });
    videos = videosResponse?.data ?? null;
  } else if (config.homepage.layout === 'assistant') {
    const [videosResponse, libraryStats] = await Promise.all([
      client.videos.list({ page: 1 }),
      getLibraryStats(),
    ]);
    videos = videosResponse?.data ?? null;
    stats = libraryStats;
  }

  return { settings, videos, stats };
}

/**
 * Home page component that renders different layouts based on portal configuration
 * @returns The rendered homepage based on portal settings
 */
export default async function Home(): Promise<React.JSX.Element> {
  const { settings, videos, stats } = await getHomeData();
  const config = getPortalConfig(settings);

  // Check for playlist display overrides
  const playlistShowAllVideos = process.env.PLAYLIST_SHOW_ALL_VIDEOS === 'true';
  const playlistStandaloneLinks = process.env.PLAYLIST_STANDALONE_LINKS === 'true';

  // Render appropriate homepage based on configuration
  switch (config.homepage.layout) {
    case 'assistant':
      return (
        <TakiHomepage
          settings={settings}
          config={config}
          videos={videos}
          stats={stats}
        />
      );
    
    case 'library':
      return (
        <LibraryHomepage 
          settings={settings} 
          videos={videos}
          config={config}
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
          config={config}
          playlistShowAllVideos={playlistShowAllVideos}
          playlistStandaloneLinks={playlistStandaloneLinks}
        />
      );
  }
}
