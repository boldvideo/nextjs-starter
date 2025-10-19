"use client";

import { VideoThumbnail } from "./video-thumbnail";
import { useProgress } from "../providers/progress-provider";

interface VideoThumbnailWithProgressProps {
  video: any;
  prefetch?: boolean;
  playlistId?: string;
  progress?: {
    percentWatched: number;
    completed: boolean;
  } | null;
}

/**
 * Smart VideoThumbnail component that automatically uses progress when ProgressProvider is available.
 * This is the recommended component to use - it "just works" everywhere.
 */
export function VideoThumbnailWithProgress({
  video,
  prefetch = false,
  playlistId,
  progress: explicitProgress,
}: VideoThumbnailWithProgressProps) {
  // Always call the hook, but handle the case where it might not be available
  const { progressMap } = useProgress();

  // Get progress from context
  const progressRecord = progressMap.get(video.id);
  const contextProgress = progressRecord
    ? {
        percentWatched: progressRecord.percentWatched,
        completed: progressRecord.completed,
      }
    : null;

  // Use explicit progress if provided, otherwise auto-detected progress
  const finalProgress = explicitProgress !== undefined ? explicitProgress : contextProgress;

  return (
    <VideoThumbnail
      video={video}
      prefetch={prefetch}
      playlistId={playlistId}
      progress={finalProgress}
    />
  );
}
