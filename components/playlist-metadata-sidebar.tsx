import type { Playlist } from "@boldvideo/bold-js";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatDuration } from "util/format-duration";
import { formatRelative } from "date-fns";
import { calculateTotalDuration, getLastUpdatedDate } from "@/util/playlist-metadata";
import { cn } from "@/lib/utils";

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

        {/* Start Watching CTA */}
        {firstVideo && (
          <div className="pt-2">
            <Link
              href={`/pl/${playlist.id}/v/${firstVideo.id}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Watching
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
