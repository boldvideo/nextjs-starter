"use client";
import Image from "next/image";
import clsx from "clsx";
import { formatRelative } from "date-fns";
import { Player } from "@/components/players";
import { Transcript } from "@/components/transcript";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Video } from "@boldvideo/bold-js";
import { AIAssistant } from "@/components/ui/ai-assistant";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useSettings } from "./providers/settings-provider";

/**
 * Extended Video type with additional properties used in our application
 */
interface ExtendedVideo extends Video {
  chapters?: string;
  chapters_url?: string;
  transcript?: {
    json?: {
      url: string;
    };
  };
}

/**
 * Props for the VideoDetail component
 */
interface VideoDetailProps {
  video: ExtendedVideo;
  startTime?: number;
  className?: string;
}

/**
 * Chapter data structure
 */
interface Chapter {
  startTime: string;
  title: string;
}

/**
 * Parse WEBVTT chapters format into Chapter objects
 */
const parseChapters = (webvttString: string): Chapter[] => {
  if (!webvttString) return [];
  if (!webvttString.includes("WEBVTT")) return [];
  const lines = webvttString.split("\n\n").slice(1); // Skip the WEBVTT header and split chapters
  if (lines.length < 2) return [];

  return lines.map((line) => {
    const [_identifier, timeRange, title] = line.split("\n");
    const [startTime] = timeRange.split(" --> ");
    return {
      startTime: convertToReadableTime(startTime),
      title,
    };
  });
};

/**
 * Convert timestamp to readable format (MM:SS)
 */
const convertToReadableTime = (timeString: string): string => {
  const parts = timeString.split(":").map(parseFloat);
  let hours = 0,
    minutes = 0,
    seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else {
    [minutes, seconds] = parts;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const minutesPart = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutesPart}:${secondsPart}`;
};

/**
 * Convert timestamp string to seconds
 */
const timestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":").map(Number);
  let hours = 0,
    minutes = 0,
    seconds = 0;

  // Determine the format and assign the correct values
  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 1) {
    [seconds] = parts;
  }

  // Calculate total seconds
  return hours * 3600 + minutes * 60 + seconds;
};

interface FormattedDescriptionProps {
  text: string;
}

function FormattedDescription({ text }: FormattedDescriptionProps) {
  // Convert URLs to markdown links
  const withLinks = text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) => `[${url}](${url})`
  );

  // Convert Twitter handles to links
  const withTwitterHandles = withLinks.replace(
    /(?:^|\s)@(\w+)/g,
    (match, handle) => ` [@${handle}](https://twitter.com/${handle})`
  );

  // Convert Twitter-style mentions (/username) to links
  const withSlashHandles = withTwitterHandles.replace(
    /(?:^|\s)\/(\w+)/g,
    (match, handle) => ` [/${handle}](https://twitter.com/${handle})`
  );

  // Preserve newlines by converting them to <br/> tags
  const withLineBreaks = withSlashHandles.replace(/\n/g, "  \n");

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          />
        ),
      }}
    >
      {withLineBreaks}
    </ReactMarkdown>
  );
}

/**
 * Video detail page component showing a video player and metadata
 */
