import { notFound, redirect } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import { VideoDetail } from "@/components/video/detail";
import { VideoSchema } from "@/components/seo/video-schema";
import { isUUID } from "@/util/is-uuid";
import { getVideoPathStyle, getCanonicalVideoPath } from "@/lib/video-path";
import type { Video, Settings } from "@boldvideo/bold-js";
import type { ExtendedVideo } from "@/types/video-detail";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  // `params` is a Promise in Next.js 15+
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context) return {};

  const { data } = await context.client.videos.get(id);
  const video = data as ExtendedVideo;
  const description = video.teaser || video.description || "";

  // Mux thumbnails are guaranteed JPEG (imported thumbs can be WebP behind a
  // .jpg name, which some scrapers can't parse).
  const ogThumb = video.playbackId
    ? `https://image.mux.com/${video.playbackId}/thumbnail.jpg?width=1200&fit_mode=preserve`
    : video.thumbnail;

  return {
    title: video.title,
    description,
    openGraph: {
      title: video.title,
      description,
      images: [
        {
          url: ogThumb,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: getCanonicalVideoPath(video.slug || id),
    },
  };
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
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

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
      const redirectUrl = t ? `${canonicalPath}?t=${t}` : canonicalPath;
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
        settings={settings}
        className="max-w-7xl"
      />
    </>
  );
}
