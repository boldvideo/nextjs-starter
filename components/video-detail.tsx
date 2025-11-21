"use client";

import { formatRelative } from "date-fns";
import { Player } from "@/components/players";
import { Transcript } from "@/components/transcript";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Video, Settings, Playlist } from "@boldvideo/bold-js";
import { VideoDescription } from "./video-description";
import { VideoContentTabs } from "./video-content-tabs";
import { AIAssistantProvider } from "./ui/ai-assistant/context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PlaylistSidebar } from "./playlist-sidebar";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AutoplayToggle } from "./autoplay-toggle";
import { useVideoProgress } from "@/hooks/use-video-progress";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { SidebarToggle } from "@/components/ui/sidebar";

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

  // Sidebar state for layout
  const { left, right, isMobile } = useSidebar();

  // Playlist state
  const { setHasPlaylist, isAutoplay } = usePlaylist();

  // Update playlist availability
  useEffect(() => {
    setHasPlaylist(!!playlist);
    return () => setHasPlaylist(false);
  }, [playlist, setHasPlaylist]);

  // Progress tracking
  const { resumePosition } = useVideoProgress({
    videoId: video.id,
    duration: video.duration,
    playerRef,
  });

  const effectiveStartTime = startTime || resumePosition || undefined;

  // Main Content Tab State (Description / Transcript)
  const [activeMainTab, setActiveMainTab] = useState<
    "description" | "transcript"
  >("description");

  // Check if the video has chapters
  const hasChapters = Boolean(video.chapters);

  // Scroll behavior
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

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (effectiveStartTime && playerRef.current) {
      playerRef.current.currentTime = effectiveStartTime;
    }
  }, [effectiveStartTime]);

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

  useEffect(() => {
    setHasTranscript(
      !!video.transcript &&
        !!video.transcript.json &&
        !!video.transcript.json.url
    );
  }, [video]);

  const handleVideoEnded = useCallback(() => {
    if (isAutoplay && hasNextVideo && nextVideo && playlist) {
      router.push(`/pl/${playlist.id}/v/${nextVideo.id}`);
    }
  }, [isAutoplay, hasNextVideo, nextVideo, playlist, router]);

  return (
    <AIAssistantProvider onTimeClick={handleTimeSelect}>
      {/* 3-Column Fixed Layout */}
      <div className="min-h-full relative">
        {/* Left Sidebar: Playlist (Fixed) */}
        {playlist && (
          <PlaylistSidebar
            playlist={playlist}
            currentVideoId={video.id}
            className="z-30"
            mode="collapse"
          />
        )}

        {/* Main Content Area (Scrolls naturally) */}
        <div
          className="flex-1 min-w-0 transition-all duration-300 ease-in-out w-full pt-5"
          style={{
            paddingLeft: playlist ? "calc(var(--sidebar-left-width) + 20px)" : "20px",
            paddingRight: "calc(var(--sidebar-right-width) + 20px)",
          }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Video Player */}
            <div className="w-full bg-black aspect-video relative rounded-lg overflow-hidden shadow-lg">
              <Player
                video={video}
                autoPlay={true}
                ref={playerRef}
                startTime={effectiveStartTime}
                className={className}
                isOutOfView={isOutOfView}
                onEnded={handleVideoEnded}
              />
            </div>

            {/* Content below player */}
            <div className="w-full mx-auto flex flex-col">
              <div className="flex flex-col flex-1 mt-6 min-h-[600px] pb-24 lg:pb-8">
                {/* Mobile Playlist Controls */}
                {playlist && (
                  <div className="lg:hidden flex items-center justify-between mb-4">
                    {/* Previous */}
                    <div className="lg:hidden">
                      {/* Mobile Toggle */}
                      <SidebarToggle
                        side="left"
                        mode="toggle"
                        className="mr-2"
                      />
                    </div>

                    {hasPreviousVideo && previousVideo ? (
                      <Link
                        href={`/pl/${playlist.id}/v/${previousVideo.id}`}
                        className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
                      >
                        <ChevronLeft size={24} />
                      </Link>
                    ) : (
                      <div className="p-2 rounded-md text-muted-foreground/30">
                        <ChevronLeft size={24} />
                      </div>
                    )}

                    {/* Counter */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted-foreground">
                        {currentVideoIndex + 1} / {playlist.videos.length}
                      </span>
                      <AutoplayToggle />
                    </div>

                    {/* Next */}
                    {hasNextVideo && nextVideo ? (
                      <Link
                        href={`/pl/${playlist.id}/v/${nextVideo.id}`}
                        className="p-2 rounded-md transition-colors text-foreground hover:bg-accent"
                      >
                        <ChevronRight size={24} />
                      </Link>
                    ) : (
                      <div className="p-2 rounded-md text-muted-foreground/30">
                        <ChevronRight size={24} />
                      </div>
                    )}
                  </div>
                )}

                {/* Title & Metadata */}
                <div className="mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold line-clamp-2 leading-tight">
                    {video.title}
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-base text-muted-foreground mb-6">
                  <span>
                    {video.published_at &&
                      formatRelative(new Date(video.published_at), new Date())}
                  </span>
                </div>

                {/* Main Tabs Navigation */}
                <div className="flex items-center border-b border-border mb-6">
                  <button
                    onClick={() => setActiveMainTab("description")}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      activeMainTab === "description"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Description
                  </button>
                  {hasTranscript && (
                    <button
                      onClick={() => setActiveMainTab("transcript")}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeMainTab === "transcript"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Transcript
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0">
                  {activeMainTab === "description" && (
                    <div className="space-y-6">
                      <VideoDescription text={video.description || ""} />
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

                  {activeMainTab === "transcript" && hasTranscript && (
                    <div className="h-[600px] border rounded-md overflow-hidden">
                      <Transcript
                        url={video.transcript?.json?.url || ""}
                        onCueClick={handleTimeSelect}
                        playerRef={playerRef}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Chat & Chapters */}
        <VideoContentTabs
          videoId={video.id}
          playbackId={video.playback_id}
          chaptersWebVTT={video.chapters || ""}
          aiName={settings?.ai_name || "AI Assistant"}
          aiAvatar={settings?.ai_avatar || "/default-avatar.png"}
          subdomain={""}
          greeting={settings?.ai_greeting}
          onChapterClick={handleTimeSelect}
          hasChapters={hasChapters}
          className="z-30 z-[40]"
        />
      </div>
    </AIAssistantProvider>
  );
}
