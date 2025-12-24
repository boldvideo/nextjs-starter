"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useRef, useState, memo } from "react";
import { useBold } from "@/components/providers/bold-provider";

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

// Cache for parsed chapters to avoid repeatedly parsing the same file
const chaptersCache = new Map<
  string,
  Array<{ startTime: number; value: string }>
>();

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

// Define a minimal type that the component actually requires
export interface MuxPlayerVideoLike {
  id: string;
  playbackId: string;
  title: string;
  thumbnail?: string;
  chaptersUrl?: string;
  playbackSpeed?: number;
}

/**
 * Interface for MuxPlayer component props
 */
interface MuxPlayerComponentProps {
  /** The video object containing metadata and playback information */
  video: MuxPlayerVideoLike;
  /** Whether to autoplay the video when it loads */
  autoPlay?: boolean;
  /** Callback for time update events */
  onTimeUpdate?: (e: Event) => void;
  /** Current time in seconds to set the playback position */
  currentTime?: number;
  /** Start time in seconds to begin playback from */
  startTime?: number;
  /** Additional CSS classes to apply to the player */
  className?: string;
  /** Whether the player is out of view and should be shown as a floating player */
  isOutOfView?: boolean;
  /** Callback for when the video ends */
  onEnded?: (e: Event) => void;
}

/**
 * MuxPlayer component for video playback using Mux's player
 */
const MuxPlayerComponentBase = forwardRef(function MuxPlayerComponent(
  {
    video,
    autoPlay,
    onTimeUpdate,
    currentTime,
    startTime,
    className = "",
    onEnded,
  }: MuxPlayerComponentProps,
  ref
) {
  const bold = useBold();
  const playerRef = useRef<MuxPlayerRefElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Array<{
    startTime: number;
    value: string;
  }> | null>(null);
  const chaptersLoadedRef = useRef(false);

  // Get the primary color from CSS variables
  useEffect(() => {
    // Get the primary color from CSS variable if document is available (client-side)
    if (typeof window !== "undefined") {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading CSS variable on mount
      setPrimaryColor(color);
    }
  }, []);

  // Fetch and parse chapters
  useEffect(() => {
    if (!video.chaptersUrl) return;

    // Check the cache first
    if (chaptersCache.has(video.chaptersUrl)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading from cache
      setChapters(chaptersCache.get(video.chaptersUrl) || null);
      return;
    }

    const fetchChapters = async () => {
      try {
        const chaptersUrl = video.chaptersUrl;
        // Video.chaptersUrl is guaranteed to be defined here because of the check above
        if (!chaptersUrl) return;

        const response = await fetch(chaptersUrl);
        const chaptersText = await response.text();

        if (!chaptersText.includes("WEBVTT")) {
          return;
        }

        // Parse the WEBVTT file for chapters
        const lines = chaptersText.split("\n\n").slice(1); // Skip the WEBVTT header
        if (lines.length === 0) {
          return;
        }

        const parsedChapters = lines
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

        if (parsedChapters.length === 0) {
          return;
        }

        // Store in cache
        if (video.chaptersUrl) {
          chaptersCache.set(video.chaptersUrl, parsedChapters);
        }

        // Set state
        setChapters(parsedChapters);
      } catch (error) {
        console.error("Error loading chapters:", error);
      }
    };

    fetchChapters();
  }, [video.chaptersUrl]);

  // Apply chapters to player whenever chapters or player ref changes
  useEffect(() => {
    if (!chapters || !playerRef.current || chaptersLoadedRef.current) return;

    const addChaptersToPlayer = () => {
      const player = playerRef.current;
      if (player && typeof player.addChapters === "function" && chapters) {
        player.addChapters(chapters);
        chaptersLoadedRef.current = true;
      } else {
        // Player doesn't support chapter addition
      }
    };

    const player = playerRef.current;
    if (player && player.readyState >= 1) {
      addChaptersToPlayer();
    } else if (player) {
      const handleReady = () => {
        addChaptersToPlayer();
      };

      player.addEventListener("loadedmetadata", handleReady, { once: true });
      player.addEventListener("canplay", handleReady, { once: true });

      // Safety timeout
      setTimeout(handleReady, 2000);
    }
  }, [chapters]);

  // Reset chapters loaded flag when video changes
  useEffect(() => {
    chaptersLoadedRef.current = false;
  }, [video.id]);

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

  const handleEnded = (e: Event) => {
    bold.trackEvent(video, e);
    if (onEnded) onEnded(e);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"

      >
        <MuxPlayer
          ref={(el) => {
            // Store the reference
            playerRef.current = el;

            // Handle forwarded ref
            if (typeof ref === "function") {
              ref(el);
            } else if (ref) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- forwardRef callback requires runtime type assignment
              (ref as React.MutableRefObject<any>).current = el;
            }

            // If we already have chapters parsed, try to add them immediately
            if (el && chapters && !chaptersLoadedRef.current) {
              setTimeout(() => {
                if (el && typeof el.addChapters === "function" && chapters) {
                  el.addChapters(chapters);
                  chaptersLoadedRef.current = true;
                }
              }, 100);
            }
          }}
          playbackId={video.playbackId}
          metadata={{
            video_id: video.id,
            video_title: video.title,
          }}
          streamType="on-demand"
          title={video.title}
          poster={video.thumbnail}
          autoPlay={autoPlay}
          thumbnailTime={startTime || 0}
          className={`w-full h-full relative z-10 ${className}`}
          onTimeUpdate={handleTimeUpdate}
          onPlay={(e) => bold.trackEvent(video, e)}
          onPause={(e) => bold.trackEvent(video, e)}
          onEnded={handleEnded}
          onLoadedMetadata={(e) => {
            bold.trackEvent(video, e);
            console.log("MuxPlayer loadedmetadata event");

            // One more attempt to add chapters on metadata loaded
            if (!chaptersLoadedRef.current && playerRef.current && chapters) {
              const player = playerRef.current;
              if (typeof player.addChapters === "function") {
                console.log("Adding chapters on metadata loaded");
                player.addChapters(chapters);
                chaptersLoadedRef.current = true;
              }
            }
          }}
          playsInline
          currentTime={startTime || currentTime}
          playbackRate={video.playbackSpeed || 1}
          storyboardSrc={
            video.playbackId
              ? `https://image.mux.com/${video.playbackId}/storyboard.vtt`
              : undefined
          }
          defaultHiddenCaptions={false}
          accentColor={primaryColor || undefined}
        />


      </div>
    </>
  );
});

// Optimize with memo to prevent unnecessary re-renders
export const MuxPlayerComponent = memo(MuxPlayerComponentBase, (prevProps, nextProps) => {
  // Only re-render if essential video properties change
  return (
    prevProps.video.playbackId === nextProps.video.playbackId &&
    prevProps.video.id === nextProps.video.id &&
    prevProps.startTime === nextProps.startTime &&
    prevProps.autoPlay === nextProps.autoPlay &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.onEnded === nextProps.onEnded
  );
});