export function VideoDetail({
  video,
  startTime,
  className = "max-w-7xl",
}: VideoDetailProps): React.JSX.Element {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [isOutOfView, setIsOutOfView] = useState<boolean>(false);
  const prevScrollY = useRef(0);
  const settings = useSettings();

  // Handle scroll behavior for floating player
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > window.innerHeight * 0.7 && !isOutOfView) {
      // setIsOutOfView(true);
      // deactivated for now
      setIsOutOfView(false);
    }
    if (currentScrollY < window.innerHeight * 0.7 && isOutOfView) {
      setIsOutOfView(false);
    }

    prevScrollY.current = currentScrollY;
  }, [isOutOfView]);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Set initial time when component mounts
  useEffect(() => {
    if (startTime && playerRef.current) {
      playerRef.current.currentTime = startTime;
    }
  }, [startTime]);

  /**
   * Handle clicking on a cue to seek to that position
   */
  const handleCueClick = (time: number) => {
    const toTime = isNaN(time) ? 0.1 : parseFloat(time.toString());
    if (playerRef?.current) {
      playerRef.current.currentTime = toTime;
      playerRef.current.play();
    }
  };

  const chapters = parseChapters(video.chapters || "");
  const hasChapters = chapters && chapters.length > 0;

  // Check if transcript is available
  useEffect(() => {
    setHasTranscript(
      !!video.transcript &&
        !!video.transcript.json &&
        !!video.transcript.json.url
    );
  }, [video]);

  return (
    <div className="flex flex-col pb-60 gap-y-8">
      <div
        ref={playerContainerRef}
        className="bg-black w-full flex justify-center"
      >
        <div
          className={clsx(
            "w-full max-w-[1600px]",
            hasChapters && "lg:grid lg:grid-cols-12 lg:space-y-0",
            "overflow-hidden"
          )}
        >
          <div className="aspect-video lg:max-h-[50vh] 2xl:max-h-[50vh] lg:aspect-auto w-full lg:h-full bg-black flex-grow col-span-9">
            <Player
              video={video}
              autoPlay={true}
              ref={playerRef}
              startTime={startTime}
              className={className}
              isOutOfView={isOutOfView}
            />
          </div>
          {hasChapters && (
            <div className="relative bg-sidebar flex flex-col col-span-3 overflow-y-auto">
              <div className="lg:absolute top-0 left-0 w-full h-full flex flex-col">
                <h3 className="p-3 font-bold text-lg ">Chapters</h3>
                <ol>
                  {chapters.map((chapter, idx) => (
                    <li
                      key={chapter.startTime}
                      onClick={() =>
                        handleCueClick(timestampToSeconds(chapter.startTime))
                      }
                    >
                      <div className="group cursor-pointer flex space-x-3 p-3 font-semibold hover:bg-primary hover:text-primary-foreground">
                        <div className="flex items-start">
                          <div className="w-6 leading-5 pt-px text-xs font-normal tracking-tight">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="relative w-20 h-12 aspect-video flex-shrink-0 overflow-hidden border border-ring group-hover:border-primary">
                          <Image
                            src={`https://image.mux.com/${
                              video.playback_id
                            }/thumbnail.png?width=400&height=200&fit_mode=smartcrop&time=${timestampToSeconds(
                              chapter.startTime
                            )}`}
                            alt={chapter.title}
                            fill={true}
                            style={{ objectFit: "cover" }}
                            className=""
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="w-full leading-tight">
                            {chapter.title}
                          </div>
                          <div>
                            <span className="text-muted-foreground group-hover:text-primary-foreground text-xs">
                              {chapter.startTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Add padding for content when player is floating on mobile */}
      <div
        className={clsx(
          "container mx-auto px-5 md:px-10",
          isOutOfView && "sm:pt-0 pt-[56.25vw]"
        )}
      >
        <h1 className="text-3xl md:text-[42px] font-extrabold mb-4 leading-tight">
          {video.title}
        </h1>
        <p className="text-muted-foreground text-xl mb-4">
          {formatRelative(new Date(video.published_at), new Date())}
        </p>
        <div className="text-[21px] mb-12 prose prose-lg max-w-2xl">
          <FormattedDescription text={video.description || ""} />
        </div>

        {/* This section is currently disabled (false &&) but kept for reference */}
        {false && video.chapters && (
          <div className="mb-12 text-[21px]">
            {chapters.map((chapter, index) => (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() =>
                  handleCueClick(timestampToSeconds(chapter.startTime))
                }
              >
                <strong className="font-bold text-primary-foreground">
                  {chapter.startTime}
                </strong>{" "}
                {chapter.title}
              </div>
            ))}
          </div>
        )}

        {hasTranscript && video.transcript?.json?.url ? (
          <div className="mb-12">
            <Transcript
              url={video.transcript.json.url}
              onCueClick={handleCueClick}
              playerRef={playerRef}
            />
          </div>
        ) : video.transcript ? (
          <div className="mb-12">
            <h2 className="font-bold text-2xl mb-6">Transcript</h2>
            <p className="text-muted-foreground">
              No transcript available for this video.
            </p>
          </div>
        ) : null}
      </div>

      {hasTranscript && (
        <AIAssistant
          videoId={video.id}
          name={settings.ai_name}
          avatar={settings.ai_avatar}
          subdomain={""}
          onTimeClick={handleCueClick}
        />
      )}
    </div>
  );
}
