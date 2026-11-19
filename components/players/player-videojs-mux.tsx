"use client";

import "@videojs/react/video/skin.css";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { VideoPlayer, VideoSkin } from "@videojs/react/video";
import { MuxVideo, type MuxVideoAdapter } from "@videojs/react/media/mux-video";
import { useBold } from "@/components/providers/bold-provider";
import type { SourceOpen } from "@/lib/source-engagement";
import type { MuxPlayerVideoLike } from "./player-mux";

interface VideoJsMuxPlayerProps {
  engagement?: SourceOpen;
  video: MuxPlayerVideoLike;
  autoPlay?: boolean;
  startTime?: number;
  currentTime?: number;
  className?: string;
  isOutOfView?: boolean;
  onTimeUpdate?: (e: Event) => void;
  onEnded?: (e: Event) => void;
}

/**
 * Bold-hosted playback on Video.js 10. The stream is the video's Mux HLS
 * rendition; the adapter adds the storyboard for timeline previews itself, and
 * a chapters track gives the timeline its segments. The forwarded ref is
 * media-element shaped (currentTime, paused, play, pause, events), so
 * transcript sync, seeks from citations and the mini player work unchanged.
 */
const VideoJsMuxPlayerBase = forwardRef(function VideoJsMuxPlayer(
  { video, engagement, autoPlay, startTime, currentTime, className = "", onTimeUpdate, onEnded }: VideoJsMuxPlayerProps,
  ref
) {
  const bold = useBold();
  const adapterRef = useRef<MuxVideoAdapter | null>(null);
  const pendingSeek = useRef<number>(Math.floor(startTime || currentTime || 0));
  const media = () => adapterRef.current as unknown as (HTMLVideoElement & EventTarget) | null;

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return media()?.currentTime ?? 0;
      },
      set currentTime(t: number) {
        const m = media();
        if (!m) {
          pendingSeek.current = t;
          return;
        }
        m.currentTime = t;
      },
      get readyState() {
        return media()?.readyState ?? 0;
      },
      get paused() {
        return media()?.paused ?? true;
      },
      get duration() {
        return media()?.duration ?? 0;
      },
      play: async () => media()?.play(),
      pause: () => media()?.pause(),
      addEventListener: (type: string, fn: EventListener) => media()?.addEventListener(type, fn),
      removeEventListener: (type: string, fn: EventListener) => media()?.removeEventListener(type, fn),
    }),
    []
  );

  const handleLoaded = useCallback(() => {
    const m = media();
    if (m && pendingSeek.current > 0) {
      m.currentTime = pendingSeek.current;
      pendingSeek.current = 0;
    }
  }, []);

  // A later seek request from the page (a citation click that re-renders with a new start).
  useEffect(() => {
    const m = media();
    if (!m || !startTime) return;
    if (m.readyState >= 1) m.currentTime = startTime;
    else pendingSeek.current = startTime;
  }, [startTime]);

  // Playback speed the library owner set as the default for this video.
  useEffect(() => {
    const m = media();
    if (m && video.playbackSpeed && video.playbackSpeed > 0) m.playbackRate = video.playbackSpeed;
  }, [video.playbackSpeed, video.id]);

  const track = (e: Event) => bold.trackEvent(video, e);

  if (!video.playbackId) return null;
  // A signed playback token carries its own parameters; public playback needs none.
  const src = `https://stream.mux.com/${video.playbackId}.m3u8${video.playbackToken ? `?token=${video.playbackToken}` : ""}`;

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <VideoPlayer>
        <VideoSkin
          className="w-full h-full"
          style={
            {
              "--media-accent-color": "var(--accent)",
              "--media-border-radius": "0",
              "--media-font-family": "var(--font-body)",
            } as CSSProperties
          }
        >
          <MuxVideo
            src={src}
            mediaRef={adapterRef}
            poster={video.thumbnail}
            autoPlay={autoPlay}
            playsInline
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              handleLoaded();
              track(e.nativeEvent);
            }}
            onTimeUpdate={(e) => {
              const t = (e.target as HTMLVideoElement).currentTime;
              bold.trackEvent(video, { target: { currentTime: t }, type: "timeupdate" } as unknown as Event);
              onTimeUpdate?.(e.nativeEvent);
            }}
            onPlay={(e) => track(e.nativeEvent)}
            onPlaying={() => engagement?.play()}
            onWaiting={() => engagement?.pause()}
            onPause={(e) => {
              engagement?.pause();
              track(e.nativeEvent);
            }}
            onEnded={(e) => {
              engagement?.pause();
              track(e.nativeEvent);
              onEnded?.(e.nativeEvent);
            }}
          >
            {video.chaptersUrl && <track kind="chapters" src={video.chaptersUrl} default />}
          </MuxVideo>
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
});

export const VideoJsMuxPlayer = memo(
  VideoJsMuxPlayerBase,
  (prev, next) =>
    prev.video.id === next.video.id &&
    prev.video.chaptersUrl === next.video.chaptersUrl &&
    prev.startTime === next.startTime &&
    prev.autoPlay === next.autoPlay &&
    prev.currentTime === next.currentTime &&
    prev.onEnded === next.onEnded &&
    prev.onTimeUpdate === next.onTimeUpdate
);
