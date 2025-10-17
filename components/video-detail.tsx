"use client";
import { formatRelative } from "date-fns";
import { Player } from "@/components/players";
import { Transcript } from "@/components/transcript";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Video, Settings, Playlist } from "@boldvideo/bold-js";
import { bold } from "@/client";
import { VideoDescription } from "./video-description";
import { ChaptersSidebar } from "./chapters-sidebar";
import { MobileChapterTabs } from "./mobile-chapter-tabs";
import { VideoContentTabs, VideoTabId } from "./video-content-tabs";
import type React from "react";
import { AIAssistantProvider } from "./ui/ai-assistant/context";
import { AIAssistant } from "./ui/ai-assistant";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PlaylistSidebar } from "./playlist-sidebar";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AutoplayToggle } from "./autoplay-toggle";

/**
 * CTA type for call-to-action data
 */
interface CTA {
  id: string;
  name: string;
  description: string;
  title: string;
  button_text?: string;
  button_url?: string;
}

/**
 * Extended Video type with additional properties used in our application
 */
interface ExtendedVideo extends Omit<Video, "cta"> {
  chapters_url?: string;
  ai_avatar?: string;
  ai_name?: string;
  cta?: CTA | null;
}

/**
 * Props for the VideoDetail component
 */
interface VideoDetailProps {
  video: ExtendedVideo;
  startTime?: number;
  className?: string;
  settings: Settings | null;
  playlist?: Playlist;
}

/**
 * Video detail page component showing a video player and metadata
 */
