"use client";

import { Player } from "@/components/players";
import { useRef, useEffect, useCallback, useState } from "react";
import { AnswerInteraction, SourceOpen } from "@/lib/source-engagement";
import { useSourceNavigation } from "@/hooks/use-source-navigation";
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
import { Breadcrumb } from "@/components/providers/breadcrumb-provider";
import { getPortalConfig } from "@/lib/portal-config";
import { isVideoVoiceEnabled, videoQuery } from "@/lib/video-voice";
import { VideoVoiceProvider } from "@/components/video/chat/voice-provider";

interface VideoDetailProps {
  video: ExtendedVideo;
  startTime?: number;
  className?: string;
  settings: Settings | null;
  playlist?: Playlist;
  voicePreview?: string | string[];
}

export function VideoDetail({
  video,
  startTime,
  className = "max-w-5xl",
  settings,
  playlist,
  voicePreview,
}: VideoDetailProps): React.JSX.Element {
  const router = useRouter();
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const navigationOpen = useSourceNavigation(video.id);
  const [chatOpen, setChatOpen] = useState<{ open: SourceOpen; navigation: SourceOpen | undefined }>();

  // Single source of truth for AI name/avatar/greeting (account.ai settings)
  const aiConfig = getPortalConfig(settings).ai;

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

  const handleSourceTimeSelect = useCallback((time: number, interaction?: AnswerInteraction) => {
    setChatOpen({ open: new SourceOpen(video.id, interaction ?? new AnswerInteraction(null)), navigation: navigationOpen });
    handleTimeSelect(time);
  }, [video.id, handleTimeSelect, navigationOpen]);

  const {
    hasNext: hasNextVideo,
    next: nextVideo,
  } = usePlaylistNavigation(playlist, video.id);

  const handleVideoEnded = useCallback(() => {
    if (isAutoplay && hasNextVideo && nextVideo && playlist) {
      router.push(`${buildVideoUrl(nextVideo, { playlistId: playlist.id })}${videoQuery({ voice: voicePreview })}`);
    }
  }, [isAutoplay, hasNextVideo, nextVideo, playlist, router, voicePreview]);

  return (
    <AIAssistantProvider key={video.id} onTimeClick={handleSourceTimeSelect}>
      <VideoVoiceProvider
        videoId={video.id}
        playerRef={playerRef}
        enabled={isVideoVoiceEnabled(aiConfig.enabled, aiConfig.voiceEnabled, voicePreview)}
      >
        <Breadcrumb label={video.title} />
        <VideoDetailLayout
          hasPlaylist={!!playlist}
          className={className}
          player={
            <Player
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExtendedVideo type compatibility with Player component
              video={video as any}
              autoPlay={true}
              ref={playerRef}
              engagement={chatOpen?.open.videoId === video.id && chatOpen.navigation === navigationOpen ? chatOpen.open : navigationOpen}
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
                voicePreview={voicePreview}
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
              aiName={aiConfig.name}
              aiAvatar={aiConfig.avatar || "/default-avatar.png"}
              subdomain={""}
              greeting={aiConfig.greeting}
              onChapterClick={handleTimeSelect}
              hasChapters={Boolean(video.chapters)}
              transcriptUrl={video.transcript?.json?.url}
              playerRef={playerRef}
              className="z-[35]"
            />
          }
          playlistPanel={
            playlist ? (
              <PlaylistTab playlist={playlist} currentVideoId={video.id} voicePreview={voicePreview} />
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
      </VideoVoiceProvider>
    </AIAssistantProvider>
  );
}
