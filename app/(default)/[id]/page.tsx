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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context) return {};

  try {
    const { data } = await context.client.videos.get(id);
    const video = data as ExtendedVideo;
    if (!video) return {};

    const description = video.teaser || video.description || "";

    return {
      title: video.title,
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
      alternates: {
        canonical: getCanonicalVideoPath(video.slug || id),
      },
    };
  } catch {
    return {};
  }
}

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

    if (!video) {
      notFound();
    }

    return { settings, video };
  } catch {
    notFound();
  }
}

export default async function RootVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  const { settings, video } = await getVideoPageData(id);

  if (!video) {
    notFound();
  }

  const videoIdentifier = video.slug || id;
  const pathStyle = getVideoPathStyle();
  const canonicalPath = getCanonicalVideoPath(videoIdentifier);

  // Redirect to canonical URL pattern
  // If style is "v", redirect /... to /v/...
  // If accessed by UUID and video has slug, redirect to slug-based URL
  if (pathStyle === "v" || (video.slug && isUUID(id))) {
    const currentPath = `/${id}`;
    if (currentPath !== canonicalPath) {
      const redirectUrl = t ? `${canonicalPath}?t=${t}` : canonicalPath;
      redirect(redirectUrl);
    }
  }

  const startTime = t ? Number(t) : undefined;

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
