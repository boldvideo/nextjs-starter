import { notFound, redirect } from "next/navigation";
import { bold } from "@/client";
import { VideoDetail } from "@/components/video-detail";
import type { Video, Settings, Playlist } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";

export const revalidate = 30;

export async function generateStaticParams() {
  // Generate static paths for all playlist/video combinations
  const { data: playlists } = await bold.playlists.list();

  const paths: { id: string; videoId: string }[] = [];

  for (const playlist of playlists) {
    for (const video of playlist.videos) {
      paths.push({
        id: playlist.id,
        videoId: video.id,
      });
    }
  }

  return paths;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id: playlistId, videoId } = await params;

  try {
    const [playlistResponse, videoResponse] = await Promise.all([
      bold.playlists.get(playlistId),
      bold.videos.get(videoId),
    ]);

    const playlist = playlistResponse?.data;
    const video = videoResponse?.data;

    if (!video) return {};

    return {
      title: `${video.title} - ${playlist?.title || "Playlist"}`,
      description: video.description,
      openGraph: {
        title: video.title,
        description: video.description,
        images: [
          {
            url: `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(
              video.title
            )}&img=${encodeURIComponent(video.thumbnail)}&l=${encodeURIComponent(
              formatDuration(video.duration)
            )}`,
            width: 1200,
            height: 630,
          },
        ],
      },
      // Canonical URL pointing to standalone video page
      alternates: {
        canonical: `/v/${videoId}`,
      },
    };
  } catch (error) {
    console.error("Failed to generate metadata for playlist video:", error);
    return {};
  }
}

/**
 * Fetches playlist, video, and settings data in parallel
 */
async function getPlaylistVideoData(
  playlistId: string,
  videoId: string
): Promise<{
  playlist: Playlist | null;
  video: Video | null;
  settings: Settings | null;
}> {
  try {
    const [playlistResponse, videoResponse, settingsData] = await Promise.all([
      bold.playlists.get(playlistId),
      bold.videos.get(videoId),
      bold
        .settings()
        .then((response) => response?.data ?? null)
        .catch((error) => {
          console.warn("Unable to load Bold settings for playlist video page:", error);
          return null;
        }),
    ]);

    const playlist = playlistResponse?.data ?? null;
    const video = videoResponse?.data ?? null;
    const settings = settingsData ?? null;

    return { playlist, video, settings };
  } catch (error) {
    console.error("Failed to fetch playlist video data:", error);
    throw error;
  }
}

export default async function PlaylistVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; videoId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id: playlistId, videoId } = await params;
  const { t } = await searchParams;

  const { playlist, video, settings } = await getPlaylistVideoData(
    playlistId,
    videoId
  );

  // If video doesn't exist at all, show 404
  if (!video) {
    notFound();
  }

  // If playlist doesn't exist or video is not in playlist, redirect to standalone video
  if (!playlist || !playlist.videos.some((v) => v.id === videoId)) {
    redirect(`/v/${videoId}`);
  }

  const startTime = t ? Number(t) : undefined;

  return (
    <VideoDetail
      video={video}
      startTime={startTime}
      settings={settings}
      playlist={playlist}
    />
  );
}
