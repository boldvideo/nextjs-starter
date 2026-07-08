"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { MuxPlayerVideoLike } from "./player-mux";

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract the YouTube video id for a Bold video imported from YouTube.
 * Prefers an explicit legacy/source URL; falls back to the import path that
 * Bold uses for thumbnails (/imports/{tenant}/{youtubeId}/…).
 */
export function extractYouTubeId(video: {
  legacyVideoUrl?: string | null;
  thumbnail?: string;
}): string | null {
  const fromUrl = video.legacyVideoUrl;
  if (fromUrl) {
    try {
      const u = new URL(fromUrl);
      let id: string | null = null;
      if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      else if (u.hostname.endsWith("youtube.com")) {
        if (u.pathname === "/watch") id = u.searchParams.get("v");
        else if (u.pathname.startsWith("/embed/")) id = u.pathname.slice(7);
        else if (u.pathname.startsWith("/shorts/")) id = u.pathname.slice(8);
      }
      if (id && YT_ID_RE.test(id)) return id;
    } catch {
      // fall through to the import-path heuristic
    }
  }
  const m = video.thumbnail?.match(/\/imports\/[^/]+\/([A-Za-z0-9_-]{11})\//);
  return m ? m[1] : null;
}

interface YouTubePlayerProps {
  video: MuxPlayerVideoLike & { legacyVideoUrl?: string | null };
  autoPlay?: boolean;
  startTime?: number;
  currentTime?: number;
  className?: string;
  isOutOfView?: boolean;
  onTimeUpdate?: (e: Event) => void;
  onEnded?: (e: Event) => void;
}

/**
 * Play-from-source player: a real YouTube embed, so views and watch time
 * accrue to the channel. The forwarded ref implements the same imperative
 * surface consumers use on a video element (currentTime setter, play/pause),
 * bridged over the YouTube IFrame postMessage API — chapter and transcript
 * clicks still seek.
 */
const YouTubePlayerBase = forwardRef(function YouTubePlayer(
  {
    video,
    autoPlay,
    startTime,
    currentTime,
    className = "",
    onEnded,
  }: YouTubePlayerProps,
  ref
) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const post = useCallback((func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }, []);

  // Video-element-shaped shim so transcript/chapter seeks keep working
  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return 0;
      },
      set currentTime(t: number) {
        post("seekTo", [Math.floor(t), true]);
        post("playVideo");
      },
      readyState: 4,
      play: async () => post("playVideo"),
      pause: () => post("pauseVideo"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    [post]
  );

  // Widget-API handshake for onStateChange → ended (autoplay-next parity)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.endsWith("youtube.com")) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange" && data.info === 0) {
          onEndedRef.current?.(new Event("ended"));
        }
      } catch {
        // non-JSON frames are fine to ignore
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handleFrameLoad = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      "*"
    );
    post("addEventListener", ["onStateChange"]);
  }, [post]);

  const id = extractYouTubeId(video);
  if (!id) return null;

  const start = Math.floor(startTime || currentTime || 0);
  const src =
    origin &&
    `https://www.youtube.com/embed/${encodeURIComponent(id)}` +
      `?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1` +
      (start ? `&start=${start}` : "") +
      `&origin=${encodeURIComponent(origin)}`;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center bg-black ${className}`}
    >
      {src && (
        <iframe
          ref={frameRef}
          src={src}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleFrameLoad}
        />
      )}
    </div>
  );
});

export const YouTubePlayerComponent = memo(
  YouTubePlayerBase,
  (prev, next) =>
    prev.video.id === next.video.id &&
    prev.startTime === next.startTime &&
    prev.autoPlay === next.autoPlay &&
    prev.currentTime === next.currentTime &&
    prev.onEnded === next.onEnded
);
