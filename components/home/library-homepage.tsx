import React from "react";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { FeaturedPlaylist } from "@/components/featured-playlist";
import type { Video, Playlist } from "@boldvideo/bold-js";
import { PortalSettings } from "@/lib/portal-config";

interface LibraryHomepageProps {
  settings: PortalSettings | null;
  videos: Video[] | null;
}

export function LibraryHomepage({ settings, videos }: LibraryHomepageProps) {
  const hasVideos = videos && videos.length > 0;
  const hasPlaylists = settings?.featured_playlists && settings.featured_playlists.length > 0;
  const showPlaylists = settings?.portal?.layout?.show_playlists ?? true;

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto overflow-y-auto">
      {/* Videos Section */}
      {hasVideos && (
        <section>
          <h2 className="font-bold text-3xl mb-5" id="latest-videos">
            Latest Videos
          </h2>
          <ul
            className="mb-16 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10"
            aria-labelledby="latest-videos"
          >
            {videos.map((video) => (
              <li key={video.id}>
                <VideoThumbnail video={video} prefetch={true} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured Playlists Section */}
      {hasPlaylists && showPlaylists && (
        <section>
          {settings.featured_playlists.map((playlist: Playlist) => (
            <FeaturedPlaylist key={playlist.id} playlist={playlist} />
          ))}
        </section>
      )}

      {/* Optional: Add a message if neither section has content */}
      {!hasVideos && (!hasPlaylists || !showPlaylists) && (
        <p className="text-center text-gray-500">No content available yet.</p>
      )}
    </div>
  );
}