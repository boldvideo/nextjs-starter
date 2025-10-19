"use client";

import type { Playlist } from "@boldvideo/bold-js";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatDuration } from "util/format-duration";
import { formatRelative } from "date-fns";
import { calculateTotalDuration, getLastUpdatedDate } from "@/util/playlist-metadata";
import { cn } from "@/lib/utils";
import { useProgress } from "./providers/progress-provider";
import { useMemo } from "react";

interface PlaylistMetadataSidebarProps {
  playlist: Playlist;
  className?: string;
}

export function PlaylistMetadataSidebar({
  playlist,
  className,
}: PlaylistMetadataSidebarProps) {
  const totalDuration = calculateTotalDuration(playlist.videos);
  const lastUpdated = getLastUpdatedDate(playlist.videos);
  const firstVideo = playlist.videos[0];
  const { progressMap } = useProgress();

  // Find the last watched video (most recently watched, incomplete preferred)
  const continueVideo = useMemo(() => {
    if (!playlist.videos.length) return null;

    // Get all videos with progress
    const videosWithProgress = playlist.videos
      .map((video) => ({
        video,
        progress: progressMap.get(video.id),
      }))
      .filter((item) => item.progress)
      .sort((a, b) => {
        // Sort by lastWatched timestamp (most recent first)
        const timeA = new Date(a.progress!.lastWatched).getTime();
        const timeB = new Date(b.progress!.lastWatched).getTime();
        return timeB - timeA;
      });

    if (videosWithProgress.length === 0) return null;

    // Prefer the most recent incomplete video
    const incomplete = videosWithProgress.find((item) => !item.progress!.completed);
    if (incomplete) return incomplete.video;

    // Otherwise, return the most recently watched (even if completed)
    return videosWithProgress[0].video;
  }, [playlist.videos, progressMap]);

  return (
    <aside
      className={cn(
        "bg-sidebar rounded-lg border border-border overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
        <h3 className="font-semibold text-sidebar-foreground">Playlist Info</h3>
      </div>

      {/* Metadata List */}
      <div className="p-3 space-y-2">
        {/* Video Count */}
        <div className="flex items-start gap-2">
          <span className="text-sm text-muted-foreground">Videos:</span>
          <span className="text-sm font-medium">
            {playlist.videos.length}
          </span>
        </div>

        {/* Total Runtime */}
        {totalDuration > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground">Total runtime:</span>
            <span className="text-sm font-medium">
              {formatDuration(totalDuration)}
            </span>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground">Last updated:</span>
            <span className="text-sm font-medium">
              {formatRelative(lastUpdated, new Date())}
            </span>
          </div>
        )}

        {/* Start/Continue Watching CTA */}
        {firstVideo && (
          <div className="pt-2">
            <Link
              href={`/pl/${playlist.id}/v/${(continueVideo || firstVideo).id}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              {continueVideo ? "Continue Watching" : "Start Watching"}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
