"use client";

import Image from "next/image";
import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { formatDuration } from "util/format-duration";
import { cn } from "@/lib/utils";
import { useProgress } from "./providers/progress-provider";
import { ProgressBar } from "./progress-bar";
import { CompletionIndicator } from "./completion-indicator";

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
        // Get progress for this video
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
              href={`/pl/${playlistId}/v/${video.id}`}
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

                {/* Progress bar overlay */}
                {progress && <ProgressBar percentWatched={progress.percentWatched} completed={progress.completed} />}

                {/* Duration badge or completion indicator */}
                {progress?.completed ? (
                  <CompletionIndicator completed={true} />
                ) : (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
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