export function VideoDetail({
  video: initialVideo,
  startTime,
  className = "max-w-7xl",
  settings,
  playlist,
}: VideoDetailProps): React.JSX.Element {
  const router = useRouter();
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [video] = useState<ExtendedVideo>(initialVideo);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [isOutOfView, setIsOutOfView] = useState<boolean>(false);
  const prevScrollY = useRef(0);

  // Get playlist state from context
  const { isOpen, setIsOpen, setHasPlaylist } = usePlaylist();

  // Update playlist availability when component mounts/updates
  useEffect(() => {
    setHasPlaylist(!!playlist);
    return () => setHasPlaylist(false); // Clean up when unmounting
  }, [playlist, setHasPlaylist]);

  // Add state for unified tab navigation
  const [activeTab, setActiveTab] = useState<VideoTabId>("description");

  // Check if the video has chapters
  const hasChapters = Boolean(video.chapters);

  // Check if AI assistant should be shown (requires both has_ai flag and transcript)
  const showAIAssistant = Boolean(settings?.has_ai && hasTranscript);

  // Handle scroll behavior for floating player
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > window.innerHeight * 0.7 && !isOutOfView) {
      setIsOutOfView(false);
    }
    if (currentScrollY < window.innerHeight * 0.7 && isOutOfView) {
      setIsOutOfView(false);
    }
    prevScrollY.current = currentScrollY;
  }, [isOutOfView]);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Set initial time when component mounts
  useEffect(() => {
    if (startTime && playerRef.current) {
      playerRef.current.currentTime = startTime;
    }
  }, [startTime]);

  /**
   * Handle clicking on a cue or chapter to seek to that position
   */
  const handleTimeSelect = useCallback((time: number) => {
    const toTime = isNaN(time) ? 0.1 : parseFloat(time.toString());
    if (playerRef?.current) {
      playerRef.current.currentTime = toTime;
      playerRef.current.play();
    }
  }, []);

  // Playlist navigation logic
  const currentVideoIndex =
    playlist?.videos.findIndex((v) => v.id === video.id) ?? -1;
  const hasPreviousVideo = playlist && currentVideoIndex > 0;
  const hasNextVideo =
    playlist &&
    currentVideoIndex >= 0 &&
    currentVideoIndex < playlist.videos.length - 1;
  const previousVideo = hasPreviousVideo
    ? playlist.videos[currentVideoIndex - 1]
    : null;
  const nextVideo = hasNextVideo
    ? playlist.videos[currentVideoIndex + 1]
    : null;

  // Check if transcript is available
  useEffect(() => {
    setHasTranscript(
      !!video.transcript &&
        !!video.transcript.json &&
        !!video.transcript.json.url
    );
  }, [video]);

  return (
    <AIAssistantProvider onTimeClick={handleTimeSelect}>
      {/* Playlist Sidebar - Fixed Width */}
      {playlist && (
        <PlaylistSidebar
          playlist={playlist}
          currentVideoId={video.id}
          className="flex-shrink-0"
          isOpen={isOpen}
          onToggle={setIsOpen}
        />
      )}

      {/* Outer Content Wrapper - Fills remaining horizontal space */}
      <div
        className={cn("flex-1 flex flex-col min-h-0", playlist && "lg:ml-80")}
      >
        {/* Content Wrapper - Centered with max-width */}
        <div className="w-full mx-auto max-w-[1500px] px-4 md:px-14 flex flex-col h-full">
          {/* Video Player - Fixed aspect ratio */}
          <div className="w-full bg-black aspect-video relative">
            <Player
              video={video}
              autoPlay={true}
              ref={playerRef}
              startTime={startTime}
              className={className}
              isOutOfView={isOutOfView}
            />
          </div>

          {/* Content Div - Fills remaining vertical space */}
          <div className="flex flex-col flex-1 h-full overflow-hidden mt-6 min-h-[600px] pb-24 lg:pb-8">
            {/* Mobile Playlist Controls - Only visible on mobile when in playlist */}
            {playlist && (
              <div className="lg:hidden flex items-center justify-between mb-4">
                {/* Previous Button - Left Edge */}
                {hasPreviousVideo && previousVideo ? (
                  <Link
                    href={`/pl/${playlist.id}/v/${previousVideo.id}`}
                    className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
                    aria-label="Previous video"
                    title="Previous video"
                  >
                    <ChevronLeft size={24} />
                  </Link>
                ) : (
                  <div
                    className="p-2 rounded-md text-muted-foreground/30 cursor-not-allowed"
                    aria-label="Previous video"
                    title="No previous video"
                  >
                    <ChevronLeft size={24} />
                  </div>
                )}

                {/* Center: Counter + Autoplay Toggle */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentVideoIndex + 1} / {playlist.videos.length}
                  </span>
                  <AutoplayToggle />
                </div>

                {/* Next Button - Right Edge */}
                {hasNextVideo && nextVideo ? (
                  <Link
                    href={`/pl/${playlist.id}/v/${nextVideo.id}`}
                    className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
                    aria-label="Next video"
                    title="Next video"
                  >
                    <ChevronRight size={24} />
                  </Link>
                ) : (
                  <div
                    className="p-2 rounded-md text-muted-foreground/30 cursor-not-allowed"
                    aria-label="Next video"
                    title="No next video"
                  >
                    <ChevronRight size={24} />
                  </div>
                )}
              </div>
            )}

            {/* Title - Now full width on mobile */}
            <div className="mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold line-clamp-2 leading-tight">
                {video.title}
              </h1>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-base text-muted-foreground mb-4">
              <span>
                {video.published_at &&
                  formatRelative(new Date(video.published_at), new Date())}
              </span>
            </div>

            {/* Inner Content Wrapper - Horizontal Flex 70/30, fills remaining space */}
            <div className="flex flex-1 gap-6 min-h-0">
              {/* Main Content - 70% */}
              <div className="flex-[2] flex flex-col min-w-0">
                {/* Tab Nav - Fixed height */}
                <VideoContentTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  hasTranscript={hasTranscript}
                  hasChapters={hasChapters}
                  showAI={showAIAssistant}
                />

                {/* Tab Content - Fills remaining space */}
                <div className="flex-1 min-h-0">
                  {/* Description Tab */}
                  {activeTab === "description" && (
                    <div className="space-y-6 h-full overflow-y-auto">
                      <VideoDescription text={video.description || ""} />

                      {/* CTA */}
                      {video.cta && (
                        <div className="rounded-lg border border-border p-6 bg-card">
                          <h2 className="text-lg font-bold mb-2">
                            {video.cta.title}
                          </h2>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ ...props }) => (
                                <a
                                  {...props}
                                  className="text-primary hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              ),
                              p: ({ ...props }) => (
                                <p {...props} className="mb-4 last:mb-0" />
                              ),
                            }}
                          >
                            {video.cta.description}
                          </ReactMarkdown>
                          {video.cta.button_text && video.cta.button_url && (
                            <a
                              className="mt-4 inline-flex bg-foreground text-background rounded-md px-4 py-2 items-center justify-center hover:opacity-90 transition-opacity"
                              href={video.cta.button_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {video.cta.button_text}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript Tab */}
                  {activeTab === "transcript" && hasTranscript && (
                    <div className="h-full overflow-y-auto">
                      <Transcript
                        url={video.transcript?.json?.url || ""}
                        onCueClick={handleTimeSelect}
                        playerRef={playerRef}
                      />
                    </div>
                  )}

                  {/* Chapters Tab - Mobile only */}
                  {activeTab === "chapters" && hasChapters && (
                    <div className="h-full lg:hidden overflow-y-auto">
                      <MobileChapterTabs
                        chaptersWebVTT={video.chapters}
                        onChapterClick={handleTimeSelect}
                      />
                    </div>
                  )}

                  {/* Ask AI Tab */}
                  {activeTab === "ai" && showAIAssistant && (
                    <div className="h-full">
                      <AIAssistant
                        videoId={video.id}
                        name={settings?.ai_name || "AI Assistant"}
                        avatar={settings?.ai_avatar || "/default-avatar.png"}
                        greeting={settings?.ai_greeting}
                        subdomain={""}
                        isEmbedded={true}
                        className="h-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Chapters Sidebar - 30% */}
              <aside className="hidden lg:block flex-[1] min-w-0">
                <div className="sticky top-6 h-full overflow-y-auto">
                  {hasChapters ? (
                    <ChaptersSidebar
                      chaptersWebVTT={video.chapters || ""}
                      playbackId={video.playback_id}
                      onChapterClick={handleTimeSelect}
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No chapters available
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </AIAssistantProvider>
  );
}
