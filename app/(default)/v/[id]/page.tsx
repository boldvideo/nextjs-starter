import { bold } from "@/client";
import { VideoDetail } from "@/components/video-detail";
import type { Video } from "@boldvideo/bold-js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { data: video } = await bold.videos.get(params.id);
  return {
    title: video.title,
    description: video.description,
    openGraph: {
      title: video.title,
      images: [
        {
          url: `https://demo.bold.video/og?t=${encodeURIComponent(
            video.title
          )}&img=${encodeURIComponent(video.thumbnail)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function VideoPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}): Promise<React.JSX.Element> {
  let video: Video | null = null;
  let errorMessage: string | null = null;

  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  try {
    const response = await bold.videos.get(params.id);
    video = response.data;
  } catch (error) {
    errorMessage = "Failed to load video. Please try again later.";
    console.error("Failed to fetch video:", error);
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
  if (!video) {
    return (
      <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Parse start time from query params
  const startTime = searchParams.t ? parseInt(searchParams.t, 10) : undefined;

  return <VideoDetail video={video} startTime={startTime} />;
}
