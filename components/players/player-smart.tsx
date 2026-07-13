"use client";

import { forwardRef, memo } from "react";
import { MuxPlayerComponent } from "./player-mux";
import type { MuxPlayerVideoLike } from "./player-mux";
import { extractYouTubeId, YouTubePlayerComponent } from "./player-youtube";

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
 * - otherwise → the Mux player
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
  return <MuxPlayerComponent ref={ref} video={video} {...rest} />;
});

export const SmartPlayer = memo(SmartPlayerBase);
