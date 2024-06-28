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

import { bold } from "client";
import { forwardRef, useEffect, Ref, useRef, useState } from "react";

export const Player = forwardRef(function Player(
  {
    video,
    autoPlay,
    onTimeUpdate,
    currentTime,
  }: {
    video: any;
    autoPlay?: boolean;
    onTimeUpdate?: (e: Event) => void;
    currentTime?: number;
  },
  ref,
) {
  // const [scrollTop, setScrollTop] = useState<number>(0);
  // const playerRef = useRef(null);
  const prevScrollY = useRef(0);
  const [isOutOfView, setIsOutOfView] = useState<boolean>(false);
  // useImperativeHandle(ref, () => playerRef.current);

  useEffect(() => {
    // bold.trackPageView(video.title);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > window.innerHeight * 0.7 && !isOutOfView) {
        setIsOutOfView(true);
      }
      if (currentScrollY < window.innerHeight * 0.7 && isOutOfView) {
        setIsOutOfView(false);
      }

      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOutOfView, video]);

  const handleTimeUpdate = (video: any, e: MediaTimeUpdateEventDetail) => {
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
            ? "fixed sm:bottom-0 sm:right-0 sm:top-auto top-0 w-full sm:w-1/2 lg:w-1/3 bg-black"
            : "w-full"
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
          ref={ref as Ref<MediaPlayerInstance>}
          playbackRate={video?.playback_speed || 1}
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
      </div>
    </>
  );
});
