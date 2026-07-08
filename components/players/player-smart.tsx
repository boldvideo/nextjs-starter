"use client";

import dynamic from "next/dynamic";
import { forwardRef, memo } from "react";
import type { MuxPlayerVideoLike } from "./player-mux";
import { extractYouTubeId, YouTubePlayerComponent } from "./player-youtube";

// Video.js v10 pulls in the skin + hls machinery — load it client-side only,
// and only when a native-playback video actually renders.
const VideoJsPlayer = dynamic(
  () =>
    import("./player-videojs").then((m) => m.VideoJsPlayerComponent),
  { ssr: false }
);

type SmartPlayerVideo = MuxPlayerVideoLike & {
  importedFrom?: string | null;
  playbackMode?: string | null;
  legacyVideoUrl?: string | null;
};

interface SmartPlayerProps {
  video: SmartPlayerVideo;
  autoPlay?: boolean;
  onTimeUpdate?: (e: Event) => void;
  currentTime?: number;
  startTime?: number;
  className?: string;
  isOutOfView?: boolean;
  onEnded?: (e: Event) => void;
}

/**
 * Routes playback by the video's configured mode:
 * - playback_mode flipped away from "native" on a YouTube import → real
 *   YouTube embed (views/watch time credit the channel)
 * - otherwise → Video.js v10 playing the Mux HLS stream
 */
const SmartPlayerBase = forwardRef(function SmartPlayer(
  { video, ...rest }: SmartPlayerProps,
  ref
) {
  const mode = video.playbackMode;
  const playFromSource =
    !!mode &&
    mode !== "native" &&
    mode !== "mux" &&
    video.importedFrom === "youtube" &&
    !!extractYouTubeId(video);

  if (playFromSource) {
    return <YouTubePlayerComponent ref={ref} video={video} {...rest} />;
  }
  return <VideoJsPlayer ref={ref} video={video} {...rest} />;
});

export const SmartPlayer = memo(SmartPlayerBase);
