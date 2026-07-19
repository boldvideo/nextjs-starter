"use client";

import "@videojs/react/video/skin.css";
import { forwardRef, memo, useCallback, useRef } from "react";
import { createPlayer } from "@videojs/react";
import { VideoSkin, videoFeatures } from "@videojs/react/video";
import { MuxVideo } from "@videojs/react/media/mux-video";
import { useBold } from "@/components/providers/bold-provider";
import type { MuxPlayerVideoLike } from "./player-mux";

// Video.js v10 (beta) — the rebuilt player. One player instance type for the
// whole module; Provider scopes state per mounted player.
const VjsPlayer = createPlayer({ features: videoFeatures });

interface VideoJsPlayerProps {
  video: MuxPlayerVideoLike;
  autoPlay?: boolean;
  onTimeUpdate?: (e: Event) => void;
  currentTime?: number;
  startTime?: number;
  className?: string;
  isOutOfView?: boolean;
  onEnded?: (e: Event) => void;
}

/**
 * Video.js v10 player for Mux-hosted HLS. Exposes the underlying
 * HTMLVideoElement through the forwarded ref, so all existing consumers
 * (transcript sync, progress tracking, chapter seeks) keep working.
 */
const VideoJsPlayerBase = forwardRef(function VideoJsPlayer(
  {
    video,
    autoPlay,
    onTimeUpdate,
    currentTime,
    startTime,
    className = "",
    onEnded,
  }: VideoJsPlayerProps,
  ref
) {
  const bold = useBold();
  const mediaRef = useRef<HTMLVideoElement | null>(null);

  const attachMedia = useCallback(
    (el: HTMLVideoElement | null) => {
      mediaRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    },
    [ref]
  );

  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      bold.trackEvent(video, e.nativeEvent);
      const initial = startTime || currentTime;
      if (initial && mediaRef.current) {
        mediaRef.current.currentTime = initial;
      }
      if (video.playbackSpeed && mediaRef.current) {
        mediaRef.current.playbackRate = video.playbackSpeed;
      }
      // The autoplay attribute alone races source attach and gets ignored —
      // kick playback explicitly once metadata (and the seek above) landed.
      // If audible playback is blocked (no trusted gesture yet), fall back
      // to muted so the moment still rolls.
      if (autoPlay && mediaRef.current) {
        const el = mediaRef.current;
        el.play().catch(() => {
          el.muted = true;
          el.play().catch(() => {});
        });
      }
    },
    [bold, video, startTime, currentTime, autoPlay]
  );

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
    >
      <VjsPlayer.Provider>
        <VideoSkin poster={video.thumbnail} className="w-full h-full">
          <MuxVideo
            ref={attachMedia}
            src={`https://stream.mux.com/${video.playbackId}.m3u8`}
            autoPlay={autoPlay}
            playsInline
            crossOrigin="anonymous"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={(e) => {
              bold.trackEvent(video, e.nativeEvent);
              onTimeUpdate?.(e.nativeEvent);
            }}
            onPlay={(e) => bold.trackEvent(video, e.nativeEvent)}
            onPause={(e) => bold.trackEvent(video, e.nativeEvent)}
            onEnded={(e) => {
              bold.trackEvent(video, e.nativeEvent);
              onEnded?.(e.nativeEvent);
            }}
          />
        </VideoSkin>
      </VjsPlayer.Provider>
    </div>
  );
});

export const VideoJsPlayerComponent = memo(
  VideoJsPlayerBase,
  (prev, next) =>
    prev.video.playbackId === next.video.playbackId &&
    prev.video.id === next.video.id &&
    prev.startTime === next.startTime &&
    prev.autoPlay === next.autoPlay &&
    prev.currentTime === next.currentTime &&
    prev.onEnded === next.onEnded
);
