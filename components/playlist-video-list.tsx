import Image from "next/image";
import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";
import { cn } from "@/lib/utils";

/**
 * Extract video ID from potential "videos/xxx" format
 * Video IDs from playlist API may come prefixed with "videos/"
 */
function extractVideoId(videoIdOrPath: string): string {
  return videoIdOrPath.replace(/^videos\//, '');
}

interface PlaylistVideoListProps {
  videos: Video[];
  playlistId: string;
  className?: string;
}

export function PlaylistVideoList({
  videos,
  playlistId,
  className,
}: PlaylistVideoListProps) {
  if (videos.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-lg text-muted-foreground">
          No videos in this playlist
        </p>
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {videos.map((video) => {
        const videoId = extractVideoId(video.id);
        return (
          <li key={video.id}>
            <Link
              href={`/pl/${playlistId}/v/${videoId}`}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-accent transition-colors rounded-lg group"
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-full sm:w-40 md:w-48 aspect-video bg-muted rounded-lg overflow-hidden">
              <Image
                src={video.thumbnail}
                alt={video.title}
                fill
                className="object-cover group-hover:ring-1 ring-primary transition-all"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 160px, 192px"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-start">
              <h3 className="text-base sm:text-lg font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                {video.title}
              </h3>
              {video.teaser && (
                <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">
                  {video.teaser}
                </p>
              )}
            </div>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
