"use client";

import { Player } from "@/components/players";
import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Settings, Playlist } from "@boldvideo/bold-js";
import { AIAssistantProvider } from "../chat/context";
import { PlaylistSidebar } from "../navigation/playlist-sidebar";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { useVideoProgress } from "@/hooks/use-video-progress";
import type { ExtendedVideo } from "@/types/video-detail";
import { FixedSidebarLayout } from "@/components/layout/fixed-sidebar-layout";
import { VideoCompanionSidebar } from "../companion";
import { VideoMainContent } from "./video-main-content";
import { usePlaylistNavigation } from "@/hooks/use-playlist-navigation";
import { useScrollOutOfView } from "@/hooks/use-scroll-out-of-view";
import MobileContentShell from "../mobile/mobile-content-shell";
import { cn } from "@/lib/utils";

interface VideoDetailProps {
  video: ExtendedVideo;
  startTime?: number;
  className?: string;
  settings: Settings | null;
  playlist?: Playlist;
}

export function VideoDetail({
  video,
  startTime,
  className = "max-w-7xl",
  settings,
  playlist,
}: VideoDetailProps): React.JSX.Element {
  const router = useRouter();
  const playerRef = useRef<HTMLVideoElement | null>(null);

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

  // Scroll behavior
  const isOutOfView = useScrollOutOfView(0.7);

  // Player time control
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
  const {
    currentIndex: currentVideoIndex,
    hasPrevious: hasPreviousVideo,
    hasNext: hasNextVideo,
    previous: previousVideo,
    next: nextVideo,
  } = usePlaylistNavigation(playlist, video.id);

  const handleVideoEnded = useCallback(() => {
    if (isAutoplay && hasNextVideo && nextVideo && playlist) {
      router.push(`/pl/${playlist.id}/v/${nextVideo.id}`);
    }
  }, [isAutoplay, hasNextVideo, nextVideo, playlist, router]);

  return (
    <AIAssistantProvider onTimeClick={handleTimeSelect}>
      {/* Desktop Layout (>= lg) */}
      <div className="hidden lg:flex flex-1 flex-col min-h-0">
        <FixedSidebarLayout
          leftSidebar={
            playlist ? (
              <PlaylistSidebar
                playlist={playlist}
                currentVideoId={video.id}
                className="z-30"
                mode="collapse"
              />
            ) : undefined
          }
          rightSidebar={
            <VideoCompanionSidebar
              videoId={video.id}
              playbackId={video.playback_id}
              chaptersWebVTT={video.chapters || ""}
              aiName={settings?.ai_name || "AI Assistant"}
              aiAvatar={settings?.ai_avatar || "/default-avatar.png"}
              subdomain={""}
              greeting={settings?.ai_greeting}
              onChapterClick={handleTimeSelect}
              hasChapters={Boolean(video.chapters)}
              className="z-[35]"
            />
          }
          className={className}
        >
          <div className="w-full bg-black aspect-video relative lg:rounded-lg overflow-hidden shadow-lg z-20">
            <Player
              video={video as any}
              autoPlay={true}
              ref={playerRef}
              startTime={effectiveStartTime}
              className="w-full h-full"
              isOutOfView={isOutOfView}
              onEnded={handleVideoEnded}
            />
          </div>

          <VideoMainContent
            video={video}
            playlist={playlist}
            currentVideoIndex={currentVideoIndex}
            previousVideo={previousVideo}
            nextVideo={nextVideo}
            hasPreviousVideo={hasPreviousVideo}
            hasNextVideo={hasNextVideo}
            onTimeSelect={handleTimeSelect}
            playerRef={playerRef}
          />
        </FixedSidebarLayout>
      </div>

      {/* Mobile Layout (< lg) */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <div className="w-full bg-black aspect-video relative overflow-hidden shadow-lg">
          <Player
            video={video as any}
            autoPlay={true}
            ref={playerRef}
            startTime={effectiveStartTime}
            className="w-full h-full"
            isOutOfView={isOutOfView}
            onEnded={handleVideoEnded}
          />
        </div>

        <MobileContentShell
          video={video}
          playlist={playlist}
          playerRef={playerRef}
          onChapterClick={handleTimeSelect}
          onTimeSelect={handleTimeSelect}
          settings={settings}
        />
      </div>
    </AIAssistantProvider>
  );
}
