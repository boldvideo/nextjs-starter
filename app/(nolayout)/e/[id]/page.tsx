import { bold } from "@/client";
// import { Player } from "components/embed-player";
import { Player } from "@/components/players";
import type { Video } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";

/**
 * Extended Video type with additional properties used in our application
 */
interface ExtendedVideo extends Video {
  chapters_url?: string;
}

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
      description: video.description,
      images: [
        {
          url: `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(
            video.title,
          )}&img=${encodeURIComponent(video.thumbnail)}&l=${encodeURIComponent(
            formatDuration(video.duration),
          )}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

async function getVideo(id: string): Promise<ExtendedVideo | null> {
  try {
    const { data } = await bold.videos.get(id);
    return data as ExtendedVideo;
  } catch (error) {
    console.error("Failed to fetch video:", error);
    return null;
  }
}

export default async function EmbedPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const video = await getVideo(params.id);

  if (!video) {
    return (
      <div className="bg-black m-0 p-0 w-screen h-screen overflow-hidden flex items-center justify-center">
        <p className="text-white">
          Failed to load video. Please try again later.
        </p>
      </div>
    );
  }

  // Parse start time from query params
  const startTime = searchParams.t ? parseInt(searchParams.t, 10) : undefined;

  return (
    <div className="bg-black m-0 p-0 w-screen h-screen overflow-hidden">
      <Player
        key={`video-${video.id}`}
        video={video}
        autoPlay={false}
        startTime={startTime}
        className="max-w-none" // Removes any max-width constraint in the embed view
      />
    </div>
  );
}
