"use client";

import "@videojs/react/video/skin.css";
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { VideoPlayer, VideoSkin } from "@videojs/react/video";
import { YouTubeVideo, type YouTubeAdapter } from "@videojs/react/media/youtube-video";
import type { MuxPlayerVideoLike } from "./player-mux";
import { extractYouTubeId } from "./player-youtube";

interface VideoJsYouTubePlayerProps {
  video: MuxPlayerVideoLike & {
    legacyVideoUrl?: string | null;
    chaptersUrl?: string;
  };
  autoPlay?: boolean;
  startTime?: number;
  currentTime?: number;
  className?: string;
  isOutOfView?: boolean;
  onTimeUpdate?: (e: Event) => void;
  onEnded?: (e: Event) => void;
}

/**
 * Play-from-source on Video.js 10: the video still streams from YouTube (views
 * and watch time credit the channel), but the controls, timeline and chapter
 * segments are ours. The adapter is media-element shaped, so the forwarded ref
 * and timeupdate events behave like a <video> for transcript sync and seeks.
 */
const VideoJsYouTubePlayerBase = forwardRef(function VideoJsYouTubePlayer(
  {
    video,
    autoPlay,
    startTime,
    currentTime,
    className = "",
    onTimeUpdate,
    onEnded,
  }: VideoJsYouTubePlayerProps,
  ref
) {
  const adapterRef = useRef<YouTubeAdapter | null>(null);
  const pendingSeek = useRef<number>(Math.floor(startTime || currentTime || 0));

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return adapterRef.current?.currentTime ?? 0;
      },
      set currentTime(t: number) {
        const a = adapterRef.current;
        if (!a) {
          pendingSeek.current = t;
          return;
        }
        a.currentTime = t;
        void a.play().catch(() => {});
      },
      get readyState() {
        return 4;
      },
      get paused() {
        return adapterRef.current?.paused ?? true;
      },
      play: async () => adapterRef.current?.play(),
      pause: () => adapterRef.current?.pause(),
      addEventListener: (type: string, fn: EventListener) =>
        (adapterRef.current as unknown as EventTarget | null)?.addEventListener(type, fn),
      removeEventListener: (type: string, fn: EventListener) =>
        (adapterRef.current as unknown as EventTarget | null)?.removeEventListener(type, fn),
    }),
    []
  );

  const handleLoaded = useCallback(() => {
    const a = adapterRef.current;
    if (a && pendingSeek.current > 0) {
      a.currentTime = pendingSeek.current;
      pendingSeek.current = 0;
    }
  }, []);

  const id = extractYouTubeId(video);
  if (!id) return null;

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <VideoPlayer>
        <VideoSkin
          className="w-full h-full"
          style={
            {
              "--media-accent-color": "var(--accent, #577544)",
              "--media-border-radius": "0",
              "--media-font-family": "var(--font-body)",
            } as CSSProperties
          }
        >
          <YouTubeVideo
            src={`https://www.youtube.com/watch?v=${id}`}
            mediaRef={adapterRef}
            poster={video.thumbnail}
            autoPlay={autoPlay}
            playsInline
            onLoadedMetadata={handleLoaded}
            onTimeUpdate={onTimeUpdate as never}
            onEnded={onEnded as never}
          >
            {video.chaptersUrl && (
              <track kind="chapters" src={video.chaptersUrl} default />
            )}
          </YouTubeVideo>
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
});

export const VideoJsYouTubePlayer = memo(
  VideoJsYouTubePlayerBase,
  (prev, next) =>
    prev.video.id === next.video.id &&
    prev.startTime === next.startTime &&
    prev.autoPlay === next.autoPlay &&
    prev.currentTime === next.currentTime &&
    prev.onEnded === next.onEnded &&
    prev.onTimeUpdate === next.onTimeUpdate
);
