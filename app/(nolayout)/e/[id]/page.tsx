import { getTenantContext } from "@/lib/get-tenant-context";
import { Player } from "@/components/players";
import type { Settings } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";
import { EmbedContainer } from "@/components/embed/embed-container";
import { hexToOklch } from "@/lib/color-utils";
import type { ExtendedVideo } from "@/types/video-detail";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const context = await getTenantContext();
  if (!context) return {};

  const { data: video } = await context.client.videos.get(params.id);
  return {
    title: video.title,
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
  };
}

interface VideoPageData {
  video: ExtendedVideo | null;
  settings: Settings | null;
}

async function getVideoPageData(id: string): Promise<VideoPageData | null> {
  try {
    const context = await getTenantContext();
    if (!context) return null;

    const [videoResult, settingsResult] = await Promise.all([
      context.client.videos.get(id),
      context.client.settings(),
    ]);

    return {
      video: videoResult.data as ExtendedVideo | null,
      settings: settingsResult.data,
    };
  } catch (error) {
    console.error("Failed to fetch video page data:", error);
    return null;
  }
}

export default async function EmbedPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    t?: string;
    chat?: string;
    chapters?: string;
    transcript?: string;
    tab?: string;
    progress?: string;
    accent?: string;
    preview?: string;
  }>;
}) {
  const params = await paramsPromise;
  const {
    t,
    chat: chatParam,
    chapters: chaptersParam,
    transcript: transcriptParam,
    tab: defaultTabParam,
    progress: progressParam,
    accent,
    preview: previewParam,
  } = await searchParamsPromise;

  const pageData = await getVideoPageData(params.id);

  if (!pageData || !pageData.video) {
    return (
      <div className="bg-black m-0 p-0 w-screen h-screen overflow-hidden flex items-center justify-center">
        <p className="text-white">
          Failed to load video. Please try again later.
        </p>
      </div>
    );
  }

  const { video, settings } = pageData;

  // Parse URL parameters
  const startTime = t ? parseInt(t, 10) : undefined;
  const progress = progressParam === "1";
  const preview = previewParam === "1";

  // Build enabled tabs from individual boolean flags
  const enabledTabs: ("chat" | "chapters" | "transcript")[] = [];
  if (chatParam === "1") enabledTabs.push("chat");
  if (chaptersParam === "1") enabledTabs.push("chapters");
  if (transcriptParam === "1") enabledTabs.push("transcript");

  // Enhanced mode is implied by presence of any tab flag
  const enhanced = enabledTabs.length > 0;

  const defaultTab = enabledTabs.includes(defaultTabParam as typeof enabledTabs[number]) 
    ? defaultTabParam 
    : enabledTabs[0];

  // Convert hex accent to OKLCH for CSS variable injection
  const accentOklch = accent ? hexToOklch(accent) : null;
  const accentStyle = accentOklch
    ? ({ "--accent": accentOklch, "--primary": accentOklch } as React.CSSProperties)
    : undefined;

  // If not enhanced, render the simple player
  if (!enhanced) {
    return (
      <div className="bg-black m-0 p-0 w-screen h-screen overflow-hidden" style={accentStyle}>
        {preview && (
          <div className="absolute top-2 left-2 z-50 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
            Preview
          </div>
        )}
        <Player
          key={`video-${video.id}`}
          video={video}
          autoPlay={false}
          startTime={startTime}
          className="max-w-none"
        />
      </div>
    );
  }

  // Enhanced mode - render with EmbedContainer
  return (
    <div style={accentStyle}>
      <EmbedContainer
        video={video}
        settings={settings}
        startTime={startTime}
        enhanced={enhanced}
        enabledTabs={enabledTabs}
        defaultTab={defaultTab}
        progress={progress}
        preview={preview}
      />
    </div>
  );
}
