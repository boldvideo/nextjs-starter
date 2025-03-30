"use client";
import dynamic from "next/dynamic";
import { bold } from "@/client";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { Video } from "@boldvideo/bold-js";

// Import MuxPlayer with SSR disabled to prevent hydration errors
const MuxPlayer = dynamic(
  () => import("@mux/mux-player-react").then((mod) => mod.default),
  { ssr: false }
);

// Define a type for the Mux Player Element since it's not exported directly
type MuxPlayerRefElement = {
  currentTime: number;
  readyState: number;
  play: () => Promise<void>;
  addChapters?: (chapters: Array<{ startTime: number; value: string }>) => void;
  addEventListener: HTMLVideoElement["addEventListener"];
  removeEventListener: HTMLVideoElement["removeEventListener"];
};

/**
 * Extended Video type with additional properties used in our application
 */
interface ExtendedVideo extends Video {
  chapters_url?: string;
  playback_speed?: number;
}

/**
 * Convert timestamp strings to seconds
 * @param timestamp Timestamp string (e.g., "00:15", "00:00:15", "15")
 * @returns Number of seconds
 */
const timestampToSeconds = (timestamp: string): number => {
  // Handle different format possibilities:
  // 00:15 (mm:ss)
  // 00:00:15 (hh:mm:ss)
  const parts = timestamp
    .trim()
    .split(":")
    .map((part) => parseInt(part, 10));

  if (parts.length === 3) {
    // hh:mm:ss format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // mm:ss format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // seconds only
    return parts[0];
  }

  return 0;
};

/**
 * Interface for MuxPlayer component props
 */
interface MuxPlayerComponentProps {
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
}

/**
 * MuxPlayer component for video playback using Mux's player
 */
export const MuxPlayerComponent = forwardRef(function MuxPlayerComponent(
  {
    video,
    autoPlay,
    onTimeUpdate,
    currentTime,
    startTime,
  }: MuxPlayerComponentProps,
  ref
) {
  const prevScrollY = useRef(0);
  const [isOutOfView, setIsOutOfView] = useState<boolean>(false);
  const playerRef = useRef<MuxPlayerRefElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  // Get the primary color from CSS variables
  useEffect(() => {
    // Get the primary color from CSS variable if document is available (client-side)
    if (typeof window !== "undefined") {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      setPrimaryColor(color);
    }
  }, []);

  // Handle scroll behavior for floating player
  useEffect(() => {
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

  // Handle chapters if they exist
  useEffect(() => {
    // Early return if player is not available or chapters URL doesn't exist
    if (!playerRef.current || !video.chapters_url) return;

    const chaptersUrl = video.chapters_url;

    const loadChapters = async () => {
      try {
        const response = await fetch(chaptersUrl);
        const chaptersText = await response.text();

        if (!chaptersText.includes("WEBVTT")) {
          console.warn("Invalid WEBVTT format");
          return;
        }

        // Parse the WEBVTT file for chapters
        const lines = chaptersText.split("\n\n").slice(1); // Skip the WEBVTT header
        if (lines.length === 0) {
          console.warn("No chapters found in WEBVTT file");
          return;
        }

        const chapters = lines
          .map((block) => {
            // Split the block into lines
            const blockLines = block.split("\n");
            if (blockLines.length < 2) return null;

            // Some WEBVTT files might have an identifier first, so we need to find the time range line
            let timeRangeLine = "";
            let titleLine = "";

            for (const line of blockLines) {
              if (line.includes("-->")) {
                timeRangeLine = line;
              } else if (line.trim() && !timeRangeLine) {
                // This is likely an identifier, skip it
                continue;
              } else if (line.trim() && timeRangeLine) {
                // Found a title after the time range
                titleLine = line;
                break;
              }
            }

            if (!timeRangeLine || !titleLine) return null;

            // Extract start time from the time range
            const [startTimeStr] = timeRangeLine
              .split("-->")
              .map((t) => t.trim());

            return {
              startTime: timestampToSeconds(startTimeStr),
              value: titleLine.trim(),
            };
          })
          .filter(
            (chapter): chapter is { startTime: number; value: string } =>
              chapter !== null
          );

        if (chapters.length === 0) {
          console.warn("Failed to parse chapters from WEBVTT file");
          return;
        }

        // Add chapters to the player once it's ready
        const addChaptersToPlayer = () => {
          const player = playerRef.current;
          if (player && typeof player.addChapters === "function") {
            player.addChapters(chapters);
          } else {
            console.error("Player doesn't support chapter addition");
          }
        };

        // Check if the player is ready to receive chapters
        const player = playerRef.current;
        if (player && player.readyState >= 1) {
          addChaptersToPlayer();
        } else if (player) {
          player.addEventListener("loadedmetadata", addChaptersToPlayer, {
            once: true,
          });
        }
      } catch (error) {
        console.error("Error loading chapters:", error);
      }
    };

    // Load chapters when the component mounts or the chapter URL changes
    loadChapters();
  }, [video.chapters_url]);

  // Handle initial time when the player loads
  useEffect(() => {
    if (startTime && playerRef.current) {
      const setInitialTime = () => {
        const player = playerRef.current;
        if (player) {
          player.currentTime = startTime;
        }
      };

      const player = playerRef.current;
      if (player && player.readyState >= 1) {
        setInitialTime();
      } else if (player) {
        player.addEventListener("loadedmetadata", setInitialTime, {
          once: true,
        });
      }
    }
  }, [startTime]);

  const handleTimeUpdate = (e: Event) => {
    const target = e.target as HTMLVideoElement;
    bold.trackEvent(video, {
      target: { currentTime: target.currentTime },
      type: "timeupdate",
    } as unknown as Event);
    if (onTimeUpdate) onTimeUpdate(e);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`
          ${
            isOutOfView
              ? "fixed sm:bottom-4 sm:right-4 sm:top-auto top-0 w-full sm:w-1/3 lg:w-1/4 bg-black z-50 rounded-lg shadow-lg overflow-hidden"
              : "w-full h-full"
          }
          aspect-video bg-gray-900 relative
        `}
        style={{
          // Make sure mini player has proper interactions
          pointerEvents: isOutOfView ? "auto" : "inherit",
        }}
      >
        {video.thumbnail && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${video.thumbnail})` }}
            aria-hidden="true"
          />
        )}

        <MuxPlayer
          ref={(el) => {
            playerRef.current = el;
            // Handle forwarded ref
            if (typeof ref === "function") {
              ref(el);
            } else if (ref) {
              (ref as React.MutableRefObject<any>).current = el;
            }
          }}
          playbackId={video.playback_id}
          metadata={{
            video_id: video.id,
            video_title: video.title,
          }}
          streamType="on-demand"
          title={video.title}
          poster={video.thumbnail}
          autoPlay={autoPlay}
          thumbnailTime={startTime || 0}
          className="w-full h-full max-w-7xl relative z-10"
          onTimeUpdate={handleTimeUpdate}
          onPlay={(e) => bold.trackEvent(video, e)}
          onPause={(e) => bold.trackEvent(video, e)}
          onLoadedMetadata={(e) => bold.trackEvent(video, e)}
          playsInline
          currentTime={startTime || currentTime}
          playbackRate={video.playback_speed || 1}
          storyboardSrc={`https://image.mux.com/${video.playback_id}/storyboard.vtt`}
          defaultHiddenCaptions={false}
          accentColor={primaryColor || undefined}
        />

        {isOutOfView && (
          <button
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 z-20 hover:bg-opacity-80"
            onClick={() => setIsOutOfView(false)}
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
