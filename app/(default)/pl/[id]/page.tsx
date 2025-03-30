import { bold } from "@/client";
import { VideoThumbnail } from "@/components/video-thumbnail";
import type { Playlist, Video } from "@boldvideo/bold-js";

export const dynamic = "force-dynamic";
export const revalidate = 2;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { data: playlist } = await bold.playlists.get(params.id);
  const videos = playlist.videos;
  return {
    title: playlist.title,
    description: playlist.description,
    openGraph: {
      title: playlist.title,
      images: [
        {
          url: `https://demo.bold.video/og?t=${encodeURIComponent(
            `Playlist: ${playlist.title}`
          )}&img=${encodeURIComponent(videos[0].thumbnail)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function PlaylistPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  let playlist: Playlist | null = null;
  let errorMessage: string | null = null;

  const params = await paramsPromise;

  try {
    const response = await bold.playlists.get(params.id);
    playlist = response.data;
  } catch (error) {
    errorMessage = "Failed to load playlist. Please try again later.";
    console.error("Failed to fetch playlist:", error);
  }

  // Handle error state
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

  // Handle loading state
  if (!playlist) {
    return (
      <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasVideos = playlist.videos && playlist.videos.length > 0;

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      {/* Playlist Header */}
      <div className="mb-8">
        <h2 className="font-bold text-3xl mb-5">{playlist.title}</h2>
        {playlist.description && (
          <p className="text-lg text-muted-foreground max-w-3xl">
            {playlist.description}
          </p>
        )}
      </div>

      {/* Videos Grid */}
      {hasVideos && (
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
          {playlist.videos.map((video: Video) => (
            <li key={video.id}>
              <VideoThumbnail video={video} />
            </li>
          ))}
        </ul>
      )}

      {/* No Videos Message */}
      {!hasVideos && (
        <div className="py-12 px-4 flex flex-col items-center justify-center">
          <p className="font-medium text-lg">No videos in this playlist</p>
          <p className="text-sm mt-2 text-muted-foreground text-center max-w-xs">
            This playlist is empty
          </p>
        </div>
      )}
    </div>
  );
}
