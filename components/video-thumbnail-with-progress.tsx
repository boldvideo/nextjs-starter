"use client";

import { VideoThumbnail } from "./video-thumbnail";
import { useProgress } from "./providers/progress-provider";

interface VideoThumbnailWithProgressProps {
  video: any;
  prefetch?: boolean;
  playlistId?: string;
}

/**
 * Client-side wrapper for VideoThumbnail that fetches progress data
 * from the ProgressProvider context
 */
export function VideoThumbnailWithProgress({
  video,
  prefetch = false,
  playlistId,
}: VideoThumbnailWithProgressProps) {
  const { progressMap } = useProgress();

  // Look up progress for this video
  const progressRecord = progressMap.get(video.id);
  const progress = progressRecord
    ? {
        percentWatched: progressRecord.percentWatched,
        completed: progressRecord.completed,
      }
    : null;

  return (
    <VideoThumbnail
      video={video}
      prefetch={prefetch}
      playlistId={playlistId}
      progress={progress}
    />
  );
}
