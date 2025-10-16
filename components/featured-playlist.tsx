import React from "react";
import Link from "next/link";
import { VideoThumbnail } from "@/components/video-thumbnail";

interface PlaylistProps {
  playlist: {
    id: string;
    title: string;
    videos: any[];
  };
}

export function FeaturedPlaylist({ playlist }: PlaylistProps) {
  const playlistId = `playlist-${playlist.id}`;

  return (
    <section aria-labelledby={playlistId}>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-bold text-3xl" id={playlistId}>
          <Link href={`/pl/${playlist.id}`} className="flex items-center">
            <span className="hover:text-primary">{playlist.title}</span>
            <span className="font-normal text-base text-foreground ml-3 px-3 py-1 hover:text-primary  hover:cursor-pointer border border-border rounded-full">
              {playlist.videos.length} Videos
            </span>
          </Link>
        </h2>
        <Link
          href={`/pl/${playlist.id}`}
          className="font-bold text-[18px] text-primary px-3 py-1 border-2 border-primary rounded-lg"
          aria-label={`View all videos in ${playlist.title}`}
        >
          View All
        </Link>
      </div>
      <ul className="mb-16 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
        {playlist.videos.slice(0, 8).map((video) => (
          <li key={video.id}>
            <VideoThumbnail video={video} playlistId={playlist.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
