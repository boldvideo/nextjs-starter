import React from "react";
import { bold } from "@/client";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { FeaturedPlaylist } from "@/components/featured-playlist";
import type { Settings, Video, Playlist } from "@boldvideo/bold-js";

// How often this page should revalidate (in seconds)
export const revalidate = 60;

// Number of videos to display on the homepage
const LATEST_VIDEO_LIMIT = 8;

/**
 * Home page component that displays latest videos and featured playlists
 * @returns The rendered homepage
 */
export default async function Home(): Promise<React.JSX.Element> {
  let settings: Settings | null = null;
  let videos: Video[] | null = null;
  let errorMessage: string | null = null;

  try {
    const settingsResponse = await bold.settings(8);

    settings = settingsResponse.data;
    console.log(settings.featured_playlists);
  } catch (error) {
    errorMessage = "Failed to load settings. Please try again later.";
    console.error("Failed to fetch settings:", error);
  }

  // Show error message if settings failed to load
  if (errorMessage) {
    return (
      <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-medium">Error</h2>
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  try {
    const videosResponse = await bold.videos.list(LATEST_VIDEO_LIMIT);
    videos = videosResponse.data;
  } catch (error) {
    console.error("Failed to fetch videos:", error);
  }

  const hasVideos = videos && videos.length > 0;
  const hasPlaylists =
    settings?.featured_playlists && settings.featured_playlists.length > 0;

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      {/* Videos Section */}
      {hasVideos && videos && (
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
      {hasPlaylists && settings && (
        <section>
          {settings.featured_playlists.map((playlist) => (
            <FeaturedPlaylist key={playlist.id} playlist={playlist} />
          ))}
        </section>
      )}
    </div>
  );
}
