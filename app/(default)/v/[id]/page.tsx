import { notFound, redirect } from "next/navigation";
import { gymVideoMeta } from "@/lib/gym-meta";
import type { Metadata } from "next";
import { getTenantContext } from "@/lib/get-tenant-context";
import { VideoDetail } from "@/components/video/detail";
import { videoQuery, type VideoQueryParams } from "@/lib/video-voice";
import { VideoSchema } from "@/components/seo/video-schema";
import { isUUID } from "@/util/is-uuid";
import { getVideoPathStyle, getCanonicalVideoPath } from "@/lib/video-path";
import type { Video, Settings } from "@boldvideo/bold-js";
import type { ExtendedVideo } from "@/types/video-detail";

export const revalidate = 30;

export async function generateMetadata({
  params,
  searchParams,
}: {
  // `params` is a Promise in Next.js 15+
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const context = await getTenantContext();
  if (!context) return {};

  try {
    const { data } = await context.client.videos.get(id);
    const video = data as ExtendedVideo;
    if (!video?.title) return {};
    const t = parseInt(String(Array.isArray(sp.t) ? sp.t[0] : sp.t ?? ""), 10);
    return gymVideoMeta(video, getCanonicalVideoPath(video.slug || id), t);
  } catch {
    return {};
  }
}

/**
 * Fetches initial data for the video page in parallel.
 * @returns An object containing settings and the video, or nulls if fetches fail.
 */
async function getVideoPageData(videoId: string): Promise<{
  settings: Settings | null;
  video: Video | null;
}> {
  const context = await getTenantContext();
  if (!context) {
    notFound();
  }

  const { client, settings } = context;

  try {
    const videoResponse = await client.videos.get(videoId);
    const video = videoResponse?.data ?? null;

    // Handle 404 / logical "missing" case for video
    if (!video) {
      notFound();
    }

    return { settings, video };
  } catch (error) {
    console.error("Failed to fetch video page data:", error);
    throw error;
  }
}

export default async function VideoPage({
  params,
  searchParams,
}: {
  // `params` and `searchParams` are Promises starting from Next.js 15.
  params: Promise<{ id: string }>;
  searchParams: Promise<VideoQueryParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { t, voice } = query;

  const { settings, video } = await getVideoPageData(id);

  // This check might be redundant if getVideoPageData throws notFound(), but kept for safety
  if (!video) {
    // If settings are critical and failed, maybe show an error or different notFound logic
    notFound();
  }

  const videoIdentifier = video.slug || id;
  const pathStyle = getVideoPathStyle();
  const canonicalPath = getCanonicalVideoPath(videoIdentifier);

  // Redirect to canonical URL pattern
  // If style is "root", redirect /v/... to /...
  // If accessed by UUID and video has slug, redirect to slug-based URL
  if (pathStyle === "root" || (video.slug && isUUID(id))) {
    const currentPath = `/v/${id}`;
    if (currentPath !== canonicalPath) {
      const redirectUrl = `${canonicalPath}${videoQuery(query)}`;
      redirect(redirectUrl);
    }
  }

  const startTime = t ? Number(t) : undefined;

  // Build URL for schema
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const videoUrl = baseUrl ? `${baseUrl}${canonicalPath}` : null;

  return (
    <>
      {videoUrl && <VideoSchema video={video} url={videoUrl} />}
      <VideoDetail
        video={video as unknown as ExtendedVideo}
        startTime={startTime}
        voicePreview={voice}
        settings={settings}
        className="max-w-7xl"
      />
    </>
  );
}
