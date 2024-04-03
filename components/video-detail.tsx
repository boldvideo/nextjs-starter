"use client";
import { formatRelative } from "date-fns";
import { Player } from "components/player";
import { Transcript } from "@/components/transcript";
import { useRef } from "react";

type VideoDetailProps = {
  video: any;
};

export function VideoDetail({ video }: VideoDetailProps) {
  const playerRef = useRef<HTMLVideoElement>(null);

  const handleCueClick = (time: number) => {
    const toTime = isNaN(time) ? 0.1 : parseFloat(time.toString());
    if (playerRef?.current) {
      playerRef.current.currentTime = toTime;
      playerRef.current.play();
    }
  };

  return (
    <div className="flex flex-col">
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

      </div>
    </div>
  );
}
