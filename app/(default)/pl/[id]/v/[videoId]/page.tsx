import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import { VideoDetail } from "@/components/video/detail";
import type { Video, Settings, Playlist } from "@boldvideo/bold-js";
import type { ExtendedVideo } from "@/types/video-detail";
import { formatDuration } from "util/format-duration";

export const revalidate = 30;

export async function generateStaticParams() {
  // Static generation requires a consistent client - skip for now in multitenancy
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id: playlistId, videoId } = await params;
  const context = await getTenantContext();
  if (!context) return {};

  try {
    const [playlistResponse, videoResponse] = await Promise.all([
      context.client.playlists.get(playlistId),
      context.client.videos.get(videoId),
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
  const context = await getTenantContext();
  if (!context) {
    return { playlist: null, video: null, settings: null };
  }

  const { client, settings } = context;

  try {
    const [playlistResponse, videoResponse] = await Promise.all([
      client.playlists.get(playlistId),
      client.videos.get(videoId),
    ]);

    const playlist = playlistResponse?.data ?? null;
    const video = videoResponse?.data ?? null;

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
      video={video as unknown as ExtendedVideo}
      startTime={startTime}
      settings={settings}
      playlist={playlist}
    />
  );
}
