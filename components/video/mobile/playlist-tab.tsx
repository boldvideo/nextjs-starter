"use client";

import { Playlist } from "@boldvideo/bold-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThumbnailImage } from "@/components/video-thumbnail/thumbnail-image";
import { format } from "date-fns";
import { formatDuration } from "@/util/format-duration";

interface PlaylistTabProps {
  playlist: Playlist;
  currentVideoId: string;
}

export default function PlaylistTab({
  playlist,
  currentVideoId,
}: PlaylistTabProps) {
  return (
    <div className="divide-y divide-border pb-20">
      {/* Playlist Header */}
      <div className="p-4 bg-muted/50">
        <Link
          href={`/pl/${playlist.id}`}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          {playlist.title}
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          {playlist.videos.length} videos
        </p>
      </div>

      {/* Video List */}
      <ul>
        {playlist.videos.map((video, index) => {
          const isCurrent = video.id === currentVideoId;

          return (
            <li key={video.id}>
              <Link
                href={`/pl/${playlist.id}/v/${video.id}`}
                className={cn(
                  "flex gap-3 p-3 transition-colors",
                  isCurrent
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-accent"
                )}
              >
                {/* Thumbnail */}
                <div className="relative w-32 aspect-video flex-shrink-0 rounded overflow-hidden bg-muted">
                  <ThumbnailImage
                    video={video}
                    sizes="128px"
                    showCompletionIndicator={false}
                    className="object-cover w-full h-full"
                  />

                  {/* Duration Badge */}
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration)}
                  </span>
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          "text-sm font-medium line-clamp-2",
                          isCurrent && "text-primary"
                        )}
                      >
                        {video.title}
                      </h4>
                      {video.published_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(video.published_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
