import React from "react";
import { FeaturedPlaylist } from "@/components/featured-playlist";
import { HeroSlot } from "@/components/home/hero-slot";
import { VideoLibrary } from "@/components/home/video-library";
import type { Playlist } from "@boldvideo/bold-js";
import type { Video } from "@boldvideo/bold-js";
import type { PortalSettings, PortalConfig } from "@/lib/portal-config";

// Fork default tagline shown under the library title when the tenant hasn't
// configured a channel description.
const DEFAULT_TAGLINE =
  "Real AI systems, built live every Tuesday. Agents, evals, RAG, and what actually holds up in production.";

interface LibraryHomepageProps {
  settings: PortalSettings | null;
  videos: Video[] | null;
  config: PortalConfig;
  playlistShowAllVideos?: boolean;
  playlistStandaloneLinks?: boolean;
}

export function LibraryHomepage({
  settings,
  videos,
  config,
  playlistShowAllVideos = false,
  playlistStandaloneLinks = false,
}: LibraryHomepageProps) {
  const hasVideos = videos && videos.length > 0;
  const hasPlaylists =
    settings?.featuredPlaylists && settings.featuredPlaylists.length > 0;
  const showPlaylists = settings?.portal?.layout?.showPlaylists ?? true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = settings as any;
  const title =
    meta?.metaData?.channelName || meta?.account?.name || "AI That Works";
  const subtitle =
    meta?.metaData?.channelDescription ||
    meta?.metaData?.description ||
    DEFAULT_TAGLINE;

  return (
    <div className="overflow-y-auto">
      <div className="px-5 md:px-10 max-w-screen-2xl mx-auto">
        <HeroSlot settings={settings} config={config} />
      </div>

      {/* Library: topic rail + episode grid */}
      {hasVideos && (
        <VideoLibrary initialVideos={videos} title={title} subtitle={subtitle} />
      )}

      {/* Featured Playlists Section */}
      {hasPlaylists && showPlaylists && (
        <div className="px-5 md:px-10 max-w-screen-2xl mx-auto">
          <section>
            {settings.featuredPlaylists.map((playlist: Playlist) => (
              <FeaturedPlaylist
                key={playlist.id}
                playlist={playlist}
                showAllVideos={playlistShowAllVideos}
                useStandaloneLinks={playlistStandaloneLinks}
              />
            ))}
          </section>
        </div>
      )}

      {/* Optional: Add a message if neither section has content */}
      {!hasVideos && (!hasPlaylists || !showPlaylists) && (
        <p className="text-center text-muted-foreground py-16">
          No content available yet.
        </p>
      )}
    </div>
  );
}
