"use client";
import Image from "next/image";
import clsx from "clsx";
import { formatRelative } from "date-fns";
import { Player } from "@/components/players";
import { Transcript } from "@/components/transcript";
import { useRef, useState, useEffect } from "react";
import type { Video } from "@boldvideo/bold-js";

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

/**
 * Video detail page component showing a video player and metadata
 */
export function VideoDetail({
  video,
  startTime,
}: VideoDetailProps): React.JSX.Element {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);

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
    <div className="container mx-auto flex flex-col pb-60 gap-y-8">
      <div
        className={clsx(
          "w-full lg:max-h-[75vh]",
          hasChapters && "lg:grid lg:grid-cols-12 lg:space-y-0",
          "overflow-hidden"
        )}
      >
        <div className="w-full bg-black flex-grow aspect-video col-span-9">
          <Player
            video={video}
            autoPlay={true}
            ref={playerRef}
            startTime={startTime}
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
      <div className="px-5 md:px-10">
        <h1 className="text-3xl md:text-[42px] font-extrabold mb-4 leading-tight">
          {video.title}
        </h1>
        <p className="text-muted-foreground text-xl mb-4">
          {formatRelative(new Date(video.published_at), new Date())}
        </p>
        <p className="text-[21px] mb-12 prose prose-lg max-w-2xl">
          {video.description}
        </p>

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
    </div>
  );
}
