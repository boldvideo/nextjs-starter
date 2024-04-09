"use client";
import Image from "next/image";
import { formatRelative } from "date-fns";
import { Player } from "components/player";
import { Transcript } from "@/components/transcript";
import { useRef, useState, useEffect } from "react";

type VideoDetailProps = {
  video: any;
};

type Chapter = {
  startTime: string;
  title: string;
};

const parseChapters = (webvttString: string): Chapter[] => {
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

export function VideoDetail({ video }: VideoDetailProps) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const [parsedChapters, setParsedChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    const chaptersList = video.chapters ? parseChapters(video.chapters) : [];
    setParsedChapters(chaptersList);
  }, [video]);

  const handleCueClick = (time: number) => {
    const toTime = isNaN(time) ? 0.1 : parseFloat(time.toString());
    console.log("playerRef", playerRef?.current);
    if (playerRef?.current) {
      playerRef.current.currentTime = toTime;
      playerRef.current.play();
    }
  };

  return (
    <div className="flex flex-col pb-60">
      <div className="z-40 relative -mx-5 md:-mx-10 -mt-5 md:-mt-10 mb-5 md:mb-10 flex justify-center bg-black w-screen aspect-video max-h-[calc(100vh-240px)]">
        <Player video={video} autoPlay={true} ref={playerRef} />
      </div>
      <div className="md:max-w-4xl w-full mx-auto px-5 md:px-10">
        <h1 className="text-3xl md:text-[42px] font-extrabold mb-4 leading-tight">
          {video.title}
        </h1>
        <p className="text-gray-600 text-xl mb-4">
          {formatRelative(new Date(video.published_at), new Date())}
        </p>
        <p className="text-[21px] mb-12">{video.description}</p>

        {video.chapters && (
          <div className="mb-12 text-[21px]">
            {parsedChapters.map((chapter, index) => (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() =>
                  handleCueClick(timestampToSeconds(chapter.startTime))
                }
              >
                <strong className="font-bold text-blue-800">
                  {chapter.startTime}
                </strong>{" "}
                {chapter.title}
              </div>
            ))}
          </div>
        )}
        {video.chapters && (
          <div className="w-full overflow-x-auto">
            <div className="flex mb-12 text-sm space-x-4">
              {parsedChapters.map((chapter, index) => (
                <div
                  key={index}
                  className="shrink-0 cursor-pointer w-40"
                  onClick={() =>
                    handleCueClick(timestampToSeconds(chapter.startTime))
                  }
                >
                  <Image
                    src={`https://image.mux.com/${video.playback_id}/thumbnail.png?width=400&height=200&fit_mode=smartcrop&time=${timestampToSeconds(chapter.startTime)}`}
                    alt={chapter.title}
                    width={160}
                    height={80}
                    className="rounded-sm overflow-hidden"
                  />
                  <div className="px-1 pt-2">
                    <span className="text-xs px-1 py-0.5 rounded-lg bg-yellow-200 text-yellow-800 ">
                      {chapter.startTime}
                    </span>
                    <h4 className="w-full font-bold mt-4">{chapter.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
