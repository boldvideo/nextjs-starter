import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import { VideoDetail } from "@/components/video/detail";
import { isUUID } from "@/util/is-uuid";
import type { Video, Settings, Playlist } from "@boldvideo/bold-js";
import type { ExtendedVideo } from "@/types/video-detail";

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

    const extVideo = video as ExtendedVideo;
    const description = extVideo.teaser || extVideo.description || "";

    return {
      title: `${video.title} - ${playlist?.title || "Playlist"}`,
      description,
      openGraph: {
        title: video.title,
        description,
        images: [
          {
            url: video.thumbnail,
            width: 1200,
            height: 630,
          },
        ],
      },
      // Canonical URL pointing to standalone video page (prefer slug)
      alternates: {
        canonical: `/v/${video.slug || videoId}`,
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

  // Redirect to slug-based URL if accessed by UUID and video has a slug
  if (video.slug && isUUID(videoId)) {
    const redirectUrl = t ? `/pl/${playlistId}/v/${video.slug}?t=${t}` : `/pl/${playlistId}/v/${video.slug}`;
    redirect(redirectUrl);
  }

  // If playlist doesn't exist or video is not in playlist, redirect to standalone video
  const videoIdentifier = video.slug || videoId;
  if (!playlist || !playlist.videos.some((v) => v.id === video.id)) {
    redirect(`/v/${videoIdentifier}`);
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
