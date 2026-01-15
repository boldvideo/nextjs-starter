"use client";

import { Player } from "@/components/players";
import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { Settings, Playlist } from "@boldvideo/bold-js";
import { AIAssistantProvider } from "../chat/context";
import { PlaylistSidebar } from "../navigation/playlist-sidebar";
import { usePlaylist } from "@/components/providers/playlist-provider";
import { useVideoProgress } from "@/hooks/use-video-progress";
import type { ExtendedVideo } from "@/types/video-detail";
import { VideoCompanionSidebar } from "../companion";
import { VideoMainContent } from "./video-main-content";
import { VideoDetailLayout } from "./video-detail-layout";
import { usePlaylistNavigation } from "@/hooks/use-playlist-navigation";
import { useScrollOutOfView } from "@/hooks/use-scroll-out-of-view";
import { formatDuration } from "@/util/format-duration";

import PlaylistTab from "../mobile/playlist-tab";
import ChaptersTab from "../mobile/chapters-tab";
import ChatTab from "../mobile/chat-tab";
import InfoTab from "../mobile/info-tab";
import { buildVideoUrl } from "@/lib/video-path";
import { MobileVideoMeta } from "./mobile-video-meta";

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
  className = "max-w-5xl",
  settings,
  playlist,
}: VideoDetailProps): React.JSX.Element {
  const router = useRouter();
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const { setHasPlaylist, isAutoplay } = usePlaylist();

  useEffect(() => {
    setHasPlaylist(!!playlist);
    return () => setHasPlaylist(false);
  }, [playlist, setHasPlaylist]);

  const { resumePosition } = useVideoProgress({
    videoId: video.id,
    duration: video.duration,
    playerRef,
  });

  const effectiveStartTime = startTime || resumePosition || undefined;

  const isOutOfView = useScrollOutOfView(0.7);

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

  const {
    hasNext: hasNextVideo,
    next: nextVideo,
  } = usePlaylistNavigation(playlist, video.id);

  const handleVideoEnded = useCallback(() => {
    if (isAutoplay && hasNextVideo && nextVideo && playlist) {
      router.push(buildVideoUrl(nextVideo, { playlistId: playlist.id }));
    }
  }, [isAutoplay, hasNextVideo, nextVideo, playlist, router]);

  return (
    <AIAssistantProvider onTimeClick={handleTimeSelect}>
      <VideoDetailLayout
        hasPlaylist={!!playlist}
        className={className}
        player={
          <Player
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExtendedVideo type compatibility with Player component
            video={video as any}
            autoPlay={true}
            ref={playerRef}
            startTime={effectiveStartTime}
            className="w-full h-full"
            isOutOfView={isOutOfView}
            onEnded={handleVideoEnded}
          />
        }
        videoMeta={
          <MobileVideoMeta
            title={video.title}
            publishedAt={
              video.publishedAt
                ? format(new Date(video.publishedAt), "MMM d, yyyy")
                : null
            }
            durationLabel={video.duration ? formatDuration(video.duration) : null}
          />
        }
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
            playbackId={video.playbackId}
            chaptersWebVTT={video.chapters || ""}
            aiName={settings?.aiName || "AI Assistant"}
            aiAvatar={settings?.aiAvatar || "/default-avatar.png"}
            subdomain={""}
            greeting={settings?.aiGreeting}
            onChapterClick={handleTimeSelect}
            hasChapters={Boolean(video.chapters)}
            className="z-[35]"
          />
        }
        playlistPanel={
          playlist ? (
            <PlaylistTab playlist={playlist} currentVideoId={video.id} />
          ) : undefined
        }
        infoPanel={
          <VideoMainContent
            video={video}
            onTimeSelect={handleTimeSelect}
            playerRef={playerRef}
          />
        }
        mobileInfoPanel={
          <InfoTab
            video={video}
            onTimeSelect={handleTimeSelect}
            playerRef={playerRef}
          />
        }
        chaptersPanel={
          <ChaptersTab
            chaptersWebVTT={video.chapters || ""}
            playbackId={video.playbackId}
            onChapterClick={handleTimeSelect}
          />
        }
        chatPanel={<ChatTab video={video} settings={settings} />}
      />
    </AIAssistantProvider>
  );
}
