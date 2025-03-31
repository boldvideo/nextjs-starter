"use client";
import {
  MediaPlayer,
  MediaPlayerInstance,
  MediaProvider,
  MediaTimeUpdateEventDetail,
  Poster,
  Track,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { bold } from "@/client";
import { forwardRef, useEffect, Ref, useRef, useState } from "react";
import type { Video } from "@boldvideo/bold-js";

/**
 * Extended Video type with additional properties used in our application
 */
interface ExtendedVideo extends Video {
  chapters_url?: string;
  playback_speed?: number;
}

/**
 * Interface for VidstackPlayer component props
 */
interface VidstackPlayerProps {
  /** The video object containing metadata and playback information */
  video: ExtendedVideo;
  /** Whether to autoplay the video when it loads */
  autoPlay?: boolean;
  /** Callback for time update events */
  onTimeUpdate?: (e: Event) => void;
  /** Current time in seconds to set the playback position */
  currentTime?: number;
  /** Start time in seconds to begin playback from */
  startTime?: number;
  /** Whether the player is out of view and should be shown as a floating player */
  isOutOfView?: boolean;
}

/**
 * Vidstack player component for video playback
 */
export const VidstackPlayer = forwardRef(function VidstackPlayer(
  {
    video,
    autoPlay,
    onTimeUpdate,
    currentTime,
    startTime,
    isOutOfView = false,
  }: VidstackPlayerProps,
  ref
) {
  const handleTimeUpdate = (
    video: ExtendedVideo,
    e: MediaTimeUpdateEventDetail
  ) => {
    bold.trackEvent(video, {
      target: { currentTime: e.currentTime },
      type: "timeupdate",
    } as unknown as Event);
    if (onTimeUpdate) onTimeUpdate(e as unknown as Event);
  };

  return (
    <>
      <div
        className={
          isOutOfView
            ? "fixed sm:bottom-4 sm:right-4 sm:top-auto top-0 w-full sm:w-1/3 lg:w-1/4 bg-black z-50 rounded-lg shadow-lg overflow-hidden"
            : "w-full h-full"
        }
      >
        <MediaPlayer
          title={video.title}
          src={`https://stream.mux.com/${video.playback_id}.m3u8`}
          className="w-full h-full"
          onTimeUpdate={(e) => handleTimeUpdate(video, e)}
          onPlay={(e) => bold.trackEvent(video, e)}
          onPause={(e) => bold.trackEvent(video, e)}
          onLoadedMetadata={(e) => bold.trackEvent(video, e)}
          playsInline
          storage={`bold-demo-${video.id}`}
          ref={ref as Ref<MediaPlayerInstance>}
          playbackRate={video.playback_speed || 1}
          currentTime={startTime}
          autoPlay={autoPlay}
        >
          <Poster
            className="vds-poster h-full overflow-hidden"
            src={video.thumbnail}
            alt={video.title}
            id="media-poster"
          ></Poster>
          <MediaProvider>
            {video.chapters_url && (
              <Track
                kind="chapters"
                id="track-chapters"
                src={video.chapters_url}
                lang="en-US"
                label="English"
                default
              />
            )}
          </MediaProvider>
          <DefaultVideoLayout
            thumbnails={`https://image.mux.com/${video.playback_id}/storyboard.vtt`}
            icons={defaultLayoutIcons}
          />
        </MediaPlayer>
        {isOutOfView && (
          <button
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 z-10 hover:bg-opacity-80"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Close floating player"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </>
  );
});
