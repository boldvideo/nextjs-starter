"use client";

import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";
import { cn } from "@/lib/utils";
import { ThumbnailImage } from "./video-thumbnail/thumbnail-image";
import { useProgress } from "./providers/progress-provider";
import { buildVideoUrl } from "@/lib/video-path";

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
  const { progressMap } = useProgress();

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
        // Get progress for this video (for duration badge logic)
        const progressRecord = progressMap.get(video.id);
        const progress = progressRecord
          ? {
              percentWatched: progressRecord.percentWatched,
              completed: progressRecord.completed,
            }
          : null;

        return (
          <li key={video.id}>
            <Link
              href={buildVideoUrl(video, { playlistId })}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors rounded-lg group"
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-full sm:w-40 md:w-48 aspect-video bg-muted rounded-lg overflow-hidden">
                <ThumbnailImage
                  video={video}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 160px, 192px"
                  className="object-cover group-hover:ring-1 ring-primary transition-all"
                />

                {/* Duration badge override - show when not completed */}
                {!progress?.completed && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded z-10">
                    {formatDuration(video.duration)}
                  </div>
                )}
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
